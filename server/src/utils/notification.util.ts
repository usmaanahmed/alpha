import { Notification } from "../modules/notification/notification.model.js";
import type { NotificationType } from "../modules/notification/notification.model.js";
import { User } from "../modules/user/user.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { readRolePermissions } from "./currentUser.util.js";
import { sendToUser } from "../config/socket.js";
import { NOTIFICATION_MODULES } from "../config/notificationModules.js";

// Everything the bell of this app knows how to say.
//
// There are two kinds of lines, and the difference matters:
//
// 1. a PERSONAL line: "a task was given to YOU". It goes to one person, and
//    it opens their own page ("my tasks").
// 2. a WORKSPACE line: "Ali added a new cheque". It goes to everybody who is
//    allowed to see that module, and it opens the module page.
//
// Everything below is built out of those two ideas.

// ---------------------------------------------------------------------------
// The address of the page a line opens
// ---------------------------------------------------------------------------

// Every module page exists twice, once under /organization and once under
// /employee (see AppRoutes on the React side), so the link depends on WHO is
// going to read the line, not on who caused it.
function baseOf(role: string) {
  return role === "organization" ? "/organization" : "/employee";
}

// The root of the whole app for one account. baseOf() answers "where do the
// MODULE pages of this person live" and has only two answers, because the
// saas owner has no modules. This one has three, and it is what a line about
// somebody's own account needs.
function homeOf(role: string) {
  if (role === "saas_owner") {
    return "/owner";
  }

  return baseOf(role);
}

// The page of the module itself: the full task board, the cheque list...
export function moduleLink(role: string, moduleKey: string) {
  const found = NOTIFICATION_MODULES[moduleKey];

  if (!found) {
    return baseOf(role);
  }

  return baseOf(role) + "/" + found.page;
}

// The page that shows only MY things. An employee reading "you have a new
// task" wants their own board, not the one of the whole company. The
// organization account has no "my" page, so it always gets the module one.
export function myLink(role: string, moduleKey: string) {
  const found = NOTIFICATION_MODULES[moduleKey];

  if (!found || !found.myPage || role === "organization") {
    return moduleLink(role, moduleKey);
  }

  return baseOf(role) + "/" + found.myPage;
}

// ---------------------------------------------------------------------------
// Writing one line
// ---------------------------------------------------------------------------

interface NewNotification {
  organizationId: string;
  // The USER account that will see this line in its bell.
  recipientUserId: string;
  type: NotificationType;
  module: string;
  title: string;
  message: string;
  // The name of the person who did it. Every line has one, and the React
  // side shows it on its own row as "Assigned by Ali Khan".
  actorName: string;
  // Their picture, so that row can show the face next to the name.
  actorPhoto: string;
  link: string;
}

// Save one notification and push it to the person right away.
//
// The two steps always go together, and in this order:
// 1. the database keeps it, so it is still there tomorrow morning,
// 2. the socket shows it, so the bell moves while the person is looking.
export async function createNotification(input: NewNotification) {
  const notification = await Notification.create({
    organization: input.organizationId,
    recipient: input.recipientUserId,
    type: input.type,
    module: input.module,
    title: input.title,
    message: input.message,
    actorName: input.actorName,
    actorPhoto: input.actorPhoto,
    link: input.link,
  });

  // "notification" is the name of the message. The React side listens for
  // exactly this name in hooks/useNotifications.ts.
  sendToUser(input.recipientUserId, "notification", notification);

  return notification;
}

// ---------------------------------------------------------------------------
// Finding the people to tell
// ---------------------------------------------------------------------------

