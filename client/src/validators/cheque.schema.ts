import { z } from "zod";

// The rules for the "create / edit cheque" form. They match the rules on the
// server, so the same message is shown whether the check runs in the browser
// or on the server.
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
  bankAccount: z.string().trim().max(100, "The bank account is too long"),
  type: z.enum(["received", "issued"]),
  partyType: z.enum(["customer", "vendor", "employee", "other"]),
  partyName: z.string().trim().max(120, "The party name is too long"),
  // The number input gives us a real number (see valueAsNumber in the form),
  // so we check it as a number directly.
  amount: z
    .number()
    .positive("The amount must be more than zero")
    .max(1000000000, "The amount looks too big"),
  issueDate: z.string(),
  chequeDate: z.string(),
  dueDate: z.string(),
  description: z.string().trim().max(1000, "The description is too long"),
  status: z.enum(["draft", "issued", "received"]),
});

export type ChequeFormValues = z.infer<typeof chequeSchema>;

// The "deposit" form.
export const chequeDepositSchema = z.object({
  date: z.string().min(1, "Please choose the deposit date"),
  bank: z.string().trim().max(100, "The bank name is too long"),
  depositedBy: z.string().trim().max(100, "The name is too long"),
  slipNumber: z.string().trim().max(50, "The slip number is too long"),
  remarks: z.string().trim().max(300, "The remarks are too long"),
});

export type ChequeDepositFormValues = z.infer<typeof chequeDepositSchema>;

// The "clearance" form.
export const chequeClearanceSchema = z.object({
  date: z.string().min(1, "Please choose the clearance date"),
  clearedBy: z.string().trim().max(100, "The name is too long"),
  bankReference: z.string().trim().max(100, "The reference is too long"),
  transactionId: z.string().trim().max(100, "The transaction id is too long"),
  remarks: z.string().trim().max(300, "The remarks are too long"),
});

export type ChequeClearanceFormValues = z.infer<typeof chequeClearanceSchema>;

// The "bounce" form.
export const chequeBounceSchema = z.object({
  date: z.string().min(1, "Please choose the bounce date"),
  reason: z
    .string()
    .trim()
    .min(1, "Please write why the cheque bounced")
    .max(300, "The reason is too long"),
  charges: z
    .number()
    .min(0, "The charges cannot be negative")
    .max(1000000, "The charges look too big"),
  actionTaken: z.string().trim().max(300, "The text is too long"),
  rePresentAllowed: z.boolean(),
  rePresentDate: z.string(),
  remarks: z.string().trim().max(300, "The remarks are too long"),
});

export type ChequeBounceFormValues = z.infer<typeof chequeBounceSchema>;

// The "cancel" form.
export const chequeCancelSchema = z.object({
  date: z.string().min(1, "Please choose the cancel date"),
  cancelledBy: z.string().trim().max(100, "The name is too long"),
  reason: z
    .string()
    .trim()
    .min(1, "Please write why the cheque is cancelled")
    .max(300, "The reason is too long"),
});

export type ChequeCancelFormValues = z.infer<typeof chequeCancelSchema>;
