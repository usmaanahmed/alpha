import type {
  MeetingDocument,
  MeetingConflict,
  MeetingIds,
  MeetingInput,
  MeetingRescheduleInput,
  MeetingStatusInput,
  MeetingRespondInput,
  MeetingNotesInput,
} from "./meeting.types.js";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import mongoose from "mongoose";
import type { MeetingAttendee, MeetingStatus } from "./meeting.model.js";
import * as repository from "./meeting.repository.js";
import type { ServiceActor } from "../../types/service.types.js";
import { canManageMeeting, canDeleteMeeting, findMeetingICanRead } from "../../utils/meetingAccess.util.js";
import { can } from "../../utils/currentUser.util.js";
import { PERMISSIONS } from "../../config/permissions.js";
import {
  notifyMeetingInvited,
  notifyMeetingUninvited,
  notifyMeetingAnswered,
  notifyMeetingToGuests,
} from "../../utils/notification.util.js";

// Everybody who is invited to this meeting, as plain ids.
function guestsOf(meeting: MeetingDocument) {
  return meeting.attendees.map((attendee) => String(attendee.employee));
}

// The sentence a guest reads when the meeting itself moves on. The two words
// that really matter are "cancelled" and "completed": one takes the meeting
// out of somebody's day, the other closes it.
function statusWords(status: string) {
  if (status === "cancelled") {
    return { title: "A meeting was cancelled", word: "cancelled" };
  }
  if (status === "completed") {
    return { title: "A meeting is over", word: "marked as held" };
  }
  if (status === "in_progress") {
    return { title: "A meeting started", word: "started" };
  }
  return { title: "A meeting changed", word: "moved back to scheduled" };
}

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// The date/time input of the forms sends text like "2026-07-30T14:30".
// We turn it into a real date, or null when the text cannot be read.
function toDateTime(text: string | undefined) {
  if (!text) {
    return null;
  }
  const date = new Date(text);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

// Add the minutes of the meeting to its start time to get its end time.
function addMinutes(start: Date, minutes: number) {
  return new Date(start.getTime() + minutes * 60 * 1000);
}

// From a status you may move only to the statuses listed here.
//
//   Scheduled ─► In progress ─► Completed
//        │             │
//        └─────────────┴─► Cancelled ─► (re-open) Scheduled
const ALLOWED_STATUS_MOVES: Record<MeetingStatus, MeetingStatus[]> = {
  scheduled: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  // A finished meeting is the end of the road.
  completed: [],
  // A cancelled meeting can be brought back to life.
  cancelled: ["scheduled"],
};

// Write one new line at the end of the status history. The person is the
// organization account, or the manager who owns the meeting.
function pushHistory(
  meeting: MeetingDocument,
  status: MeetingStatus,
  note: string | undefined,
  me: LoggedInEmployee | null,
) {
  meeting.statusHistory.push({
    status: status,
    note: note || "",
    byType: me ? "manager" : "organization",
    byEmployee: me ? me.employee._id : null,
    at: new Date(),
  });
}

// Take the list of employee ids the form sent and make sure every one of
// them is a real active employee of this organization. It also throws away
// any id that was sent twice.
async function validateAttendees(organizationId: string, attendeeIds: string[]) {
  // Remove the duplicates the form may have sent.
  const uniqueIds: string[] = [];
  attendeeIds.forEach((id) => {
    if (!uniqueIds.includes(String(id))) {
      uniqueIds.push(String(id));
    }
  });
  const employees = await repository.findEmployees(uniqueIds, organizationId);
  // If even one id was not found, one of the chosen people is not an active
  // employee of this organization, so we refuse the whole list.
  if (employees.length !== uniqueIds.length) {
    return {
      ids: null,
      message: "Please choose only active employees of your organization",
    };
  }
  return { ids: uniqueIds, message: "" };
}

// Find the meetings that clash with a time window for any of the invited
// people. Two meetings clash when they share a person AND their times
// overlap. Times overlap when one starts before the other ends and ends
// after the other starts.
//
// It answers a plain list the form can show, one line per clashing meeting,
// with the names of the people who are already busy at that time.
async function findConflicts(
  organizationId: string,
  attendeeIds: string[],
  startAt: Date,
  endAt: Date,
  excludeMeetingId: string | null,
) {
  if (attendeeIds.length === 0) {
    return [];
  }
  const query: Record<string, unknown> = {
    organization: organizationId,
    // A cancelled or finished meeting cannot clash with anything.
    status: { $in: ["scheduled", "in_progress"] },
    "attendees.employee": { $in: attendeeIds },
    startAt: { $lt: endAt },
    endAt: { $gt: startAt },
  };
  // When we reschedule a meeting we must not compare it with itself.
  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }
  const clashing = await repository.findOverlappingMeetings(query);
  const idList = attendeeIds.map((id) => String(id));
  const conflicts: MeetingConflict[] = [];
  clashing.forEach((meeting) => {
    // Which of the invited people are busy in THIS clashing meeting?
    const busy: {
      _id: string;
      name: string;
    }[] = [];
    meeting.attendees.forEach((attendee) => {
      const employee = attendee.employee; // after populate this is {_id,name}
      if (employee && idList.includes(String(employee._id))) {
        busy.push({ _id: String(employee._id), name: employee.name });
      }
    });
    if (busy.length > 0) {
      conflicts.push({
        meetingId: String(meeting._id),
        title: meeting.title,
        startAt: meeting.startAt,
        endAt: meeting.endAt,
        employees: busy,
      });
    }
  });
  return conflicts;
}

