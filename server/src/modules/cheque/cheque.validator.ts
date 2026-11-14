import { z } from "zod";

// Rules for the "create cheque" and "edit cheque" forms.
//
// The dates come from an <input type="date"> so they arrive as text like
// "2026-07-30". The controller turns them into real dates. amount comes
// from a number input, coerce turns the text "1500" into the number 1500.
export const chequeSchema = z.object({
  chequeNumber: z
    .string()
    .trim()
    .min(1, "Please write the cheque number")
    .max(50, "The cheque number is too long"),
  bank: z
    .string()
    .trim()
    .min(1, "Please write the bank name")
    .max(100, "The bank name is too long"),
  bankAccount: z.string().trim().max(100, "The bank account is too long").optional(),
  type: z.enum(["received", "issued"]),
  partyType: z.enum(["customer", "vendor", "employee", "other"]),
  partyName: z.string().trim().max(120, "The party name is too long").optional(),
  amount: z.coerce
    .number()
    .positive("The amount must be more than zero")
    .max(1000000000, "The amount looks too big"),
  issueDate: z.string().optional(),
  chequeDate: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().trim().max(1000, "The description is too long").optional(),
  // The status the cheque starts in. Only these three make sense when a
  // cheque is first written, everything else is reached later through the
  // management actions.
  status: z.enum(["draft", "issued", "received"]),
});

// Rules for the simple "change status" form (Returned, Expired, or moving a
// draft to Issued/Received). The heavy steps (deposit, clear, bounce,
// cancel) have their own forms below, because they carry extra papers.
export const chequeStatusSchema = z.object({
  status: z.enum([
    "draft",
    "issued",
    "received",
    "deposited",
    "cleared",
    "bounced",
    "cancelled",
    "returned",
    "expired",
  ]),
  note: z.string().trim().max(300, "The note is too long").optional(),
});

// Rules for the "deposit" form.
export const chequeDepositSchema = z.object({
  date: z.string().min(1, "Please choose the deposit date"),
  bank: z.string().trim().max(100, "The bank name is too long").optional(),
  depositedBy: z.string().trim().max(100, "The name is too long").optional(),
  slipNumber: z.string().trim().max(50, "The slip number is too long").optional(),
  remarks: z.string().trim().max(300, "The remarks are too long").optional(),
});

// Rules for the "clearance" form.
export const chequeClearanceSchema = z.object({
  date: z.string().min(1, "Please choose the clearance date"),
  clearedBy: z.string().trim().max(100, "The name is too long").optional(),
  bankReference: z.string().trim().max(100, "The reference is too long").optional(),
  transactionId: z.string().trim().max(100, "The transaction id is too long").optional(),
  remarks: z.string().trim().max(300, "The remarks are too long").optional(),
});

// Rules for the "bounce" form.
export const chequeBounceSchema = z.object({
  date: z.string().min(1, "Please choose the bounce date"),
  reason: z
    .string()
    .trim()
    .min(1, "Please write why the cheque bounced")
    .max(300, "The reason is too long"),
  charges: z.coerce
    .number()
    .min(0, "The charges cannot be negative")
    .max(1000000, "The charges look too big")
    .optional(),
  actionTaken: z.string().trim().max(300, "The text is too long").optional(),
  rePresentAllowed: z.boolean().optional(),
  rePresentDate: z.string().optional(),
  remarks: z.string().trim().max(300, "The remarks are too long").optional(),
});

// Rules for the "cancel" form.
export const chequeCancelSchema = z.object({
  date: z.string().min(1, "Please choose the cancel date"),
  cancelledBy: z.string().trim().max(100, "The name is too long").optional(),
  reason: z
    .string()
    .trim()
    .min(1, "Please write why the cheque is cancelled")
    .max(300, "The reason is too long"),
});
