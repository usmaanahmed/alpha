import type mongoose from "mongoose";

export interface ChequeInput {
  chequeNumber: string;
  bank: string;
  type: "received" | "issued";
  partyType: "employee" | "customer" | "vendor" | "other";
  amount: number;
  status: "received" | "issued" | "draft";
  bankAccount?: string;
  partyName?: string;
  issueDate?: string;
  chequeDate?: string;
  dueDate?: string;
  description?: string;
}

export interface ChequeStatusInput {
  status: "received" | "issued" | "draft" | "deposited" | "cleared" | "bounced" | "cancelled" | "returned" | "expired";
  note?: string;
}

export interface ChequeDepositInput {
  date: string;
  bank?: string;
  depositedBy?: string;
  slipNumber?: string;
  remarks?: string;
}

export interface ChequeClearanceInput {
  date: string;
  clearedBy?: string;
  bankReference?: string;
  transactionId?: string;
  remarks?: string;
}

export interface ChequeBounceInput {
  date: string;
  reason: string;
  charges?: number;
  actionTaken?: string;
  rePresentAllowed?: boolean;
  rePresentDate?: string;
  remarks?: string;
}

export interface ChequeCancelInput {
  date: string;
  reason: string;
  cancelledBy?: string;
}

export interface ChequeIds {
  id: string;
}

// A cheque is either money coming IN or money going OUT:
// - "received" means somebody gave us their cheque, so we expect to be paid,
// - "issued"  means we wrote a cheque to somebody, so we will pay them.
export type ChequeType = "received" | "issued";

// Who the other side of the cheque is. There is no Customer or Vendor table
// in this app yet, so we only keep the KIND of party here and write the
// real name in a free text field next to it.
export type ChequePartyType = "customer" | "vendor" | "employee" | "other";

// The whole life of a cheque, from the day it is written to the day it is
// paid, bounced or cancelled. See the workflow drawing in the controller.
export type ChequeStatus = "draft" | "issued" | "received" | "deposited" | "cleared" | "bounced" | "cancelled" | "returned" | "expired";

// One scanned picture (or PDF) of the paper cheque. A cheque has at most
// one, so unlike the task attachments this is a single object, not a list.
export interface ChequeAttachment {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

// One line of the status history: "the cheque became X on this day, and
// this is the note written at that moment". The user is always the
// organization account, so we keep its id to show its name later.
export interface ChequeStatusEntry {
  status: ChequeStatus;
  note: string;
  by: mongoose.Types.ObjectId;
  at: Date;
}

// The extra papers written when a cheque is DEPOSITED at the bank.
export interface DepositInfo {
  date: Date | null;
  bank: string;
  depositedBy: string;
  slipNumber: string;
  remarks: string;
}

// The extra papers written when the bank CLEARS the cheque (the money moved).
export interface ClearanceInfo {
  date: Date | null;
  clearedBy: string;
  bankReference: string;
  transactionId: string;
  remarks: string;
}

// The extra papers written when the cheque BOUNCES (the bank refused it).
export interface BounceInfo {
  date: Date | null;
  reason: string;
  charges: number;
  actionTaken: string;
  rePresentAllowed: boolean;
  rePresentDate: Date | null;
  remarks: string;
}

// The extra papers written when the cheque is CANCELLED.
export interface CancelInfo {
  date: Date | null;
  cancelledBy: string;
  reason: string;
}

// A cheque always belongs to one organization.
export interface ChequeDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  chequeNumber: string;
  bank: string;
  bankAccount: string;
  type: ChequeType;
  partyType: ChequePartyType;
  partyName: string;
  amount: number;
  issueDate: Date | null;
  chequeDate: Date | null;
  dueDate: Date | null;
  description: string;
  status: ChequeStatus;
  attachment: ChequeAttachment | null;
  statusHistory: ChequeStatusEntry[];
  deposit: DepositInfo | null;
  clearance: ClearanceInfo | null;
  bounce: BounceInfo | null;
  cancel: CancelInfo | null;
  createdAt: Date;
  updatedAt: Date;
}