// ---------------------------------------------------------------------------
// The attendee picker
// ---------------------------------------------------------------------------
// GET /api/meetings/assignable-employees
// The "invite" list of the meeting form is filled from here: every active
// employee of the organization. The route already asks for the permission
// "meetings.create", so whoever gets here may schedule a meeting.
export async function getAssignableEmployees(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const employees = await repository.findActiveEmployees(organizationId);
  return {
    status: "success",
    data: employees,
  };
}

// ---------------------------------------------------------------------------
// Reading and writing the meeting itself
// ---------------------------------------------------------------------------
// GET /api/meetings
// Who sees what:
// - the organization sees every meeting of the organization,
// - an employee sees the meetings they scheduled and the meetings they are
//   invited to.
export async function getAllMeetings(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const filter: Record<string, unknown> = { organization: organizationId };
  // An employee whose role carries "meetings.view_all" reads the whole
  // organization, exactly like the organization account does. Everybody else
  // gets the meetings they organized OR the meetings they are invited to.
  if (me && !can(me, PERMISSIONS.MEETINGS_VIEW_ALL)) {
    filter.$or = [
      { organizedByEmployee: me.employee._id },
      { "attendees.employee": me.employee._id },
    ];
  }
  // lean() gives plain objects, so we can add the extra permission flags to
  // every meeting before we send them.
  const meetings = await repository.findMeetings(filter);
  const myEmployeeId = me ? String(me.employee._id) : null;
  const meetingsWithFlags = meetings.map((meeting) => {
    // The organization owns every meeting; an employee owns the meetings it
    // scheduled itself, as long as its role may still edit meetings.
    const canManage = canManageMeeting(meeting, me);
    // Am I invited, and what did I answer? The employee page uses this to
    // show the RSVP buttons on my own row.
    let myResponse: string | null = null;
    meeting.attendees.forEach((attendee) => {
      const employeeId = String(attendee.employee?._id || attendee.employee);
      if (employeeId === myEmployeeId) {
        myResponse = attendee.response;
      }
    });
    return {
      ...meeting,
      canManage: canManage,
      myResponse: myResponse,
    };
  });
  return {
    status: "success",
    data: meetingsWithFlags,
  };
}