// The name and the picture of the account that did something.
//
// The picture lives on the Employee and not on the User, so it takes one
// more question to the database. Every notification is worth that one
// question: the face is what lets a person recognise the line before they
// have read a single word of it.
async function describeActor(actorUserId: string) {
  const user = await User.findById(actorUserId);

  if (!user) {
    return { name: "Somebody", photo: "" };
  }

  // The organization account is a company, not a person, so it has no
  // employee behind it and therefore no picture. Its circle shows the
  // initials of its name instead, exactly like an employee who never
  // uploaded one.
  if (!user.employee) {
    return { name: user.name, photo: "" };
  }

  const employee = await Employee.findById(user.employee);

  return { name: user.name, photo: employee ? employee.photo : "" };
}

// An employee is not an account: the account that logs in is the User whose
// "employee" field points at them. This is how we go from "Sara received the
// task" to "which bell has to ring".
export async function findUserOfEmployee(employeeId: string) {
  return User.findOne({ employee: employeeId, isActive: true });
}

// The bell of one employee, or the bell of the organization account when the
// employee id is null.
//
// A lot of the lines below are addressed to "whoever gave this out", and that
// is sometimes a person and sometimes the company itself. This is the one
// place that turns both of them into an account.
async function findUserOfEmployeeOrOrganization(
  organizationId: string,
  employeeId: string | null
) {
  return employeeId
    ? findUserOfEmployee(employeeId)
    : findOrganizationUser(organizationId);
}

// The organization account of one workspace. It owns the tenant, so it hears
// about everything that happens inside it.
async function findOrganizationUser(organizationId: string) {
  return User.findOne({
    role: "organization",
    organization: organizationId,
    isActive: true,
  });
}

// Everybody of one workspace who is allowed to hear about a module.
//
// This is the permission module doing its job a second time: the same
// permission that opens the cheque page also decides who hears "a new cheque
// was written". So a notification can never tell somebody about a part of
// the app they are not allowed to open.
//
// One of the permissions is enough (leave requests reach both the people who
// see every request and the people who only answer their own team's).
async function findUsersWhoMayHear(
  organizationId: string,
  permissions: string[]
) {
  const users = [];

  const organizationUser = await findOrganizationUser(organizationId);

  if (organizationUser) {
    users.push(organizationUser);
  }

  // We need the permissions of the role of every employee, so the role is
  // read together with them in the same question.
  const employees = await Employee.find({
    organization: organizationId,
    status: "active",
  }).populate("role", "name permissions status");

  const allowedEmployeeIds = [];

  for (const employee of employees) {
    const rolePermissions = readRolePermissions(employee.role);
    const mayHear = permissions.some((permission) =>
      rolePermissions.includes(permission)
    );

    if (mayHear) {
      allowedEmployeeIds.push(employee._id);
    }
  }

  const employeeUsers = await User.find({
    employee: { $in: allowedEmployeeIds },
    isActive: true,
  });

  return users.concat(employeeUsers);
}

// ---------------------------------------------------------------------------
// The two ways of speaking
// ---------------------------------------------------------------------------

// Tell one person something that is about them.
export async function notifyPerson(input: {
  organizationId: string;
  // The employee it is about. Somebody without a login account (it can
  // happen) simply hears nothing.
  employeeId: string;
  type: NotificationType;
  module: string;
  title: string;
  message: string;
  actorName: string;
  actorPhoto: string;
  // The account that did it. A team lead who puts themselves in their own
  // team, or who closes their own team, would otherwise read "you were
  // added by yourself" — so when it is the same account, nothing is
  // written. It is left out where the caller has already checked.
  actorUserId?: string;
}) {
  const user = await findUserOfEmployee(input.employeeId);

  if (!user) {
    return null;
  }

  if (input.actorUserId && String(user._id) === String(input.actorUserId)) {
    return null;
  }

  await createNotification({
    organizationId: input.organizationId,
    recipientUserId: String(user._id),
    type: input.type,
    module: input.module,
    title: input.title,
    message: input.message,
    actorName: input.actorName,
    actorPhoto: input.actorPhoto,
    // It is about them, so it opens their own page.
    link: myLink(user.role, input.module),
  });

  return String(user._id);
}

