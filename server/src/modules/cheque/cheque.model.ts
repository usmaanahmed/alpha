import type {
  ChequeType,
  ChequePartyType,
  ChequeStatus,
  ChequeAttachment,
  ChequeStatusEntry,
  DepositInfo,
  ClearanceInfo,
  BounceInfo,
  CancelInfo,
  ChequeDocument,
} from "./cheque.types.js";

export type { ChequeType, ChequePartyType, ChequeStatus, ChequeAttachment, ChequeStatusEntry, DepositInfo, ClearanceInfo, BounceInfo, CancelInfo, ChequeDocument } from "./cheque.types.js";

import mongoose from "mongoose";

// The scan of the cheque. It is its own small schema so it can grow later
// without touching the big cheque schema.
const attachmentSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
}, 
// No _id on this one: there is only ever a single attachment.
{ _id: false });

// One line of the history. It keeps its own _id so React can use it as the
// key of the timeline list.
const statusEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      "draft",
      "issued",
      "received",
      "deposited",
      "cleared",
      "bounced",
      "cancelled",
      "returned",
      "expired",
    ],
    required: true,
  },
  note: {
    type: String,
    default: "",
    trim: true,
  },
  // The organization account that made this change.
  by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  at: {
    type: Date,
    default: Date.now,
  },
});

// The four "management" blocks. Each one is filled only when the cheque
// reaches that step, and stays null before that.
const depositSchema = new mongoose.Schema({
  date: { type: Date, default: null },
  bank: { type: String, default: "", trim: true },
  depositedBy: { type: String, default: "", trim: true },
  slipNumber: { type: String, default: "", trim: true },
  remarks: { type: String, default: "", trim: true },
}, { _id: false });

const clearanceSchema = new mongoose.Schema({
  date: { type: Date, default: null },
  clearedBy: { type: String, default: "", trim: true },
  bankReference: { type: String, default: "", trim: true },
  transactionId: { type: String, default: "", trim: true },
  remarks: { type: String, default: "", trim: true },
}, { _id: false });

const bounceSchema = new mongoose.Schema({
  date: { type: Date, default: null },
  reason: { type: String, default: "", trim: true },
  charges: { type: Number, default: 0, min: 0 },
  actionTaken: { type: String, default: "", trim: true },
  rePresentAllowed: { type: Boolean, default: false },
  rePresentDate: { type: Date, default: null },
  remarks: { type: String, default: "", trim: true },
}, { _id: false });

const cancelSchema = new mongoose.Schema({
  date: { type: Date, default: null },
  cancelledBy: { type: String, default: "", trim: true },
  reason: { type: String, default: "", trim: true },
}, { _id: false });

const chequeSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  chequeNumber: {
    type: String,
    required: true,
    trim: true,
  },
  bank: {
    type: String,
    required: true,
    trim: true,
  },
  bankAccount: {
    type: String,
    default: "",
    trim: true,
  },
  type: {
    type: String,
    enum: ["received", "issued"],
    required: true,
  },
  partyType: {
    type: String,
    enum: ["customer", "vendor", "employee", "other"],
    default: "other",
  },
  partyName: {
    type: String,
    default: "",
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  issueDate: {
    type: Date,
    default: null,
  },
  chequeDate: {
    type: Date,
    default: null,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  status: {
    type: String,
    enum: [
      "draft",
      "issued",
      "received",
      "deposited",
      "cleared",
      "bounced",
      "cancelled",
      "returned",
      "expired",
    ],
    default: "draft",
  },
  // The scan of the paper cheque, or null when none was uploaded.
  attachment: {
    type: attachmentSchema,
    default: null,
  },
  // Oldest first: line 0 is the day the cheque was created, the last line
  // is the status it has right now.
  statusHistory: {
    type: [statusEntrySchema],
    default: [],
  },
  deposit: {
    type: depositSchema,
    default: null,
  },
  clearance: {
    type: clearanceSchema,
    default: null,
  },
  bounce: {
    type: bounceSchema,
    default: null,
  },
  cancel: {
    type: cancelSchema,
    default: null,
  },
}, {
  timestamps: true,
});

// The cheque list is always read for one organization, newest first, and
// the reminders often ask for the due date, so these two indexes keep those
// two questions fast.
chequeSchema.index({ organization: 1, createdAt: -1 });

chequeSchema.index({ organization: 1, dueDate: 1 });

export const Cheque = mongoose.model<ChequeDocument>("Cheque", chequeSchema);