// GET /api/meetings/:id
// One single meeting, with the same shape and the same two flags as one row
// of the list above, so the detail dialog cannot tell where it came from.
//
// It exists for the screens that know an id but do not hold the list: an
// approver referenced this meeting on a leave request, and the employee opens
// it from there.
//
// findMeetingICanRead is the READING door: it lets in the people who are part
// of the meeting, and also the approver of their leave. Nobody gains the
// right to change anything, because every write route still asks
// findMeetingICanSee.
export async function getOneMeeting(actor: ServiceActor, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const found = await findMeetingICanRead(organizationId, String(ids.id), me);
  if (!found.meeting) {
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
  const meeting = await repository.findMeeting(found.meeting);
  const myEmployeeId = me ? String(me.employee._id) : null;
  let myResponse: string | null = null;
  meeting!.attendees.forEach((attendee) => {
    const employeeId = String(attendee.employee?._id || attendee.employee);
    if (employeeId === myEmployeeId) {
      myResponse = attendee.response;
    }
  });
  return {
    status: "success",
    data: {
      ...meeting,
      canManage: canManageMeeting(meeting, me),
      myResponse: myResponse,
    },
  };
}

// POST /api/meetings
// Whoever has the permission "meetings.create" schedules a meeting. The route
// checks it before we get here.
export async function createMeeting(actor: ServiceActor, input: MeetingInput) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const startAt = toDateTime(input.startAt);
  if (!startAt) {
    return {
      status: "invalid",
      message: "Please choose a valid date and time",
    };
  }
  const durationMinutes = input.durationMinutes;
  const endAt = addMinutes(startAt, durationMinutes);
  // Check the chosen people are real, then check the time is free for them.
  const checked = await validateAttendees(organizationId, input.attendees);
  if (!checked.ids) {
    return {
      status: "invalid",
      message: checked.message,
    };
  }
  const conflicts = await findConflicts(organizationId, checked.ids, startAt, endAt, null);
  // If the time clashes and the user did not say "schedule anyway", we stop
  // and send the clashes back so the form can show them.
  if (conflicts.length > 0 && input.ignoreConflicts !== true) {
    return {
      status: "conflict",
      message: "Some people already have a meeting at this time",
      data: { conflicts: conflicts },
    };
  }
  // Everybody starts as "invited" until they answer.
  const attendees: MeetingAttendee[] = checked.ids.map((employeeId) => ({
    employee: new mongoose.Types.ObjectId(employeeId),
    response: "invited",
    note: "",
    respondedAt: null,
  }));
  const meeting = await repository.insertMeeting(organizationId, input, startAt, durationMinutes, endAt, me, attendees);
  // The meeting is safely saved, so now everybody who has to be there hears
  // about it, and the rest of the company sees it appear in their bell.
  await notifyMeetingInvited({
    organizationId: organizationId,
    meetingTitle: meeting.title,
    attendeeIds: checked.ids.map((id) => String(id)),
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
    isReschedule: false,
    tellWorkspace: true,
  });
  return {
    status: "success",
    message: "Meeting scheduled successfully",
    data: meeting,
  };
}

// PUT /api/meetings/:id
// Edit the details of the meeting: the title, the agenda, the place, the
// kind, and the invited people. The time is NOT changed here, it has its own
// "reschedule" action so the change is written in the history.
export async function updateMeeting(actor: ServiceActor, input: MeetingInput, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const meeting = await repository.findMeetingDocument(ids, organizationId);
  if (!meeting) {
    return {
      status: "not_found",
      message: "Meeting not found",
    };
  }
  if (!canManageMeeting(meeting, me)) {
    return {
      status: "forbidden",
      message: "You can edit only the meetings you scheduled",
    };
  }
  const checked = await validateAttendees(organizationId, input.attendees);
  if (!checked.ids) {
    return {
      status: "invalid",
      message: checked.message,
    };
  }
  // Editing can add new people, and a new person may already be busy at the
  // meeting's time, so we run the same clash check as when scheduling.
  const conflicts = await findConflicts(organizationId, checked.ids, meeting.startAt, meeting.endAt, String(meeting._id));
  if (conflicts.length > 0 && input.ignoreConflicts !== true) {
    return {
      status: "conflict",
      message: "Some people already have a meeting at this time",
      data: { conflicts: conflicts },
    };
  }
  // Build the new attendee list. A person who was already invited keeps their
  // answer, a newly added person starts again as "invited".
  const newAttendees: MeetingAttendee[] = checked.ids.map((employeeId) => {
    const existing = meeting.attendees.find((attendee) => String(attendee.employee) === String(employeeId));
    if (existing) {
      return {
        employee: new mongoose.Types.ObjectId(employeeId),
        response: existing.response,
        note: existing.note,
        respondedAt: existing.respondedAt,
      };
    }
    return {
      employee: new mongoose.Types.ObjectId(employeeId),
      response: "invited",
      note: "",
      respondedAt: null,
    };
  });
  // Who is invited now and was NOT invited before. Only these people have
  // something to learn: everybody else already knows about this meeting.
  // This has to be worked out while meeting.attendees is still the old list.
  const oldAttendeeIds = meeting.attendees.map((attendee) => String(attendee.employee));
  const newAttendeeIds = checked.ids.map((id) => String(id));
  const addedIds = newAttendeeIds.filter((id) => !oldAttendeeIds.includes(id));
  // The other half of the same form: somebody who was invited yesterday and
  // is not on the list any more. They already put the meeting in their day,
  // so they hear that it is off.
  const droppedIds = oldAttendeeIds.filter((id) => !newAttendeeIds.includes(id));
  meeting.title = input.title;
  meeting.agenda = input.agenda || "";
  meeting.location = input.location || "";
  meeting.meetingType = input.meetingType;
  meeting.attendees = newAttendees;
  await repository.saveMeeting(meeting);
  if (addedIds.length > 0) {
    await notifyMeetingInvited({
      organizationId: organizationId,
      meetingTitle: meeting.title,
      attendeeIds: addedIds,
      byName: me ? me.employee.name : "",
      actorUserId: String(actor.user?.userId),
      isReschedule: false,
      // The meeting itself is not new, so the workspace hears nothing here.
      tellWorkspace: false,
    });
  }
  if (droppedIds.length > 0) {
    await notifyMeetingUninvited({
      organizationId: organizationId,
      meetingTitle: meeting.title,
      attendeeIds: droppedIds,
      byName: me ? me.employee.name : "",
      actorUserId: String(actor.user?.userId),
    });
  }
  return {
    status: "success",
    message: "Meeting updated successfully",
    data: meeting,
  };
}