// Tell everybody of the workspace who may see this module.
//
// exceptUserIds is what keeps the bell quiet where it should be: the person
// who did the thing already knows, and somebody who just received a personal
// line does not need the same news a second time in general words.
export async function notifyWorkspace(input: {
  organizationId: string;
  module: string;
  type: NotificationType;
  title: string;
  message: string;
  actorName: string;
  actorPhoto: string;
  exceptUserIds: string[];
}) {
  const found = NOTIFICATION_MODULES[input.module];

  if (!found) {
    return;
  }

  const users = await findUsersWhoMayHear(input.organizationId, found.permissions);

  for (const user of users) {
    if (input.exceptUserIds.includes(String(user._id))) {
      continue;
    }

    await createNotification({
      organizationId: input.organizationId,
      recipientUserId: String(user._id),
      type: input.type,
      module: input.module,
      title: input.title,
      message: input.message,
      actorName: input.actorName,
      actorPhoto: input.actorPhoto,
      link: moduleLink(user.role, input.module),
    });
  }
}

// ---------------------------------------------------------------------------
// "Something was created", for every module that has no better sentence
// ---------------------------------------------------------------------------

// The name of the new thing, taken from the form that created it. A cheque
// gives its number, an employee gives its name, and a leave request gives
// nothing at all, which is fine.
function readNameFromBody(body: any, nameFields: string[]) {
  for (const field of nameFields) {
    const value = body?.[field];

    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
}

// Called by middlewares/notification.middleware.ts for every successful
// "create" request of the app. One function, every module.
export async function notifyCreated(input: {
  organizationId: string;
  module: string;
  // The account that pressed the button. It is the one person who must NOT
  // be told, because they are the one who did it.
  actorUserId: string;
  // The form that was sent, so we can quote the name of the new thing.
  body: any;
}) {
  const found = NOTIFICATION_MODULES[input.module];

  if (!found) {
    return;
  }

  const actor = await describeActor(input.actorUserId);
  const name = readNameFromBody(input.body, found.nameFields);

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: input.module,
    type: "created",
    title: "New " + found.label,
    // The sentence says WHAT happened; actorName says WHO did it. The name
    // used to stand at the front of this sentence, and it now has a line of
    // its own on the screen ("Added by Ali Khan"), so saying it twice would
    // only read badly.
    message:
      name === ""
        ? "A new " + found.label + " was added"
        : 'A new ' + found.label + ' "' + name + '" was added',
    actorName: actor.name,
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)],
  });
}

// "cheque" -> "Cheque", so the label can also start a title.
function capitalize(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Called by the same middleware for every successful edit and every
// successful delete of the app.
//
// It is the twin of notifyCreated, and it exists for the same reason: a
// module that is added to config/notificationModules.ts gets its three lines
// (added, changed, removed) on that same day, and nobody has to remember to
// write them.
//
// A delete has no form behind it, so there is no name to quote and the
// sentence simply stays short.
export async function notifyChanged(input: {
  organizationId: string;
  module: string;
  actorUserId: string;
  body: any;
  // true when the record was deleted, false when it was edited.
  wasDeleted: boolean;
}) {
  const found = NOTIFICATION_MODULES[input.module];

  if (!found) {
    return;
  }

  const actor = await describeActor(input.actorUserId);
  const name = input.wasDeleted
    ? ""
    : readNameFromBody(input.body, found.nameFields);
  const word = input.wasDeleted ? "removed" : "updated";

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: input.module,
    type: input.wasDeleted ? "removed" : "updated",
    title: capitalize(found.label) + " " + word,
    message:
      name === ""
        ? "A " + found.label + " was " + word
        : 'The ' + found.label + ' "' + name + '" was ' + word,
    actorName: actor.name,
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)],
  });
}

// ---------------------------------------------------------------------------
// The lines that are written by hand, because they can say more
// ---------------------------------------------------------------------------

