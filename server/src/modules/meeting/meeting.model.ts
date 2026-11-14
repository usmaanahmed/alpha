import type {
  MeetingStatus,
  MeetingType,
  AttendeeResponse,
  MeetingActorType,
  MeetingAttendee,
  MeetingActionItem,
  MeetingStatusEntry,
  MeetingDocument,
} from "./meeting.types.js";

export type { MeetingStatus, MeetingType, AttendeeResponse, MeetingActorType, MeetingAttendee, MeetingActionItem, MeetingStatusEntry, MeetingDocument } from "./meeting.types.js";

import mongoose from "mongoose";

// One invited person. It keeps its own _id so React can use it as the key
// of the attendee list.
const attendeeSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  response: {
    type: String,
    enum: ["invited", "accepted", "declined", "attended"],
    default: "invited",
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
  respondedAt: {
    type: Date,
    default: null,
  },
});

// One action item. It also keeps its own _id for the React list.
const actionItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true,
  },
  done: {
    type: Boolean,
    default: false,
  },
});

// One line of the status history. It keeps its own _id for the React list.
const statusEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed", "cancelled"],
    required: true,
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
  byType: {
    type: String,
    enum: ["organization", "manager"],
    required: true,
  },
  // The manager who made the change, or null when the organization did.
  byEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  at: {
    type: Date,
    default: Date.now,
  },
});

const meetingSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  agenda: {
    type: String,
    default: "",
    trim: true,
  },
  startAt: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
  },
  endAt: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    default: "",
    trim: true,
  },
  meetingType: {
    type: String,
    enum: ["in_person", "online"],
    default: "in_person",
  },
  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed", "cancelled"],
    default: "scheduled",
  },
  organizedByType: {
    type: String,
    enum: ["organization", "manager"],
    required: true,
  },
  organizedByEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  attendees: {
    type: [attendeeSchema],
    default: [],
  },
  notes: {
    type: String,
    default: "",
    trim: true,
  },
  actionItems: {
    type: [actionItemSchema],
    default: [],
  },
  // Oldest first: line 0 is the day the meeting was scheduled, the last
  // line is the status it has right now.
  statusHistory: {
    type: [statusEntrySchema],
    default: [],
  },
}, {
  timestamps: true,
});

// The list is always read for one organization, and both the calendar and
// the "upcoming" panel sort by the start time, so this one index keeps
// those questions fast.
meetingSchema.index({ organization: 1, startAt: -1 });

// The conflict check asks "which meetings of this organization overlap this
// time window?", which reads endAt, so we index that too.
meetingSchema.index({ organization: 1, endAt: 1 });

export const Meeting = mongoose.model<MeetingDocument>("Meeting", meetingSchema);
