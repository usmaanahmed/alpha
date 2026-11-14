import { z } from "zod";

// Rules for the "add holiday" and "edit holiday" forms.
export const holidaySchema = z.object({
  name: z.string().min(2, "Holiday name must be at least 2 characters"),
  date: z.string().min(1, "Please choose the date of the holiday"),
  isOptional: z.boolean(),
  description: z.string().optional(),
});

export type HolidayFormValues = z.infer<typeof holidaySchema>;

// Rules for the "add leave type" and "edit leave type" forms.
//
// daysPerYear stays a text here, because every input of a form gives text.
// The dialog turns it into a real number before sending it. It is the same
// thing the task form does with estimatedHours.
export const leaveTypeSchema = z.object({
  name: z.string().min(2, "Leave type name must be at least 2 characters"),
  daysPerYear: z
    .string()
    .refine(
      (text) => text !== "" && Number(text) >= 0 && Number(text) <= 365,
      "Days per year must be a number between 0 and 365"
    ),
  isPaid: z.boolean(),
  excludeHolidays: z.boolean(),
  allowDocuments: z.boolean(),
  documentRequirement: z.enum(["optional", "required"]),
  // The kinds of file this leave type takes. The rule only matters when the
  // switch above is on, which is why it is checked with superRefine further
  // down instead of here: a type that accepts no document at all must still
  // be saveable with nothing ticked.
  allowedFileKinds: z.array(z.string()),
  // Both numbers stay text here, because every input of a form gives text.
  // The dialog turns them into real numbers before sending them, the same
  // way it already does with daysPerYear.
  maxFileSizeMb: z
    .string()
    .refine(
      (text) => text !== "" && Number(text) >= 1 && Number(text) <= 25,
      "One file may be between 1 and 25 MB"
    ),
  maxFiles: z
    .string()
    .refine(
      (text) => text !== "" && Number(text) >= 1 && Number(text) <= 5,
      "Between 1 and 5 documents can be allowed"
    ),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
}).superRefine((values, context) => {
  // A leave type that accepts documents but no kind of file would show the
  // employee an upload button that refuses everything, so we stop it here.
  if (values.allowDocuments && values.allowedFileKinds.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Please tick at least one kind of file",
      path: ["allowedFileKinds"],
    });
  }
});

export type LeaveTypeFormValues = z.infer<typeof leaveTypeSchema>;

// Rules for the "apply for leave" form.
// refine runs after the single fields are fine, and lets us compare two of
// them. The message is put on toDate, so it shows under that input.
// The documents are not in this schema: they are files, not something a
// person types, and whether one is needed depends on the leave type that was
// chosen. The dialog keeps them in its own useState and checks them against
// that leave type before sending.
export const leaveApplySchema = z
  .object({
    leaveType: z.string().min(1, "Please choose a leave type"),
    fromDate: z.string().min(1, "Please choose the first day"),
    toDate: z.string().min(1, "Please choose the last day"),
    reason: z.string().min(5, "Please write a reason of at least 5 characters"),
  })
  .refine((values) => values.toDate >= values.fromDate, {
    message: "The last day cannot be before the first day",
    path: ["toDate"],
  });

export type LeaveApplyFormValues = z.infer<typeof leaveApplySchema>;

// Rules for the "approve or reject" form.
//
// approvedDates and excludeWeekends are not in this schema, because they are
// not typed by a person: the dates come from ticking a list and the weekend
// switch is a toggle, so there is nothing a person can write wrong. The
// dialog keeps them in its own useState and sends them next to these two.
export const leaveReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reviewRemarks: z.string().optional(),
});

export type LeaveReviewFormValues = z.infer<typeof leaveReviewSchema>;

// Rules for the note a team lead writes on a request of its own team.
export const leaveRecommendSchema = z.object({
  recommendation: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

export type LeaveRecommendFormValues = z.infer<typeof leaveRecommendSchema>;

// Rules for the two numbers of the leave policy. They stay text here, like
// every other number that comes out of an input, and the card turns them into
// real numbers before sending.
export const leavePolicySchema = z.object({
  minWorkforcePercent: z
    .string()
    .refine(
      (text) => text !== "" && Number(text) >= 0 && Number(text) <= 100,
      "The minimum workforce must be between 0 and 100%"
    ),
  highConflictPercent: z
    .string()
    .refine(
      (text) => text !== "" && Number(text) >= 1 && Number(text) <= 100,
      "The busy level must be between 1 and 100%"
    ),
});

export type LeavePolicyFormValues = z.infer<typeof leavePolicySchema>;

// Rules for the form the HR uses to fix one day by hand.
// The two times come from <input type="time"> and may be left empty.
const timeText = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "The time must look like 09:30")
  .or(z.literal(""));

export const markAttendanceSchema = z.object({
  employee: z.string().min(1, "Please choose an employee"),
  date: z.string().min(1, "Please choose the date"),
  status: z.enum(["present", "absent", "half_day", "on_leave", "holiday"]),
  checkIn: timeText,
  checkOut: timeText,
  remarks: z.string().optional(),
});

export type MarkAttendanceFormValues = z.infer<typeof markAttendanceSchema>;