// A task landed on somebody's desk: it was created for them, the edit form
// moved it to them, or it was handed over from the reassign dialog.
//
// The employee who now has the work gets a personal line, and the rest of
// the people who follow the tasks of the company get the short version.
export async function notifyTaskAssigned(input: {
  organizationId: string;
  taskTitle: string;
  employeeId: string;
  employeeName: string;
  // The name of the person who gave the task. It is empty when the
  // organization account did it itself.
  byName: string;
  // The account that did it, so it is never told about its own click.
  actorUserId: string;
  // true when the task moved from somebody else, false when it is new.
  isReassignment: boolean;
}) {
  const giver = input.byName || "Your organization";
  const actor = await describeActor(input.actorUserId);

  const receiverUserId = await notifyPerson({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    type: "assigned",
    module: "tasks",
    title: input.isReassignment ? "A task was moved to you" : "New task assigned",
    message: input.isReassignment
      ? 'The task "' + input.taskTitle + '" was moved to you'
      : 'You were given the task "' + input.taskTitle + '"',
    actorName: giver,
    actorPhoto: actor.photo,
  });

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "tasks",
    type: "assigned",
    title: input.isReassignment ? "A task was moved" : "A task was assigned",
    message: input.isReassignment
      ? 'The task "' + input.taskTitle + '" was moved to ' + input.employeeName
      : input.employeeName + ' was given the task "' + input.taskTitle + '"',
    actorName: giver,
    actorPhoto: actor.photo,
    // Not the person who did it, and not the person who just got the
    // personal line above.
    exceptUserIds: [String(input.actorUserId), String(receiverUserId || "")],
  });
}

// ---------------------------------------------------------------------------
// A task moved on
// ---------------------------------------------------------------------------

// The words a person reads for the five places a task can be. The database
// keeps "in_progress" because that is easy to store; nobody wants to read it.
const TASK_STATUS_LABELS: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  completed: "Done",
  cancelled: "Cancelled",
};

function statusLabel(status: string) {
  return TASK_STATUS_LABELS[status] || status;
}

// Where the person who GAVE the task lands when they click the line.
//
// It is not the same page as everywhere else, and that is the whole point:
// myLink() would send an employee to "My tasks", which holds the tasks they
// have to DO. The tasks they handed out live on "Team tasks", and that is
// where a person who just heard "your task moved" wants to be. The
// organization account has one list with everything, so it goes there.
function givenTasksLink(role: string) {
  return role === "organization"
    ? "/organization/tasks"
    : "/employee/team-tasks";
}

// A task changed status, so the person who gave it out hears about it.
//
// Only that one person. Every other line of the bell reaches everybody who
// may see the module, but a status is not news for the company: a board with
// twenty tasks would ring all day and the bell would stop meaning anything.
// The one person really waiting for this is the one who is waiting for the
// work, so they are the only one told.
export async function notifyTaskProgress(input: {
  organizationId: string;
  taskTitle: string;
  // Where the task is now: "in_progress", "completed"...
  newStatus: string;
  // The employee who gave the task out. It is null when the organization
  // account gave it, because an organization account is not an employee.
  assignerEmployeeId: string | null;
  // The name of the person who moved the card.
  byName: string;
  // The account that moved it, so it is never told about its own click.
  actorUserId: string;
}) {
  const user = await findUserOfEmployeeOrOrganization(
    input.organizationId,
    input.assignerEmployeeId
  );

  // Nobody to tell: the employee who gave the task has no login account
  // (it happens), or has left since.
  if (!user) {
    return;
  }

  // The person moved their own task. They were there when it happened.
  if (String(user._id) === String(input.actorUserId)) {
    return;
  }

  const actor = await describeActor(input.actorUserId);
  const label = statusLabel(input.newStatus);

  // The two ends of the board are worth their own sentence, because they
  // are the two answers somebody is really waiting for. Everything in
  // between is simply a move.
  let title = "Task moved to " + label;

  if (input.newStatus === "completed") {
    title = "Task completed";
  }

  if (input.newStatus === "cancelled") {
    title = "Task cancelled";
  }

  await createNotification({
    organizationId: input.organizationId,
    recipientUserId: String(user._id),
    type: "progress",
    module: "tasks",
    title: title,
    message: 'The task "' + input.taskTitle + '" was moved to ' + label,
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    link: givenTasksLink(user.role),
  });
}

