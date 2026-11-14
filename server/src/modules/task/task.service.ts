import type {
  TaskDetails,
  TaskDocument,
  TaskOptions,
  TaskIds,
  TaskInput,
  TaskStatusInput,
  TaskReassignInput,
} from "./task.types.js";
import * as repository from "./task.repository.js";
import type { ServiceActor, UploadedFile } from "../../types/service.types.js";
import mongoose from "mongoose";
import {
  canGiveTasks,
  canManageTask,
  canDeleteTask,
  whoGaveTheTask,
  canSeeTask,
  findTaskICanSee,
  findTaskICanRead,
} from "../../utils/taskAccess.util.js";
import type { LoggedInEmployee } from "../../utils/taskAccess.util.js";
import { can, readRolePermissions } from "../../utils/currentUser.util.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { isInMyTeam, getMyTeamMemberIds } from "../../utils/team.util.js";
import { notifyTaskAssigned, notifyTaskProgress, notifyTaskChanged } from "../../utils/notification.util.js";
import { deleteTaskFile } from "../../middlewares/upload.middleware.js";
import { readTaskTime } from "../../utils/taskTime.util.js";
import { todayStart } from "../../utils/date.util.js";

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// The date inputs of the form send text like "2026-07-30".
// An empty text means "no date", so we save null.
function toDate(text: string | undefined) {
  if (!text) {
    return null;
  }
  const date = new Date(text);
  // new Date("hello") gives an invalid date, we do not want to save that.
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

// The tags input sends one text like "urgent, client".
// We cut it on every comma and throw away the empty pieces.
function toTags(text: string | undefined) {
  if (!text) {
    return [];
  }
  return text
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

// getLoggedInEmployee lives in utils/taskAccess.util.ts, because the
// comments of a task need exactly the same answer.
// Does the role of THAT employee let them give work to other people?
//
// It is the question we ask about the person who is going to receive the
// task, not about the person who gives it. The head of a department is
// simply somebody whose role carries "tasks.assign": only the organization
// hands work to such a person inside its own department, and an inter-
// department task always goes to one of them.
//
// The employee must be read with .populate("role", "name permissions status"),
// so the permissions of the role are really there.
function isTaskGiver(employee: {
  role: unknown;
}) {
  const permissions = readRolePermissions(employee.role);
  return permissions.includes(PERMISSIONS.TASKS_ASSIGN);
}

// Find the employee who will receive the task and check that the
// logged in user is really allowed to give a task to that person.
//
// The rules are:
// - an organization can give a task to any of its active employees,
//   a manager included,
// - a team lead can give a task to the members of the teams they lead,
//   and to nobody else,
// - a manager can give a task to an active employee of its own
//   department (but not to another manager of its own department),
// - a manager can also give a task to ANOTHER department. That is an
//   inter-department task, and the receiver is always that other
//   department's manager, who then owns the task for their team.
// - nobody can give a task to themselves.
async function findEmployeeToAssign(
  organizationId: string,
  assignedToId: string,
  me: LoggedInEmployee | null,
) {
  const employee = await repository.findEmployee(assignedToId, organizationId);
  if (!employee) {
    return { employee: null, message: "Please choose an employee of your organization" };
  }
  if (employee.status === "inactive") {
    return { employee: null, message: "This employee is inactive" };
  }
  // The organization can choose anybody, so there is nothing more to check.
  if (!me) {
    return { employee: employee, message: "" };
  }
  if (String(employee._id) === String(me.employee._id)) {
    return { employee: null, message: "You cannot give a task to yourself" };
  }
  // A team lead can always give the work to their own people. This is
  // checked first, so a person who is BOTH a manager and a team lead keeps
  // the two rights at the same time.
  if (me.isTeamLead) {
    const isMyMember = await isInMyTeam(organizationId, String(me.employee._id), String(employee._id));
    if (isMyMember) {
      return { employee: employee, message: "" };
    }
  }
  // Somebody who only leads a team stops here: their team is all they have.
  if (!can(me, PERMISSIONS.TASKS_ASSIGN)) {
    return {
      employee: null,
      message: "You can give a task only to a member of your team",
    };
  }
  const targetIsTaskGiver = isTaskGiver(employee);
  const sameDepartment = String(employee.department) === String(me.employee.department);
  if (sameDepartment) {
    // Inside my own department I can give a task to a normal employee, but
    // not to somebody who gives tasks too (only the organization can do that).
    if (targetIsTaskGiver) {
      return {
        employee: null,
        message: "Only the organization can give a task to a manager of your department",
      };
    }
    return { employee: employee, message: "" };
  }
  // A different department: this is an inter-department task. I may hand
  // it only to that department's manager, who then owns it for their team.
  if (!targetIsTaskGiver) {
    return {
      employee: null,
      message: "To assign to another department, choose that department's manager",
    };
  }
  return { employee: employee, message: "" };
}

// The first line of a timeline says who received the task at the very
// beginning. Tasks that were saved before the timeline existed do not have
// that line, so we build it back from three fields the task always had:
// who has it, who gave it, and the day it was created.
//
// This one is for reading: it only adds the line to the answer we send,
// it does not touch the database.
function addFirstAssignmentLine(task: TaskDetails) {
  const history = task.assignmentHistory || [];
  if (history.length > 0) {
    return task;
  }
  return {
    ...task,
    assignmentHistory: [
      {
        // The React list needs a key, and this line has no _id of its own
        // because it was never saved.
        _id: String(task._id) + "-first",
        employee: task.assignedTo,
        byEmployee: task.assignedByEmployee,
        byType: task.assignedByType,
        reason: "",
        at: task.createdAt,
      },
    ],
  };
}

// The same missing line, but for writing.
//
// It must run BEFORE we change assignedTo, and before we push anything.
// Without it the timeline of an old task would start at the reassignment,
// and the employee who had the task first would be lost for good.
function keepFirstAssignmentLine(task: TaskDocument) {
  if (task.assignmentHistory.length > 0) {
    return;
  }
  task.assignmentHistory.push({
    employee: task.assignedTo,
    byEmployee: task.assignedByEmployee,
    byType: task.assignedByType,
    reason: "",
    at: task.createdAt,
  });
}

// Every task in a list gets a few extra true/false fields, so the React
// side knows which buttons it can show for that row.
// How long the task has been worked on, added to the answer so that no
// screen has to add up the work stretches for itself.
//
// Only the finished stretches are counted. The one still running is handed
// over as the moment it began, and the browser keeps counting it on screen.
function addTimeSpent(task: TaskDetails) {
  const time = readTaskTime(task.workSessions || [], todayStart());
  return {
    ...task,
    settledMinutesToday: time.settledMinutesToday,
    settledMinutesTotal: time.settledMinutesTotal,
    runningSince: time.runningSince,
  };
}

function addPermissionFlags(task: TaskDetails, me: LoggedInEmployee | null, myEmployeeId: string | null) {
  // The organization can change every task of its own organization. An
  // employee can change the tasks it created itself, and only while its role
  // still lets it edit tasks. canManageTask answers exactly that question,
  // and the edit route asks the very same one before it saves anything.
  const canEdit = canManageTask(task, me);
  // The person who received the task can move it to another status.
  const isMyTask = myEmployeeId !== null &&
    String(task.assignedTo?._id || task.assignedTo) === myEmployeeId;
  // Giving the task to somebody else needs the same right as editing it,
  // but a task that is already finished or cancelled has nothing left to
  // hand over, so the button disappears there.
  const isClosed = task.status === "completed" || task.status === "cancelled";
  return {
    ...task,
    canEdit: canEdit,
    canUpdateStatus: canEdit || isMyTask,
    canReassign: canEdit && !isClosed,
    // May this person add to the task: write a comment, hang a file on it?
    //
    // That asks the plain "am I part of this task?" question, which is the
    // same one every write route of this module asks before it saves
    // anything. It is its own flag because there is now one screen where
    // somebody may READ a task without being part of it: an approver opening
    // one of the tasks shown on a leave request. They see everything and add
    // nothing, and this flag is what tells the dialog to hide the two boxes
    // that would only give them an error.
    canComment: canSeeTask(task, me),
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// GET /api/tasks/assignable-employees
// The "assign to" dropdown of the task form is filled from here, so the
// list already follows the rules above and the user cannot even see
// somebody they are not allowed to choose.
export async function getAssignableEmployees(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  // An employee who is neither a manager nor a team lead cannot give
  // tasks to anybody.
  if (!canGiveTasks(me)) {
    return {
      status: "forbidden",
      message: "Only the organization, a manager and a team lead can assign tasks",
    };
  }
  // lean() gives plain objects, so we can add the extra "isOtherDepartment"
  // flag to the manager list further down.
  const employees = await repository.findEmployees(organizationId);
  if (!me) {
    // The organization sees every active employee.
    return {
      status: "success",
      data: employees,
    };
  }
  const myDepartmentId = String(me.employee.department);
  // The people of the teams I lead. For somebody who leads no team this
  // is simply an empty list and nothing below changes.
  const myTeamMemberIds = me.isTeamLead
    ? await getMyTeamMemberIds(organizationId, String(me.employee._id))
    : [];
  // A manager can give a task to two kinds of people:
  // - the other members of its OWN department (but not another manager), and
  // - the manager of ANOTHER department, for an inter-department task.
  // A team lead adds a third kind: the members of its own teams.
  // We tag each person with "isMyTeamMember" and "isOtherDepartment" so the
  // form can show the groups clearly.
  const assignable = [];
  for (const employee of employees) {
    // Never yourself.
    if (String(employee._id) === String(me.employee._id)) {
      continue;
    }
    // My own team members come first, and they are always allowed.
    if (myTeamMemberIds.includes(String(employee._id))) {
      assignable.push({
        ...employee,
        isMyTeamMember: true,
        isOtherDepartment: false,
      });
      continue;
    }
    // Somebody who only leads a team has nobody else to choose from.
    if (!can(me, PERMISSIONS.TASKS_ASSIGN)) {
      continue;
    }
    // After populate the department field is the full department document.
    const departmentId = String(employee.department?._id);
    const targetIsTaskGiver = isTaskGiver(employee);
    const sameDepartment = departmentId === myDepartmentId;
    if (sameDepartment) {
      // My own department, but not another person who gives tasks in it.
      if (!targetIsTaskGiver) {
        assignable.push({ ...employee, isOtherDepartment: false });
      }
    }
    else {
      // Another department: only its manager can receive the task.
      if (targetIsTaskGiver) {
        assignable.push({ ...employee, isOtherDepartment: true });
      }
    }
  }
  return {
    status: "success",
    data: assignable,
  };
}

// GET /api/tasks?view=assigned|created
// Who sees what:
// - the organization, and an employee whose role carries "tasks.view_all",
//   see every task of the organization,
// - somebody who gives tasks sees the tasks they created (view=created) or
//   the tasks they received themselves (view=assigned),
// - a normal employee always sees only the tasks it received.
export async function getAllTasks(actor: ServiceActor, options: TaskOptions) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const filter: Record<string, unknown> = { organization: organizationId };
  // "view=created" still narrows the list down for somebody who may read
  // everything, because that is the "the tasks I gave" page asking.
  if (me && can(me, PERMISSIONS.TASKS_VIEW_ALL)) {
    if (options.view === "created") {
      filter.assignedByEmployee = me.employee._id;
    }
  }
  else if (me) {
    // A manager and a team lead both have two lists: the tasks they gave
    // (view=created) and the tasks they received themselves.
    if (canGiveTasks(me) && options.view === "created") {
      filter.assignedByEmployee = me.employee._id;
    }
    else {
      filter.assignedTo = me.employee._id;
    }
  }
  // lean() gives plain objects instead of mongoose documents, so we can
  // add the two extra fields to every task before sending them.
  const tasks = await repository.findTasks(filter);
  const myEmployeeId = me ? String(me.employee._id) : null;
  // How many comments each task has, so the card and the row can show the
  // little "3" next to the speech bubble.
  //
  // We ask that in ONE question for the whole organization instead of one
  // question per task: aggregate groups the comments by task and counts
  // each group.
  const commentCounts = await repository.readCommentCounts(organizationId);
  function countCommentsOf(taskId: string) {
    const line = commentCounts.find((item) => String(item._id) === taskId);
    return line ? line.count : 0;
  }
  const tasksWithFlags = tasks.map((task) => ({
    ...addPermissionFlags(addTimeSpent(addFirstAssignmentLine(task)), me, myEmployeeId),
    commentCount: countCommentsOf(String(task._id)),
  }));
  return {
    status: "success",
    data: tasksWithFlags,
  };
}

// GET /api/tasks/:id
// One single task, with the very same shape and the very same true/false
// flags as one row of the list above, so the detail dialog cannot tell where
// its task came from.
//
// It exists for the screens that know an id but do not hold the list: the
// leave approval screen shows the tasks that would stall if a leave is
// approved, and pressing one of them opens it from here.
//
// findTaskICanRead is the READING door: it lets the people who are part of
// the task in, and also the approver of that employee's leave. Nobody gains
// the right to change anything, because every write route below still asks
// findTaskICanSee.
export async function getOneTask(actor: ServiceActor, ids: TaskIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const found = await findTaskICanRead(organizationId, String(ids.id), me);
  if (!found.task) {
    let outcome = "invalid";
    if (found.status === 403) {
      outcome = "forbidden";
    }
    if (found.status === 404) {
      outcome = "not_found";
    }
    return {
      status: outcome,
      message: found.message,
    };
  }
  // The same populate as the list, so the dialog finds every name it draws.
  const task = await repository.findTask(found.task);
  // It may have been deleted after the access check. Do not read fields from null.
  if (!task) {
    throw new Error("Task was deleted while it was being read");
  }
  const myEmployeeId = me ? String(me.employee._id) : null;
  const commentCount = await repository.countComments(found.task);
  return {
    status: "success",
    data: {
      ...addPermissionFlags(addTimeSpent(addFirstAssignmentLine(task)), me, myEmployeeId),
      commentCount: commentCount,
    },
  };
}

// POST /api/tasks
// The organization or a manager creates a task.
export async function createTask(actor: ServiceActor, input: TaskInput) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!canGiveTasks(me)) {
    return {
      status: "forbidden",
      message: "Only the organization, a manager and a team lead can create a task",
    };
  }
  const result = await findEmployeeToAssign(organizationId, input.assignedTo, me);
  if (!result.employee) {
    return {
      status: "invalid",
      message: result.message,
    };
  }
  const status = input.status;
  const task = await repository.insertTask(input, organizationId, result.employee, me, status, toDate(input.startDate), toDate(input.dueDate), toTags(input.tags));
  // The task is safely saved, so now we can ring the bell of the person who
  // received it. This is the moment the notification is born.
  await notifyTaskAssigned({
    organizationId: organizationId,
    taskTitle: task.title,
    employeeId: String(result.employee._id),
    employeeName: result.employee.name,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
    isReassignment: false,
  });
  return {
    status: "success",
    message: "Task created successfully",
    data: task,
  };
}

// PUT /api/tasks/:id
// The organization can edit every task; an employee only the tasks it
// created, and only while its role still carries "tasks.edit".
export async function updateTask(actor: ServiceActor, input: TaskInput, ids: TaskIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const task = await repository.findTaskDocument(ids, organizationId);
  if (!task) {
    return {
      status: "not_found",
      message: "Task not found",
    };
  }
  if (!canManageTask(task, me)) {
    return {
      status: "forbidden",
      message: "You can edit only the tasks you created",
    };
  }
  const result = await findEmployeeToAssign(organizationId, input.assignedTo, me);
  if (!result.employee) {
    return {
      status: "invalid",
      message: result.message,
    };
  }
  const status = input.status;
  // The edit form can also change the employee. When that happens we write
  // a line in the timeline too, otherwise the timeline would say the task
  // never moved while it really did.
  const employeeChanged = String(task.assignedTo) !== String(result.employee._id);
  if (employeeChanged) {
    // First put back the line of the employee who has the task right now,
    // then write the line of the new one.
    keepFirstAssignmentLine(task);
    task.assignmentHistory.push({
      employee: result.employee._id,
      byEmployee: me ? me.employee._id : null,
      byType: me ? "manager" : "organization",
      reason: "Changed from the edit form",
      at: new Date(),
    });
  }
  task.title = input.title;
  task.description = input.description || "";
  task.department = result.employee.department;
  task.assignedTo = result.employee._id;
  task.priority = input.priority;
  task.startDate = toDate(input.startDate);
  task.dueDate = toDate(input.dueDate);
  task.estimatedHours = input.estimatedHours || 0;
  task.tags = toTags(input.tags);
  task.remarks = input.remarks || "";
  // Where the task stood before this form was sent, so we can tell
  // afterwards whether the status really moved.
  const statusBefore = task.status;
  // We keep completedAt in the same line as the status:
  // it gets a date the first time the task becomes completed,
  // and it goes back to null if the task is opened again.
  if (status === "completed" && task.status !== "completed") {
    task.completedAt = new Date();
  }
  if (status !== "completed") {
    task.completedAt = null;
  }
  task.status = status;
  await repository.saveTask(task);
  // The edit form can hand the task to another person. When that happened,
  // that person has to hear about it exactly like on a reassignment.
  if (employeeChanged) {
    await notifyTaskAssigned({
      organizationId: organizationId,
      taskTitle: task.title,
      employeeId: String(result.employee._id),
      employeeName: result.employee.name,
      byName: me ? me.employee.name : "",
      actorUserId: String(actor.user?.userId),
      isReassignment: true,
    });
  }
  // The person doing the work hears that it changed under their hands. Not
  // when the task also moved to somebody else: that person already got the
  // much better sentence "You were given the task ..." a few lines above.
  if (!employeeChanged) {
    await notifyTaskChanged({
      organizationId: organizationId,
      taskTitle: task.title,
      assigneeEmployeeId: String(task.assignedTo),
      wasDeleted: false,
      byName: me ? me.employee.name : "",
      actorUserId: String(actor.user?.userId),
    });
  }
  // The edit form can move the task on the board as well, and that is news
  // for whoever gave the task out. In practice they are usually the one
  // filling in this form, and notifyTaskProgress stays quiet in that case.
  if (statusBefore !== task.status) {
    await notifyTaskProgress({
      organizationId: organizationId,
      taskTitle: task.title,
      newStatus: task.status,
      assignerEmployeeId: whoGaveTheTask(task),
      byName: me ? me.employee.name : "",
      actorUserId: String(actor.user?.userId),
    });
  }
  return {
    status: "success",
    message: "Task updated successfully",
    data: task,
  };
}

// PATCH /api/tasks/:id/status
// This is the small form the employee uses on its own task.
// The organization and the manager who created the task can also use it.
export async function updateTaskStatus(actor: ServiceActor, input: TaskStatusInput, ids: TaskIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const task = await repository.findTaskDocument(ids, organizationId);
  if (!task) {
    return {
      status: "not_found",
      message: "Task not found",
    };
  }
  if (me) {
    const isMyTask = String(task.assignedTo) === String(me.employee._id);
    const iCreatedThisTask = String(task.assignedByEmployee) === String(me.employee._id);
    if (!isMyTask && !iCreatedThisTask) {
      return {
        status: "forbidden",
        message: "This task is not yours",
      };
    }
  }
  const status = input.status;
  // Where the task was before this request. We read it now, because two
  // lines below task.status is already the new one, and the notification is
  // only worth sending when the card really moved.
  const statusBefore = task.status;
  if (status === "completed" && task.status !== "completed") {
    task.completedAt = new Date();
  }
  if (status !== "completed") {
    task.completedAt = null;
  }
  task.status = status;
  task.remarks = input.remarks || "";
  await repository.saveTask(task);
  // The person who gave this task out is waiting for the work, so they hear
  // that it moved. notifyTaskProgress says nothing when that person is the
  // one who just moved it themselves.
  if (statusBefore !== task.status) {
    await notifyTaskProgress({
      organizationId: organizationId,
      taskTitle: task.title,
      newStatus: task.status,
      assignerEmployeeId: whoGaveTheTask(task),
      byName: me ? me.employee.name : "",
      actorUserId: String(actor.user?.userId),
    });
  }
  return {
    status: "success",
    message: "Task status updated",
    data: task,
  };
}

// PATCH /api/tasks/:id/reassign
// Give the task to somebody else. This is not the same thing as editing
// the task: nothing about the work changes, only the person who has to do
// it, and the move is written in the timeline with its reason.
export async function reassignTask(actor: ServiceActor, input: TaskReassignInput, ids: TaskIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const task = await repository.findTaskDocument(ids, organizationId);
  if (!task) {
    return {
      status: "not_found",
      message: "Task not found",
    };
  }
  // Same rule as editing: the organization can move every task, an employee
  // can move only the tasks they created themselves.
  if (!canManageTask(task, me)) {
    return {
      status: "forbidden",
      message: "You can reassign only the tasks you created",
    };
  }
  if (task.status === "completed" || task.status === "cancelled") {
    return {
      status: "invalid",
      message: "A finished or cancelled task cannot be reassigned",
    };
  }
  const result = await findEmployeeToAssign(organizationId, input.assignedTo, me);
  if (!result.employee) {
    return {
      status: "invalid",
      message: result.message,
    };
  }
  if (String(task.assignedTo) === String(result.employee._id)) {
    return {
      status: "invalid",
      message: "This task is already assigned to that employee",
    };
  }
  // This has to happen while assignedTo is still the OLD employee, so the
  // first line of the timeline keeps the right person.
  keepFirstAssignmentLine(task);
  task.assignedTo = result.employee._id;
  // The department of a task always follows the employee who has it.
  task.department = result.employee.department;
  task.assignmentHistory.push({
    employee: result.employee._id,
    byEmployee: me ? me.employee._id : null,
    byType: me ? "manager" : "organization",
    reason: input.reason,
    at: new Date(),
  });
  // The remarks are the note of the person who had the task before, so
  // when the new person starts from zero we clear them together with the
  // status. Without the reset the work simply continues where it was.
  if (input.resetStatus) {
    task.status = "todo";
    task.completedAt = null;
    task.remarks = "";
  }
  await repository.saveTask(task);
  await notifyTaskAssigned({
    organizationId: organizationId,
    taskTitle: task.title,
    employeeId: String(result.employee._id),
    employeeName: result.employee.name,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
    isReassignment: true,
  });
  return {
    status: "success",
    message: "Task reassigned successfully",
    data: task,
  };
}

// POST /api/tasks/:id/attachments
// Add one or more documents to the task itself.
//
// This request does not carry JSON but a multipart form, because a file
// cannot travel inside JSON. uploadTaskFiles already saved the files on
// the disk before we arrive here, so our only job is to write the small
// card of every file inside the task.
//
// Everybody who can open the task can add a document: the manager puts
// the brief, and the employee puts the finished work.
export async function addTaskAttachments(actor: ServiceActor, ids: TaskIds, uploadedFiles: UploadedFile[]) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const files = uploadedFiles;
  const found = await findTaskICanSee(organizationId, String(ids.id), me);
  if (!found.task) {
    // The files are already on the disk and nobody will ever use them.
    files.forEach((file) => deleteTaskFile(file.filename));
    let outcome = "invalid";
    if (found.status === 403) {
      outcome = "forbidden";
    }
    if (found.status === 404) {
      outcome = "not_found";
    }
    return {
      status: outcome,
      message: found.message,
    };
  }
  if (files.length === 0) {
    return {
      status: "invalid",
      message: "Please choose at least one file",
    };
  }
  files.forEach((file) => {
    found.task.attachments.push({
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: me ? me.employee._id : null,
      uploadedByType: me ? "employee" : "organization",
      uploadedAt: new Date(),
    });
  });
  await repository.saveTask(found.task);
  return {
    status: "success",
    message: files.length === 1 ? "File attached" : "Files attached",
    data: found.task.attachments,
  };
}

