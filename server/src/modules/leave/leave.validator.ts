import { z } from "zod";

// A MongoDB id is always 24 characters like "6650f1c2a4f1b2c3d4e5f6a7".
const objectId = /^[0-9a-fA-F]{24}$/;

// Rules for the "apply for leave" form the employee fills.
//
// The employee never sends totalDays, the server counts it. The form can also
// carry documents, so it arrives as a multipart form and every field below is
// a piece of text: the files themselves are read by uploadLeaveDocuments long
// before this schema sees anything.
export const leaveRequestSchema = z.object({
  leaveType: z.string().regex(objectId, "Please choose a leave type"),
  fromDate: z.string().min(1, "Please choose the first day"),
  toDate: z.string().min(1, "Please choose the last day"),
  reason: z.string().min(5, "Please write a reason of at least 5 characters"),
});

// A day of a leave, as the text an <input type="date"> works with.
const dayText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "A date must look like 2026-08-01");

// Rules for the "approve or reject" form.
//
// The approver sends more than a yes or a no now:
// - approvedDates is the list of days they ticked. Left out it means "all of
//   them", which is the plain "approve everything" answer.
// - excludeWeekends says if the Saturdays and Sundays inside the leave count
//   as leave days.
//
// The server never trusts these two to give the final number: it builds the
// day list itself and counts that, see utils/leaveDays.util.ts.
export const leaveReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  approvedDates: z.array(dayText).optional(),
  excludeWeekends: z.boolean().optional(),
  reviewRemarks: z.string().optional(),
  // The tasks and the meetings the approver pointed at while answering:
  // "you are away, but these still need you".
  //
  // Only the KIND and the ID come from the browser. The title, the date and
  // the priority are read from the database by the server, so a wrong or an
  // invented reference can never end up on the screen of the employee.
  references: z
    .array(z.object({
    kind: z.enum(["task", "meeting"]),
    refId: z.string().regex(objectId, "Invalid reference"),
  }))
    .optional(),
});

// Rules for the note a team lead writes on a request of its own team.
export const leaveRecommendSchema = z.object({
  recommendation: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

// Rules for the two numbers of the leave policy, the ones the warnings on the
// approval screen are measured against.
export const leavePolicySchema = z.object({
  minWorkforcePercent: z.coerce
    .number()
    .min(0, "The minimum workforce cannot be less than 0%")
    .max(100, "The minimum workforce cannot be more than 100%"),
  highConflictPercent: z.coerce
    .number()
    .min(1, "The busy level must be at least 1%")
    .max(100, "The busy level cannot be more than 100%"),
});