// People were invited to a meeting: it was just scheduled, the edit form
// changed the guest list, or the meeting moved to another time.
export async function notifyMeetingInvited(input: {
  organizationId: string;
  meetingTitle: string;
  // The employees who are invited right now.
  attendeeIds: string[];
  byName: string;
  actorUserId: string;
  // true when the meeting moved to another time.
  isReschedule: boolean;
  // Should the rest of the company hear about it too?
  //
  // It is true when the meeting is scheduled or moved, because that is news
  // for the whole workspace. It is false when the edit form simply added one
  // more guest to a meeting everybody already knows about: only that new
  // guest has something to learn there.
  tellWorkspace: boolean;
}) {
  const organizer = input.byName || "Your organization";
  const actor = await describeActor(input.actorUserId);
  const toldUserIds = [];

  for (const attendeeId of input.attendeeIds) {
    const userId = await notifyPerson({
      organizationId: input.organizationId,
      employeeId: attendeeId,
      type: "assigned",
      module: "meetings",
      title: input.isReschedule
        ? "A meeting moved to a new time"
        : "You are invited to a meeting",
      message: input.isReschedule
        ? 'The meeting "' + input.meetingTitle + '" was moved to a new time'
        : 'You are invited to "' + input.meetingTitle + '"',
      actorName: organizer,
      actorPhoto: actor.photo,
    });

    if (userId) {
      toldUserIds.push(userId);
    }
  }

  if (!input.tellWorkspace) {
    return;
  }

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "meetings",
    type: input.isReschedule ? "assigned" : "created",
    title: input.isReschedule ? "A meeting was moved" : "New meeting",
    message: input.isReschedule
      ? 'The meeting "' + input.meetingTitle + '" was moved to a new time'
      : 'The meeting "' + input.meetingTitle + '" was scheduled',
    actorName: organizer,
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)].concat(toldUserIds),
  });
}

