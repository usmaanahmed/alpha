import type mongoose from "mongoose";
import type { AttachmentData } from "../../types/attachment.schema.js";

export interface LeaveRequestInput {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface LeaveReviewInput {
  status: "approved" | "rejected";
  approvedDates?: string[];
  excludeWeekends?: boolean;
  reviewRemarks?: string;
  references?: {
    kind: "task" | "meeting";
    refId: string;
  }[];
}

export interface LeaveRecommendInput {
  recommendation: "approve" | "reject";
  note?: string;
}

export interface LeavePolicyInput {
  minWorkforcePercent: number;
  highConflictPercent: number;
}

export interface LeaveOptions {
  view?: unknown;
  status?: unknown;
  year?: unknown;
}

export interface LeaveIds {
  id: string;
}

// Where the request is right now.
//
// "partially_approved" is used when the approver said yes to only some of the
// days that were asked for. "cancelled" is used when the employee takes its
// own request back.
export type LeaveRequestStatus = "pending" | "approved" | "partially_approved" | "rejected" | "cancelled";

// What happened to ONE single day of the leave.
//
// - "approved" -> this day is a real leave day and it costs the balance.
// - "rejected" -> the approver did not say yes to this day.
// - "excluded" -> nobody said no, the day simply does not count: it is a
//   weekend, a public holiday, or a day the attendance already answered.
//
// The difference matters for the employee reading the history: a rejected
// day is a decision, an excluded day is a rule.
export type LeaveDayStatus = "approved" | "rejected" | "excluded";

// One line of the day by day breakdown of a leave.
export interface LeaveDay {
  date: Date;
  status: LeaveDayStatus;
  // Why the day is not counted, in words the employee can read, for example
  // "Public holiday: Eid" or "Attendance already recorded (present)".
  // An approved day has an empty reason, because there is nothing to explain.
  reason: string;
}

// One task or one meeting that the approver pointed at while answering.
//
// It is a SNAPSHOT and a link at the same time. refId is the link, so the
// employee can open the real task or the real meeting from the leave. The
// title and the rest are copied, so the line still reads correctly in a year,
// when that meeting has been deleted and that task has been renamed twice.
//
// The moment is kept as a real date and never as ready-made text, because a
// meeting at 10:00 is 10:00 where the employee is, and only their own browser
// knows what that is.
export interface LeaveReference {
  kind: "task" | "meeting";
  refId: mongoose.Types.ObjectId;
  title: string;
  // A task keeps its due day here, a meeting its start moment. It stays null
  // for a task with no due date.
  at: Date | null;
  // One short word next to the title: the priority of a task, or whether the
  // meeting is in a room or online.
  note: string;
}

// One line of the approval history.
//
// A leave is answered by more than one person: the team lead writes a
// recommendation, and the HR or the organization makes the final decision.
// Every one of those steps is written here and never changed again, so the
// whole story of a request can be read back later.
export interface LeaveApproval {
  // The employee who did it. It stays null when the organization account did,
  // because an organization is not an employee.
  actorEmployee: mongoose.Types.ObjectId | null;
  // The name is copied on purpose: the history must still read correctly
  // years later, even when that employee has left the company.
  actorName: string;
  // "Employee", "Team lead", "HR / Approver" or "Organization".
  actorRole: string;
  // "applied", "recommended", "not_recommended", "approved",
  // "partially_approved", "rejected" or "cancelled".
  action: string;
  note: string;
  // How many leave days the request counted after this step. It is 0 for the
  // steps that decide nothing, like a team lead note.
  days: number;
  // The work the approver pointed at while writing this step: "you are away,
  // but these three things still need you". Empty on every other step.
  references: LeaveReference[];
  at: Date;
}

// One employee asking for some days off.
//
// The employee fills fromDate, toDate and reason. The server counts the real
// leave days itself and writes one line per day in leaveDays, so the number
// can always be explained instead of only shown.
export interface LeaveRequestDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  // Copied from the employee, so we can filter by department without
  // a second query. This is the same idea as in the task model.
  department: mongoose.Types.ObjectId;
  leaveType: mongoose.Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  // The days the employee asked for, counted on the day they applied. This
  // number is frozen: it is the "Original Requested Duration" of the history.
  requestedDays: number;
  // The days that were really approved. It stays 0 until somebody answers.
  approvedDays: number;
  // The number every other page of the app reads ("this leave costs 3 days").
  // While the request waits it is the requested number, and the moment it is
  // answered it becomes the approved one.
  totalDays: number;
  // One line per calendar day between fromDate and toDate.
  leaveDays: LeaveDay[];
  // Did the approver count the Saturdays and Sundays as leave days?
  // The approver chooses it while answering, and we keep the answer so the
  // history can still show which rule was used.
  excludeWeekends: boolean;
  // Copied from the leave type at the moment of the answer, for the same
  // reason: the leave type can be edited tomorrow, the history cannot.
  excludeHolidays: boolean;
  reason: string;
  // The supporting papers the employee sent with the request, for example a
  // medical certificate. Which files are allowed, and whether one is needed
  // at all, is decided by the leave type. They are never removed, so the team
  // lead, the HR and the audit can still open them years later.
  documents: AttachmentData[];
  status: LeaveRequestStatus;
  // Everything that was ever done to this request, oldest line first.
  approvalHistory: LeaveApproval[];
  // Who made the FINAL decision. It is null while the status is "pending",
  // and it stays null when the organization account answered it.
  reviewedByEmployee: mongoose.Types.ObjectId | null;
  reviewedAt: Date | null;
  reviewRemarks: string;
  createdAt: Date;
  updatedAt: Date;
}

// How many days of one leave type one employee still has, for one year.
//
// There is one row per employee, per leave type, per year. The row is
// created the first time we need it, and it copies daysPerYear of the
// leave type into "allocated".
//
// We do not save "remaining" in the database, because it is always
// allocated - used and saving it twice can only go wrong.
export interface LeaveBalanceDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  leaveType: mongoose.Types.ObjectId;
  // The calendar year, for example 2026.
  year: number;
  // The days this employee got for the whole year.
  allocated: number;
  // The days already taken by approved leaves.
  used: number;
  createdAt: Date;
  updatedAt: Date;
}

// The two numbers an organization sets once, and that the approval screen
// then measures every leave request against.
//
// There is exactly ONE row per organization. It is created the first time
// somebody opens it, with the friendly answers below, so an organization that
// never touches this page still gets sensible warnings.
//
// Why these live in their own little model instead of on the Organization:
// the Organization document belongs to the SaaS owner (it is created and
// edited from the owner pages), while these two numbers belong to the leave
// module and are set by the organization itself. Keeping them apart means the
// leave module never has to reach into somebody else's model.
export interface LeavePolicyDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  // The smallest share of people that must stay AVAILABLE. When approving a
  // leave would push the organization, or the department of that employee,
  // under this number, the approver is warned.
  minWorkforcePercent: number;
  // From how many people away at once a period counts as "busy". It is the
  // softer of the two: it does not say "do not approve", it says "look at
  // this before you do".
  highConflictPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestDetails {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  employee: LeaveEmployee | null;
  department: unknown;
  leaveType: unknown;
  fromDate: Date;
  toDate: Date;
  requestedDays: number;
  approvedDays: number;
  totalDays: number;
  leaveDays: LeaveDay[];
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  reason: string;
  documents: AttachmentData[];
  status: LeaveRequestStatus;
  approvalHistory: LeaveApproval[];
  reviewedByEmployee: unknown;
  reviewedAt: Date | null;
  reviewRemarks: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveEmployee {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  photo: string;
  department?: mongoose.Types.ObjectId;
}
