import { Meeting } from "../modules/meeting/meeting.model.js";
import { PERMISSIONS } from "../config/permissions.js";
import { can } from "./currentUser.util.js";
import type { LoggedInEmployee } from "./currentUser.util.js";
import { canSeeWorkOfEmployee } from "./leaveApprover.util.js";

// Who the logged in person is, and what their role lets them do, is read in
// one single place for the whole server, so the meeting routes simply hand
// the same helper on instead of writing it again.
export { getLoggedInEmployee } from "./currentUser.util.js";
export type { LoggedInEmployee } from "./currentUser.util.js";

// Is this person the owner of the meeting?
//
// The owner is the organization, or the person who scheduled the meeting and
// whose role carries "meetings.edit". Only the owner can edit, reschedule,
// change the status, write the notes or delete the meeting.
//
// An employee who may both see every meeting and edit meetings is the admin
// of the module, so every meeting of the organization is theirs to manage.
export function canManageMeeting(meeting: any, me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  if (!can(me, PERMISSIONS.MEETINGS_EDIT)) {
    return false;
  }

  if (can(me, PERMISSIONS.MEETINGS_VIEW_ALL)) {
    return true;
  }

  // The organized-by field is an id here and a populated document in the
  // list route, so we read the id out of both shapes.
  const organizerId = String(
    meeting.organizedByEmployee?._id || meeting.organizedByEmployee
  );

  return organizerId === String(me.employee._id);
}

// May this person throw the meeting away?
//
// It is the same question as canManageMeeting, only it reads the permission
// "meetings.delete" instead of "meetings.edit", so an organization can let
// somebody schedule and change meetings without letting them remove one.
export function canDeleteMeeting(meeting: any, me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  if (!can(me, PERMISSIONS.MEETINGS_DELETE)) {
    return false;
  }

  if (can(me, PERMISSIONS.MEETINGS_VIEW_ALL)) {
    return true;
  }

  const organizerId = String(
    meeting.organizedByEmployee?._id || meeting.organizedByEmployee
  );

  return organizerId === String(me.employee._id);
}

// Is this person invited to the meeting?
export function isAttendee(meeting: any, me: LoggedInEmployee | null) {
  if (!me) {
    return false;
  }

  const myId = String(me.employee._id);

  return meeting.attendees.some(
    (attendee: any) => String(attendee.employee) === myId
  );
}

// Is this person allowed to open the meeting?
//
// The organization sees every meeting of its own organization, and so does an
// employee whose role carries "meetings.view_all". Everybody else sees a
// meeting when they scheduled it, or when they are invited to it.
export function canSeeMeeting(meeting: any, me: LoggedInEmployee | null) {
  if (!me) {
    return true;
  }

  if (can(me, PERMISSIONS.MEETINGS_VIEW_ALL)) {
    return true;
  }

  const organizerId = String(
    meeting.organizedByEmployee?._id || meeting.organizedByEmployee
  );

  if (organizerId === String(me.employee._id)) {
    return true;
  }

  return isAttendee(meeting, me);
}

// Read one meeting of my organization and check that I am allowed to open it.
//
// It answers { meeting, status, message } and meeting is null when something
// is wrong, so the controller only has to send that status and that message.
export async function findMeetingICanSee(
  organizationId: string,
  meetingId: string,
  me: LoggedInEmployee | null
) {
  const meeting = await Meeting.findOne({
    _id: meetingId,
    organization: organizationId,
  });

  if (!meeting) {
    return { meeting: null, status: 404, message: "Meeting not found" };
  }

  if (!canSeeMeeting(meeting, me)) {
    return {
      meeting: null,
      status: 403,
      message: "You cannot open this meeting",
    };
  }

  return { meeting: meeting, status: 200, message: "" };
}

// The same lookup, but for READING only, and with one more door open.
//
// It is the twin of findTaskICanRead in the task module, and it exists for
// the same one screen: an approver answering a leave request points at the
// meetings that still need the employee, and the employee then opens them
// from their leave. Neither of the two is usually invited to the other's
// meetings, so the plain rule above would shut both of them out.
//
// Only the GET route uses this. Rescheduling a meeting, writing its notes or
// deleting it still asks findMeetingICanSee, so nobody gains the right to
// touch a meeting they are not part of.
export async function findMeetingICanRead(
  organizationId: string,
  meetingId: string,
  me: LoggedInEmployee | null
) {
  const meeting = await Meeting.findOne({
    _id: meetingId,
    organization: organizationId,
  });

  if (!meeting) {
    return { meeting: null, status: 404, message: "Meeting not found" };
  }

  if (canSeeMeeting(meeting, me)) {
    return { meeting: meeting, status: 200, message: "" };
  }

  // Everybody who is really in this meeting. If I may look at the work of any
  // one of them, I may look at their meeting.
  const peopleInIt = meeting.attendees
    .map((attendee) => String(attendee.employee))
    .concat(
      meeting.organizedByEmployee ? [String(meeting.organizedByEmployee)] : []
    );

  for (const employeeId of peopleInIt) {
    const mayRead = await canSeeWorkOfEmployee(organizationId, me, employeeId);

    if (mayRead) {
      return { meeting: meeting, status: 200, message: "" };
    }
  }

  return {
    meeting: null,
    status: 403,
    message: "You cannot open this meeting",
  };
}