// DELETE /api/tasks/:id/attachments/:attachmentId
// Remove one document from the task. The person who sent it can always
// remove it, and the owner of the task can remove any of them.
export async function deleteTaskAttachment(actor: ServiceActor, ids: TaskIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  // validateIdParam only checked the id of the task, so we check this
  // second id ourselves before asking the database anything.
  if (!mongoose.isValidObjectId(ids.attachmentId)) {
    return {
      status: "invalid",
      message: "Invalid file id",
    };
  }
  const found = await findTaskICanSee(organizationId, String(ids.id), me);
  if (!found.task) {
    let outcome = "invalid";
    if (found.status === 403) {
      outcome = "forbidden";
    }
    if (found.status === 404) {
      outcome = "not_found";
    }
    return {
      status: outcome,
      message: found.message,
    };
  }
  // id() finds the line of the list that has this _id.
  const attachment = found.task.attachments.find(function (file) {
    return String(file._id) === ids.attachmentId;
  });
  if (!attachment) {
    return {
      status: "not_found",
      message: "File not found",
    };
  }
  const iSentThisFile = me !== null && String(attachment.uploadedBy) === String(me.employee._id);
  if (!iSentThisFile && !canManageTask(found.task, me)) {
    return {
      status: "forbidden",
      message: "You can remove only the files you sent",
    };
  }
  // First the line in the database, then the real file on the disk.
  found.task.attachments = found.task.attachments.filter(function (file) {
    return String(file._id) !== ids.attachmentId;
  });
  await repository.saveTask(found.task);
  deleteTaskFile(attachment.fileName);
  return {
    status: "success",
    message: "File removed",
  };
}

// DELETE /api/tasks/:id
export async function deleteTask(actor: ServiceActor, ids: TaskIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const task = await repository.findTaskDocument(ids, organizationId);
  if (!task) {
    return {
      status: "not_found",
      message: "Task not found",
    };
  }
  if (!canDeleteTask(task, me)) {
    return {
      status: "forbidden",
      message: "You can delete only the tasks you created",
    };
  }
  // The task goes away, so everything that hangs on it has to go away
  // too, otherwise the comments would stay forever in the database and
  // the files would stay forever on the disk.
  const comments = await repository.findComments(task);
  task.attachments.forEach((file) => deleteTaskFile(file.fileName));
  comments.forEach((comment) => {
    comment.attachments.forEach((file) => deleteTaskFile(file.fileName));
  });
  // Read before the task is gone: afterwards there is nobody left to name.
  const taskTitle = task.title;
  const assigneeId = String(task.assignedTo);
  await repository.removeTaskComment(task);
  await repository.removeTask(task);
  await notifyTaskChanged({
    organizationId: organizationId,
    taskTitle: taskTitle,
    assigneeEmployeeId: assigneeId,
    wasDeleted: true,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Task deleted successfully",
  };
}
