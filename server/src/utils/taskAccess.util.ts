import { Task } from "../modules/task/task.model.js";
import { PERMISSIONS } from "../config/permissions.js";
import { can } from "./currentUser.util.js";
import type { LoggedInEmployee } from "./currentUser.util.js";
import { canSeeWorkOfEmployee } from "./leaveApprover.util.js";

// Who the logged in person is, and what their role lets them do, is read in
// one single place for the whole server. The task module used to have its own
// copy of that code; now it simply hands the same helper on, so an import
// that was written as
//   import { getLoggedInEmployee } from "./taskAccess.util.js";
// keeps working.
export { getLoggedInEmployee } from "./currentUser.util.js";
export type { LoggedInEmployee } from "./currentUser.util.js";

// Is this person allowed to give a task to somebody at all?
//
// The organization always can. An employee can in two different ways, and
// they are not the same thing:
// - the permission "tasks.assign" is ticked on their role, or
// - they are the lead of at least one active team. A team lead is not a role:
//   it is the employee the organization put at the head of a team, so they
//   can always give work to their own people.
// Who gave this task to the person holding it right now.
//
// The timeline is the honest answer and not assignedByEmployee: a task can
// change hands, and the person waiting for news about the work is the one who
// handed it over last, not the one who created it three months ago. An empty
// timeline means the task never moved, so the creator is still right.
//
// null means "the organization account gave it", because an organization
// account is not an employee.
export function whoGaveTheTask(task: any) {
  const lastLine = task.assignmentHistory[task.assignmentHistory.length - 1];

  if (lastLine) {
    return lastLine.byEmployee ? String(lastLine.byEmployee) : null;
  }

  return task.assignedByEmployee ? String(task.assignedByEmployee) : null;
}

export function canGiveTasks(me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  return can(me, PERMISSIONS.TASKS_ASSIGN) || me.isTeamLead;
}

// Is this person allowed to open the task, read its documents and read
// its comments?
//
// The organization sees every task of its own organization, and so does an
// employee whose role carries "tasks.view_all". Everybody else sees a task
// when they are part of its story:
// - the task is theirs right now,
// - they created it,
// - or they held it before, or they moved it to somebody else. A manager
//   who passed a task to their team still has to follow the discussion,
//   so the timeline is what decides here.
export function canSeeTask(task: any, me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  if (can(me, PERMISSIONS.TASKS_VIEW_ALL)) {
    return true;
  }

  const myId = String(me.employee._id);

  if (String(task.assignedTo) === myId) {
    return true;
  }

  if (String(task.assignedByEmployee) === myId) {
    return true;
  }

  const history = task.assignmentHistory || [];

  return history.some(
    (entry: any) =>
      String(entry.employee) === myId || String(entry.byEmployee) === myId
  );
}

// Is this person the owner of the task?
//
// The owner is the organization, or the person who created the task and may
// still edit tasks ("tasks.edit", or a team lead over their own team). They
// can delete any document and any comment of the task, even the ones written
// by somebody else.
//
// An employee who may both see every task and edit tasks is the admin of the
// module, so every task of the organization is theirs to manage.
export function canManageTask(task: any, me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  const mayEdit = can(me, PERMISSIONS.TASKS_EDIT) || me.isTeamLead;

  if (!mayEdit) {
    return false;
  }

  if (can(me, PERMISSIONS.TASKS_VIEW_ALL)) {
    return true;
  }

  return String(task.assignedByEmployee) === String(me.employee._id);
}

// May this person throw the task away?
//
// It is the same question as canManageTask, only it reads the permission
// "tasks.delete" instead of "tasks.edit", so an organization can let somebody
// write and change tasks without ever letting them delete one.
export function canDeleteTask(task: any, me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  const mayDelete = can(me, PERMISSIONS.TASKS_DELETE) || me.isTeamLead;

  if (!mayDelete) {
    return false;
  }

  if (can(me, PERMISSIONS.TASKS_VIEW_ALL)) {
    return true;
  }

  return String(task.assignedByEmployee) === String(me.employee._id);
}

// Read one task of my organization and check that I am allowed to open it.
//
// It answers { task, status, message } and task is null when something is
// wrong, so the controller only has to send that status and that message.
export async function findTaskICanSee(
  organizationId: string,
  taskId: string,
  me: LoggedInEmployee | null
) {
  const task = await Task.findOne({
    _id: taskId,
    organization: organizationId,
  });

  if (!task) {
    return { task: null, status: 404, message: "Task not found" };
  }

  if (!canSeeTask(task, me)) {
    return {
      task: null,
      status: 403,
      message: "You cannot open this task",
    };
  }

  return { task: task, status: 200, message: "" };
}

// The same lookup, but for READING only, and with one more door open.
//
// Everything above answers "am I part of this task?", and that is the right
// question before somebody changes a task, writes a comment on it or hangs a
// file on it. It is too narrow for one screen though: when an HR opens a
// leave request, the app shows them the tasks that would stall if they say
// yes, and pressing one of those has to open it. The HR is usually part of
// none of them.
//
// So a leave approver, and the team lead of that employee, may READ a task of
// the person whose leave they are deciding about. Only the two GET routes use
// this. Every route that writes still calls findTaskICanSee above, so nobody
// gains the right to touch a task they are not part of.
export async function findTaskICanRead(
  organizationId: string,
  taskId: string,
  me: LoggedInEmployee | null
) {
  const task = await Task.findOne({
    _id: taskId,
    organization: organizationId,
  });

  if (!task) {
    return { task: null, status: 404, message: "Task not found" };
  }

  if (canSeeTask(task, me)) {
    return { task: task, status: 200, message: "" };
  }

  const mayRead = await canSeeWorkOfEmployee(
    organizationId,
    me,
    String(task.assignedTo)
  );

  if (!mayRead) {
    return {
      task: null,
      status: 403,
      message: "You cannot open this task",
    };
  }

  return { task: task, status: 200, message: "" };
}
