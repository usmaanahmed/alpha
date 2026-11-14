import type { MeetingGuest, MeetingIds, MeetingInput } from "./meeting.types.js";
import type { MeetingAttendee, MeetingDocument } from "./meeting.model.js";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import { Meeting } from "./meeting.model.js";
import { Employee } from "../employee/employee.model.js";

export async function findEmployees(uniqueIds: string[], organizationId: string) {
  return Employee.find({
    _id: { $in: uniqueIds },
    organization: organizationId,
    status: "active",
  }).select("_id");
}

export async function findOverlappingMeetings(query: Record<string, unknown>) {
  return Meeting.find(query)
    .populate<{ attendees: MeetingGuest[] }>("attendees.employee", "name")
    .sort({ startAt: 1 })
    .lean();
}

export async function findActiveEmployees(organizationId: string) {
  return Employee.find({
    organization: organizationId,
    status: "active",
  })
    .populate("department", "name")
    .populate("role", "name")
    .sort({ name: 1 })
    .lean();
}

export async function findMeetings(filter: Record<string, unknown>) {
  return Meeting.find(filter)
    .populate("organizedByEmployee", "name email photo")
    .populate<{ attendees: MeetingGuest[] }>("attendees.employee", "name email photo")
    .populate("statusHistory.byEmployee", "name email photo")
    .sort({ startAt: -1 })
    .lean();
}

export async function findMeeting(meeting: MeetingDocument) {
  return Meeting.findById(meeting._id)
    .populate("organizedByEmployee", "name email photo")
    .populate<{ attendees: MeetingGuest[] }>("attendees.employee", "name email photo")
    .populate("statusHistory.byEmployee", "name email photo")
    .lean();
}

export async function insertMeeting(
  organizationId: string,
  input: MeetingInput,
  startAt: Date,
  durationMinutes: number,
  endAt: Date,
  me: LoggedInEmployee | null,
  attendees: MeetingAttendee[],
) {
  return Meeting.create({
    organization: organizationId,
    title: input.title,
    agenda: input.agenda || "",
    startAt: startAt,
    durationMinutes: durationMinutes,
    endAt: endAt,
    location: input.location || "",
    meetingType: input.meetingType,
    status: "scheduled",
    organizedByType: me ? "manager" : "organization",
    organizedByEmployee: me ? me.employee._id : null,
    attendees: attendees,
    notes: "",
    actionItems: [],
    // The first line of the history: the meeting was born "scheduled".
    statusHistory: [
      {
        status: "scheduled",
        note: "Meeting scheduled",
        byType: me ? "manager" : "organization",
        byEmployee: me ? me.employee._id : null,
        at: new Date(),
      },
    ],
  });
}

export async function findMeetingDocument(ids: MeetingIds, organizationId: string) {
  return Meeting.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function saveMeeting(meeting: MeetingDocument) {
  return meeting.save();
}

export async function removeMeeting(meeting: MeetingDocument) {
  return Meeting.deleteOne({ _id: meeting._id });
}