// The task itself was edited, or deleted.
//
// Tasks are in WRITTEN_BY_HAND, so the middleware writes nothing for them
// and this is where their "changed" and "removed" lines come from. The
// person holding the task is the one told: their work just changed under
// their hands.
export async function notifyTaskChanged(input: {
  organizationId: string;
  taskTitle: string;
  assigneeEmployeeId: string;
  // true when the task is gone, false when it was only edited.
  wasDeleted: boolean;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  await notifyPerson({
    organizationId: input.organizationId,
    employeeId: input.assigneeEmployeeId,
    type: input.wasDeleted ? "removed" : "updated",
    module: "tasks",
    title: input.wasDeleted ? "A task was removed" : "Your task was updated",
    message: input.wasDeleted
      ? 'The task "' + input.taskTitle + '" was removed'
      : 'The task "' + input.taskTitle + '" was changed',
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    actorUserId: input.actorUserId,
  });
}

// Somebody wrote under a task.
//
// Two people care about a comment and nobody else: the person doing the work
// and the person waiting for it. The rest of the company is not part of that
// conversation, so the rest of the company is not told.
export async function notifyTaskComment(input: {
  organizationId: string;
  taskTitle: string;
  // The employee doing the task.
  assigneeEmployeeId: string;
  // The employee who gave it out, null when the organization gave it.
  assignerEmployeeId: string | null;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  // The person doing the work goes to their own board, the person waiting
  // for it goes to the board of the tasks they gave. Same event, two pages.
  const assignee = await findUserOfEmployee(input.assigneeEmployeeId);
  const assigner = await findUserOfEmployeeOrOrganization(
    input.organizationId,
    input.assignerEmployeeId
  );

  const readers = [
    { user: assignee, isTheOneDoingIt: true },
    { user: assigner, isTheOneDoingIt: false },
  ];

  const alreadyTold: string[] = [];

  for (const reader of readers) {
    if (!reader.user) {
      continue;
    }

    const userId = String(reader.user._id);

    // Never the writer of the comment, and never the same person twice: on
    // a task somebody gave to themselves both readers are one person.
    if (userId === String(input.actorUserId) || alreadyTold.includes(userId)) {
      continue;
    }

    alreadyTold.push(userId);

    await createNotification({
      organizationId: input.organizationId,
      recipientUserId: userId,
      type: "comment",
      module: "tasks",
      title: "New comment on a task",
      message:
        'A new comment was written under the task "' + input.taskTitle + '"',
      actorName: input.byName || "Your organization",
      actorPhoto: actor.photo,
      link: reader.isTheOneDoingIt
        ? myLink(reader.user.role, "tasks")
        : givenTasksLink(reader.user.role),
    });
  }
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

// Somebody joined a team, or left it.
//
// This is a personal line and only a personal line: being moved between teams
// is news for the person it happens to, and the whole workspace already hears
// "the team Alpha was updated" from the middleware.
export async function notifyTeamMembership(input: {
  organizationId: string;
  teamName: string;
  // The employees who are new in the team, and the ones who are out of it.
  addedEmployeeIds: string[];
  removedEmployeeIds: string[];
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  for (const employeeId of input.addedEmployeeIds) {
    await notifyPerson({
      organizationId: input.organizationId,
      employeeId: employeeId,
      type: "assigned",
      module: "teams",
      title: "You joined a team",
      message: 'You were added to the team "' + input.teamName + '"',
      actorName: input.byName || "Your organization",
      actorPhoto: actor.photo,
      actorUserId: input.actorUserId,
    });
  }

  for (const employeeId of input.removedEmployeeIds) {
    await notifyPerson({
      organizationId: input.organizationId,
      employeeId: employeeId,
      type: "removed",
      module: "teams",
      title: "You left a team",
      message: 'You were removed from the team "' + input.teamName + '"',
      actorName: input.byName || "Your organization",
      actorPhoto: actor.photo,
      actorUserId: input.actorUserId,
    });
  }
}

// Somebody was made the lead of a team.
//
// Being a lead is not a role and carries no permission of its own, but it
// does put work on a desk: a lead answers the leave requests of their people
// and is asked for a recommendation. So the person has to be told.
export async function notifyTeamLead(input: {
  organizationId: string;
  teamName: string;
  employeeId: string;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  await notifyPerson({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    type: "assigned",
    module: "teams",
    title: "You are now a team lead",
    message: 'You were made the lead of the team "' + input.teamName + '"',
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    actorUserId: input.actorUserId,
  });
}

// A whole team was closed, so every one of its people loses it at once.
export async function notifyTeamClosed(input: {
  organizationId: string;
  teamName: string;
  memberEmployeeIds: string[];
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  for (const employeeId of input.memberEmployeeIds) {
    await notifyPerson({
      organizationId: input.organizationId,
      employeeId: employeeId,
      type: "removed",
      module: "teams",
      title: "Your team was closed",
      message: 'The team "' + input.teamName + '" was closed',
      actorName: input.byName || "Your organization",
      actorPhoto: actor.photo,
      actorUserId: input.actorUserId,
    });
  }
}

// ---------------------------------------------------------------------------
// Meetings, after the invitation
// ---------------------------------------------------------------------------

// Somebody is not invited any more.
//
// The invitation itself is written by notifyMeetingInvited; this is the other
// half of the same edit form. A person who has already put the meeting in
// their day has to hear that it is off, exactly as loudly as they heard it
// was on.
export async function notifyMeetingUninvited(input: {
  organizationId: string;
  meetingTitle: string;
  attendeeIds: string[];
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  for (const attendeeId of input.attendeeIds) {
    await notifyPerson({
      organizationId: input.organizationId,
      employeeId: attendeeId,
      type: "removed",
      module: "meetings",
      title: "You were taken off a meeting",
      message:
        'You are no longer invited to "' + input.meetingTitle + '"',
      actorName: input.byName || "Your organization",
      actorPhoto: actor.photo,
      actorUserId: input.actorUserId,
    });
  }
}

// A guest answered the invitation.
//
// Only the person who called the meeting is told. An organizer counting
// heads is the one who needs this; twelve other guests do not.
export async function notifyMeetingAnswered(input: {
  organizationId: string;
  meetingTitle: string;
  // The employee who called the meeting, null when the organization did.
  organizerEmployeeId: string | null;
  // "accepted", "declined" or "tentative", as the guest answered.
  answer: string;
  byName: string;
  actorUserId: string;
}) {
  const user = await findUserOfEmployeeOrOrganization(
    input.organizationId,
    input.organizerEmployeeId
  );

  if (!user || String(user._id) === String(input.actorUserId)) {
    return;
  }

  const actor = await describeActor(input.actorUserId);
  const guest = input.byName || "Somebody";

  await createNotification({
    organizationId: input.organizationId,
    recipientUserId: String(user._id),
    type: "reviewed",
    module: "meetings",
    title: "A meeting invitation was answered",
    message:
      guest + " " + input.answer + ' the invitation to "' + input.meetingTitle + '"',
    actorName: guest,
    actorPhoto: actor.photo,
    link: moduleLink(user.role, "meetings"),
  });
}

// The meeting itself changed after everybody was invited: it was cancelled,
// it was marked as held, its notes were written, or it was deleted.
//
// Everybody who was invited hears it, because everybody who was invited has
// it in their day.
export async function notifyMeetingToGuests(input: {
  organizationId: string;
  meetingTitle: string;
  attendeeIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  for (const attendeeId of input.attendeeIds) {
    await notifyPerson({
      organizationId: input.organizationId,
      employeeId: attendeeId,
      type: input.type,
      module: "meetings",
      title: input.title,
      message: input.message,
      actorName: input.byName || "Your organization",
      actorPhoto: actor.photo,
      actorUserId: input.actorUserId,
    });
  }
}

// The word for what happened to a leave request, used in the title of the
// bell line. A partly approved leave is its own answer and must not be
// called simply "approved", because the employee has to go and look at
// which of their days really came back.
function leaveAnswerWord(status: string) {
  if (status === "rejected") {
    return "rejected";
  }

  if (status === "partially_approved") {
    return "partly approved";
  }

  return "approved";
}

// A leave request was answered. The person who asked for the days is the one
// who has been waiting for this, so they get the personal line.
export async function notifyLeaveReviewed(input: {
  organizationId: string;
  // The employee who asked for the leave.
  employeeId: string;
  employeeName: string;
  byName: string;
  actorUserId: string;
  // "approved", "partially_approved" or "rejected", exactly as the request
  // now stands.
  status: string;
  // How many days really came out of it, so the line can say the number
  // instead of leaving the employee guessing.
  approvedDays: number;
}) {
  const reviewer = input.byName || "Your organization";
  const actor = await describeActor(input.actorUserId);
  const word = leaveAnswerWord(input.status);

  // "rejected your leave request" reads fine on its own, the other two are
  // worth a number: "approved your leave request (3 days)".
  const days =
    input.status === "rejected" ? "" : " (" + input.approvedDays + " days)";

  const askerUserId = await notifyPerson({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    type: "reviewed",
    module: "leaves",
    title: "Leave " + word,
    message: "Your leave request was " + word + days,
    actorName: reviewer,
    actorPhoto: actor.photo,
  });

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "leaves",
    type: "reviewed",
    title: "A leave was " + word,
    message: "The leave of " + input.employeeName + " was " + word + days,
    actorName: reviewer,
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId), String(askerUserId || "")],
  });
}

// A team lead wrote its recommendation on the request of one of its members.
//
// This decides nothing, so the employee who asked hears nothing yet: it would
// only look like an answer. The people who WILL decide are the ones who need
// to know that there is now a note waiting for them to read.
export async function notifyLeaveRecommended(input: {
  organizationId: string;
  employeeName: string;
  byName: string;
  actorUserId: string;
  // true when the lead is for the leave, false when it is against it.
  isFor: boolean;
}) {
  const actor = await describeActor(input.actorUserId);

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "leaves",
    type: "reviewed",
    title: "A team lead answered a leave",
    message:
      "The leave of " +
      input.employeeName +
      (input.isFor ? " was recommended" : " was not recommended"),
    actorName: input.byName,
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)],
  });
}

