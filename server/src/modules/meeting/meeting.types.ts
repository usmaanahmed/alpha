import type mongoose from "mongoose";

export interface MeetingInput {
  title: string;
  startAt: string;
  durationMinutes: number;
  meetingType: "in_person" | "online";
  attendees: string[];
  agenda?: string;
  location?: string;
  ignoreConflicts?: boolean;
}

export interface MeetingRescheduleInput {
  startAt: string;
  durationMinutes: number;
  note?: string;
  ignoreConflicts?: boolean;
}

export interface MeetingStatusInput {
  status: "cancelled" | "scheduled" | "in_progress" | "completed";
  note?: string;
}

export interface MeetingRespondInput {
  response: "accepted" | "declined" | "attended";
  note?: string;
}

export interface MeetingNotesInput {
  notes?: string;
  actionItems?: {
    text: string;
    done: boolean;
  }[];
}

export interface MeetingIds {
  id: string;
}

// The life of a meeting, from the day it is scheduled to the day it is
// finished or called off.
//
//   Scheduled ─► In progress ─► Completed
//        │             │
//        └─────────────┴─► Cancelled ─► (re-open) Scheduled
export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

// Where the meeting happens. "in_person" means a real room, "online" means
// a link. The room name or the link is written in the free text "location".
export type MeetingType = "in_person" | "online";

// The answer an invited employee gives to the invitation.
// - "invited"  means they have not answered yet,
// - "accepted" means they will come,
// - "declined" means they will not come,
// - "attended" means the organizer marked them present after the meeting.
export type AttendeeResponse = "invited" | "accepted" | "declined" | "attended";

// Who made a status change: the organization account, or a manager.
export type MeetingActorType = "organization" | "manager";

// One invited person and their answer.
export interface MeetingAttendee {
  employee: mongoose.Types.ObjectId;
  response: AttendeeResponse;
  note: string;
  respondedAt: Date | null;
}

// One thing to do that came out of the meeting. It is a plain to-do, kept
// on the meeting itself, so it is not the same as a Task.
export interface MeetingActionItem {
  text: string;
  done: boolean;
}

// One line of the status history: "the meeting became X on this day, and
// this is the note written at that moment, by this person".
export interface MeetingStatusEntry {
  status: MeetingStatus;
  note: string;
  byType: MeetingActorType;
  byEmployee: mongoose.Types.ObjectId | null;
  at: Date;
}

// A meeting always belongs to one organization.
export interface MeetingDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  title: string;
  agenda: string;
  startAt: Date;
  durationMinutes: number;
  // endAt is worked out from startAt + durationMinutes and saved, so the
  // "does this clash with another meeting?" question stays a simple query.
  endAt: Date;
  location: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  // Who set up the meeting. The organization account has no employee, so
  // organizedByEmployee is null for it.
  organizedByType: MeetingActorType;
  organizedByEmployee: mongoose.Types.ObjectId | null;
  attendees: MeetingAttendee[];
  notes: string;
  actionItems: MeetingActionItem[];
  statusHistory: MeetingStatusEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingGuest {
  employee: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email?: string;
    photo?: string;
  } | null;
  response: AttendeeResponse;
  note: string;
  respondedAt: Date | null;
}

export interface MeetingConflict {
  meetingId: string;
  title: string;
  startAt: Date;
  endAt: Date;
  employees: {
    _id: string;
    name: string;
  }[];
}
