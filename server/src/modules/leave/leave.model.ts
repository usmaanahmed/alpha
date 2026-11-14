import type {
  LeaveRequestStatus,
  LeaveDayStatus,
  LeaveDay,
  LeaveReference,
  LeaveApproval,
  LeaveRequestDocument,
} from "./leave.types.js";

export type { LeaveRequestStatus, LeaveDayStatus, LeaveDay, LeaveReference, LeaveApproval, LeaveRequestDocument } from "./leave.types.js";

import mongoose from "mongoose";
import { attachmentSchema } from "../../types/attachment.schema.js";

// Leave days and references are stored with these schemas. _id: false means
// "these are plain lines inside the request", not documents of their own.
const leaveDaySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["approved", "rejected", "excluded"],
    required: true,
  },
  reason: {
    type: String,
    default: "",
    trim: true,
  },
}, { _id: false });

const leaveReferenceSchema = new mongoose.Schema({
  kind: {
    type: String,
    enum: ["task", "meeting"],
    required: true,
  },
  refId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  at: {
    type: Date,
    default: null,
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
}, { _id: false });

const leaveApprovalSchema = new mongoose.Schema({
  actorEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  actorName: {
    type: String,
    default: "",
    trim: true,
  },
  actorRole: {
    type: String,
    default: "",
    trim: true,
  },
  action: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
  days: {
    type: Number,
    default: 0,
    min: 0,
  },
  references: {
    type: [leaveReferenceSchema],
    default: [],
  },
  at: {
    type: Date,
    required: true,
  },
}, { _id: false });

const leaveRequestSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeaveType",
    required: true,
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  requestedDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  approvedDays: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalDays: {
    type: Number,
    required: true,
    min: 0,
  },
  leaveDays: {
    type: [leaveDaySchema],
    default: [],
  },
  excludeWeekends: {
    type: Boolean,
    default: true,
  },
  excludeHolidays: {
    type: Boolean,
    default: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  // The very same shape a task attachment uses, so a file behaves the same
  // way everywhere in the app.
  documents: {
    type: [attachmentSchema],
    default: [],
  },
  status: {
    type: String,
    enum: [
      "pending",
      "approved",
      "partially_approved",
      "rejected",
      "cancelled",
    ],
    default: "pending",
  },
  approvalHistory: {
    type: [leaveApprovalSchema],
    default: [],
  },
  reviewedByEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewRemarks: {
    type: String,
    default: "",
    trim: true,
  },
}, {
  timestamps: true,
});

// The lists are always read for one organization, and very often
// for one employee, so these two indexes keep those queries fast.
leaveRequestSchema.index({ organization: 1, createdAt: -1 });

leaveRequestSchema.index({ organization: 1, employee: 1, fromDate: -1 });

export const LeaveRequest = mongoose.model<LeaveRequestDocument>("LeaveRequest", leaveRequestSchema);

// The two statuses that mean "these days are really taken".
//
// Every place that asks "is this employee on leave?" must look at both, so
// the list is written once here instead of being repeated everywhere.
export const APPROVED_LEAVE_STATUSES: LeaveRequestStatus[] = [
  "approved",
  "partially_approved",
];