// PATCH /api/meetings/:id/reschedule
// Move the meeting to another time. This is not the same as editing it:
// everybody's answer is cleared, because the old "yes" was for the old time,
// and the change is written in the history.
export async function rescheduleMeeting(actor: ServiceActor, input: MeetingRescheduleInput, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const meeting = await repository.findMeetingDocument(ids, organizationId);
  if (!meeting) {
    return {
      status: "not_found",
      message: "Meeting not found",
    };
  }
  if (!canManageMeeting(meeting, me)) {
    return {
      status: "forbidden",
      message: "You can reschedule only the meetings you scheduled",
    };
  }
  // A finished meeting has nothing left to move.
  if (meeting.status === "completed") {
    return {
      status: "invalid",
      message: "A finished meeting cannot be rescheduled",
    };
  }
  const startAt = toDateTime(input.startAt);
  if (!startAt) {
    return {
      status: "invalid",
      message: "Please choose a valid date and time",
    };
  }
  const durationMinutes = input.durationMinutes;
  const endAt = addMinutes(startAt, durationMinutes);
  // Check the new time against everybody who is already invited.
  const attendeeIds = meeting.attendees.map((attendee) => String(attendee.employee));
  const conflicts = await findConflicts(organizationId, attendeeIds, startAt, endAt, String(meeting._id));
  if (conflicts.length > 0 && input.ignoreConflicts !== true) {
    return {
      status: "conflict",
      message: "Some people already have a meeting at the new time",
      data: { conflicts: conflicts },
    };
  }
  meeting.startAt = startAt;
  meeting.durationMinutes = durationMinutes;
  meeting.endAt = endAt;
  // The old answers were for the old time, so everybody is "invited" again.
  meeting.attendees.forEach((attendee) => {
    attendee.response = "invited";
    attendee.note = "";
    attendee.respondedAt = null;
  });
  // A cancelled meeting that is rescheduled comes back to life.
  if (meeting.status === "cancelled") {
    meeting.status = "scheduled";
  }
  pushHistory(meeting, meeting.status, input.note || "Meeting rescheduled", me);
  await repository.saveMeeting(meeting);
  // Everybody invited has to answer again, so everybody invited is told.
  await notifyMeetingInvited({
    organizationId: organizationId,
    meetingTitle: meeting.title,
    attendeeIds: attendeeIds,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
    isReschedule: true,
    tellWorkspace: true,
  });
  return {
    status: "success",
    message: "Meeting rescheduled successfully",
    data: meeting,
  };
}