// ---------------------------------------------------------------------------
// Leaves, after the request
// ---------------------------------------------------------------------------

// An employee took their own leave request back.
//
// The people who were going to answer it are the ones who must know: without
// this line a manager keeps a request on their list that nobody is waiting
// for any more.
export async function notifyLeaveCancelled(input: {
  organizationId: string;
  employeeName: string;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "leaves",
    type: "removed",
    title: "A leave request was cancelled",
    message: "The leave request of " + input.employeeName + " was cancelled",
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)],
  });
}

// The rules behind every leave request changed.
export async function notifyLeavePolicyChanged(input: {
  organizationId: string;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "leaves",
    type: "updated",
    title: "The leave policy changed",
    message: "The rules for leave requests were updated",
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)],
  });
}

// ---------------------------------------------------------------------------
// One person, about their own account
// ---------------------------------------------------------------------------

// Something happened to my own record: my details were edited, or my
// password was changed for me.
//
// A password line is the important one. If somebody changes a password that
// is not theirs, the owner of that account has to see it happen, and they see
// it the same second because the bell is live.
export async function notifyAboutMyAccount(input: {
  organizationId: string;
  employeeId: string;
  title: string;
  message: string;
  byName: string;
  actorUserId: string;
}) {
  const user = await findUserOfEmployee(input.employeeId);

  // Doing it to yourself is not news.
  if (!user || String(user._id) === String(input.actorUserId)) {
    return;
  }

  const actor = await describeActor(input.actorUserId);

  await createNotification({
    organizationId: input.organizationId,
    recipientUserId: String(user._id),
    type: "updated",
    module: "employees",
    title: input.title,
    message: input.message,
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    // Their own account page, which every account can open with no
    // permission at all. The employee list would be a locked door for most
    // of the people who get this line.
    link: homeOf(user.role) + "/settings",
  });
}

// ---------------------------------------------------------------------------
// Cheques, after they are written
// ---------------------------------------------------------------------------

// A cheque moved: it was deposited, it cleared, it bounced, it was cancelled.
//
// A bounced cheque is the reason this exists. It is money that did not
// arrive, and the people who follow the cheques should not have to open the
// page to find out.
export async function notifyChequeStatus(input: {
  organizationId: string;
  chequeNumber: string;
  // The word a person reads: "deposited", "cleared", "bounced", "cancelled".
  statusWord: string;
  byName: string;
  actorUserId: string;
}) {
  const actor = await describeActor(input.actorUserId);

  await notifyWorkspace({
    organizationId: input.organizationId,
    module: "cheques",
    type: "progress",
    title: "Cheque " + input.statusWord,
    message:
      'The cheque "' + input.chequeNumber + '" was marked as ' + input.statusWord,
    actorName: input.byName || "Your organization",
    actorPhoto: actor.photo,
    exceptUserIds: [String(input.actorUserId)],
  });
}