// PATCH /api/meetings/:id/status
// Start the meeting, finish it, cancel it, or re-open a cancelled one.
export async function changeMeetingStatus(actor: ServiceActor, input: MeetingStatusInput, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const meeting = await repository.findMeetingDocument(ids, organizationId);
  if (!meeting) {
    return {
      status: "not_found",
      message: "Meeting not found",
    };
  }
  if (!canManageMeeting(meeting, me)) {
    return {
      status: "forbidden",
      message: "You can change only the meetings you scheduled",
    };
  }
  const nextStatus = input.status;
  const allowed = ALLOWED_STATUS_MOVES[meeting.status];
  if (!allowed.includes(nextStatus)) {
    return {
      status: "invalid",
      message: 'A meeting cannot move from "' +
        meeting.status +
        '" to "' +
        nextStatus +
        '" this way',
    };
  }
  meeting.status = nextStatus;
  pushHistory(meeting, nextStatus, input.note, me);
  await repository.saveMeeting(meeting);
  // Everybody who was invited has this meeting in their day, so everybody
  // who was invited hears that it moved on.
  const words = statusWords(nextStatus);
  await notifyMeetingToGuests({
    organizationId: organizationId,
    meetingTitle: meeting.title,
    attendeeIds: guestsOf(meeting),
    type: nextStatus === "cancelled" ? "removed" : "progress",
    title: words.title,
    message: 'The meeting "' + meeting.title + '" was ' + words.word,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Meeting status updated",
    data: meeting,
  };
}

// PATCH /api/meetings/:id/respond
// An invited employee answers the invitation: accept, decline, or (after the
// meeting) mark themselves as attended.
export async function respondToMeeting(actor: ServiceActor, input: MeetingRespondInput, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const meeting = await repository.findMeetingDocument(ids, organizationId);
  if (!meeting) {
    return {
      status: "not_found",
      message: "Meeting not found",
    };
  }
  // Only an invited employee can answer. The organization does not answer its
  // own invitations, and a person who is not invited has nothing to answer.
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an invited employee can answer an invitation",
    };
  }
  const myLine = meeting.attendees.find((attendee) => String(attendee.employee) === String(me.employee._id));
  if (!myLine) {
    return {
      status: "forbidden",
      message: "You are not invited to this meeting",
    };
  }
  // A cancelled or finished meeting cannot be answered anymore.
  if (meeting.status === "cancelled" || meeting.status === "completed") {
    return {
      status: "invalid",
      message: "This meeting is closed",
    };
  }
  myLine.response = input.response;
  myLine.note = input.note || "";
  myLine.respondedAt = new Date();
  await repository.saveMeeting(meeting);
  // The person who called the meeting is counting heads, so they hear every
  // answer. Nobody else does: twelve other guests do not need it.
  await notifyMeetingAnswered({
    organizationId: organizationId,
    meetingTitle: meeting.title,
    organizerEmployeeId: meeting.organizedByEmployee
      ? String(meeting.organizedByEmployee)
      : null,
    answer: myLine.response === "declined" ? "declined" : "accepted",
    byName: me.employee.name,
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Your answer was saved",
    data: meeting,
  };
}

// PATCH /api/meetings/:id/notes
// Write the minutes of the meeting and its action items. Only the owner of
// the meeting does this.
export async function saveMeetingNotes(actor: ServiceActor, input: MeetingNotesInput, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const meeting = await repository.findMeetingDocument(ids, organizationId);
  if (!meeting) {
    return {
      status: "not_found",
      message: "Meeting not found",
    };
  }
  if (!canManageMeeting(meeting, me)) {
    return {
      status: "forbidden",
      message: "You can write the notes only for the meetings you scheduled",
    };
  }
  meeting.notes = input.notes || "";
  // Replace the whole list of action items with the one the form sent.
  const items = input.actionItems || [];
  meeting.actionItems = items.map((item) => ({
    text: item.text,
    done: item.done === true,
  }));
  await repository.saveMeeting(meeting);
  // The minutes are written for the people who were in the room, so the
  // people who were in the room are told they exist.
  await notifyMeetingToGuests({
    organizationId: organizationId,
    meetingTitle: meeting.title,
    attendeeIds: guestsOf(meeting),
    type: "updated",
    title: "Meeting notes were written",
    message: 'The notes of the meeting "' + meeting.title + '" were saved',
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Meeting notes saved",
    data: meeting,
  };
}

// DELETE /api/meetings/:id
export async function deleteMeeting(actor: ServiceActor, ids: MeetingIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const meeting = await repository.findMeetingDocument(ids, organizationId);
  if (!meeting) {
    return {
      status: "not_found",
      message: "Meeting not found",
    };
  }
  if (!canDeleteMeeting(meeting, me)) {
    return {
      status: "forbidden",
      message: "You can delete only the meetings you scheduled",
    };
  }
  // Read while the meeting still exists: afterwards there is no guest list
  // left to read.
  const guests = guestsOf(meeting);
  const meetingTitle = meeting.title;
  await repository.removeMeeting(meeting);
  await notifyMeetingToGuests({
    organizationId: organizationId,
    meetingTitle: meetingTitle,
    attendeeIds: guests,
    type: "removed",
    title: "A meeting was removed",
    message: 'The meeting "' + meetingTitle + '" was removed',
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Meeting deleted successfully",
  };
}
