import { Holiday } from "../modules/holiday/holiday.model.js";
import { Attendance } from "../modules/attendance/attendance.model.js";
import type { LeaveDay } from "../modules/leave/leave.model.js";
import { listDaysBetween, isWeekend, toDayText } from "./date.util.js";

// The one place that answers "how many days does this leave really cost?".
//
// The old version of this module only counted a number. That was enough while
// the rule was always the same, but it is not any more: a leave type can now
// count the holidays, an approver can count the weekends, an approver can say
// yes to only some of the days, and a day whose attendance is already written
// must not be taken twice. Four rules that can each remove a day.
//
// So instead of a number we build a LIST: one line per calendar day, with the
// answer for that day and the reason for it. The number is then simply "how
// many lines say approved", and the employee can always read WHY the other
// lines do not.

// The names of the public holidays between two days, as a map from the text
// "2026-08-14" to the name of that holiday.
//
// An optional holiday is a day the employee MAY work, so it is not a company
// holiday and it stays a normal leave day.
async function readHolidays(
  organizationId: string,
  fromDate: Date,
  toDate: Date
) {
  const holidays = await Holiday.find({
    organization: organizationId,
    date: { $gte: fromDate, $lte: toDate },
    isOptional: false,
  });

  const holidayNames = new Map<string, string>();

  for (const holiday of holidays) {
    holidayNames.set(toDayText(holiday.date), holiday.name);
  }

  return holidayNames;
}

// The days between fromDate and toDate where the attendance of this employee
// is already written, as a map from "2026-08-01" to the status of that row.
//
// A row that already says "on_leave" is skipped: that one was written by this
// very module for an older approval, so it is not a real answer about the day
// and it must not stop the day from being a leave day.
async function readRecordedAttendance(
  organizationId: string,
  employeeId: string,
  fromDate: Date,
  toDate: Date
) {
  const rows = await Attendance.find({
    organization: organizationId,
    employee: employeeId,
    date: { $gte: fromDate, $lte: toDate },
    status: { $ne: "on_leave" },
  });

  const recordedDays = new Map<string, string>();

  for (const row of rows) {
    recordedDays.set(toDayText(row.date), row.status);
  }

  return recordedDays;
}

// The words we show for an attendance status, so the reason of an excluded
// day reads like a sentence and not like a database value.
const ATTENDANCE_WORDS: Record<string, string> = {
  present: "present",
  absent: "absent",
  half_day: "half day",
  holiday: "holiday",
  on_leave: "on leave",
};

// Build the day by day plan of one leave.
//
// The rules are asked in this order, and the FIRST one that answers wins:
//
// 1. the approver did not tick this day        -> rejected
// 2. it is a public holiday, and this leave
//    type excludes the holidays                -> excluded
// 3. it is a Saturday or a Sunday, and the
//    approver excluded the weekends            -> excluded
// 4. the attendance of that day is already
//    written                                   -> excluded
// 5. nothing removed it                        -> approved
//
// Why that order: a rejection is a decision of a person and it beats every
// rule, and after that the cheap calendar rules come before the one that
// needs the attendance, simply because they are easier to explain.
export async function planLeaveDays(input: {
  organizationId: string;
  employeeId: string;
  fromDate: Date;
  toDate: Date;
  // From the leave type.
  excludeHolidays: boolean;
  // Chosen by the approver, and true while the request only waits.
  excludeWeekends: boolean;
  // The days the approver ticked, as texts like "2026-08-03". null means
  // "the approver did not choose, so every day was asked for", which is what
  // we use when the employee applies.
  approvedDates: string[] | null;
  // Should rule 4 be asked? It is only asked when somebody approves. While
  // the request waits, the attendance of those days usually does not exist
  // yet, and showing it in the preview would only confuse.
  useAttendance: boolean;
}): Promise<LeaveDay[]> {
  const holidayNames = await readHolidays(
    input.organizationId,
    input.fromDate,
    input.toDate
  );

  const recordedDays = input.useAttendance
    ? await readRecordedAttendance(
        input.organizationId,
        input.employeeId,
        input.fromDate,
        input.toDate
      )
    : new Map<string, string>();

  const plan: LeaveDay[] = [];

  for (const day of listDaysBetween(input.fromDate, input.toDate)) {
    const dayText = toDayText(day);

    // 1. The approver went through the list and left this day out.
    if (input.approvedDates !== null && !input.approvedDates.includes(dayText)) {
      plan.push({
        date: day,
        status: "rejected",
        reason: "Not approved by the approver",
      });
      continue;
    }

    // 2. A public holiday, and this leave type gives it back.
    const holidayName = holidayNames.get(dayText);

    if (input.excludeHolidays && holidayName) {
      plan.push({
        date: day,
        status: "excluded",
        reason: "Public holiday: " + holidayName,
      });
      continue;
    }

    // 3. A weekend, and the approver said the weekends do not count.
    if (input.excludeWeekends && isWeekend(day)) {
      plan.push({
        date: day,
        status: "excluded",
        reason: "Weekend",
      });
      continue;
    }

    // 4. The attendance of that day is already written, so the day is
    //    already answered and must not be taken from the balance a second
    //    time. This is what makes a leave that is approved late start on the
    //    next day that is still open.
    const attendanceStatus = recordedDays.get(dayText);

    if (attendanceStatus) {
      plan.push({
        date: day,
        status: "excluded",
        reason:
          "Attendance already recorded (" +
          (ATTENDANCE_WORDS[attendanceStatus] || attendanceStatus) +
          ")",
      });
      continue;
    }

    // 5. A real leave day.
    plan.push({ date: day, status: "approved", reason: "" });
  }

  return plan;
}

// How many days of a plan really count.
export function countApprovedDays(plan: LeaveDay[]) {
  return plan.filter((day) => day.status === "approved").length;
}

// The status the whole request gets after an approval.
//
// A day that was EXCLUDED is not a rejection: nobody said no to it, a rule
// simply took it out. So a leave where the approver ticked every day and only
// a holiday fell out is still fully "approved", even when that leaves zero
// days to take from the balance. Only a day a PERSON left out makes the
// request a partial one.
export function statusFromPlan(
  plan: LeaveDay[]
): "approved" | "partially_approved" | "rejected" {
  const approvedCount = plan.filter((day) => day.status === "approved").length;
  const rejectedCount = plan.filter((day) => day.status === "rejected").length;

  // Nobody said no to anything.
  if (rejectedCount === 0) {
    return "approved";
  }

  // The approver went through the list and ticked nothing at all.
  if (approvedCount === 0) {
    return "rejected";
  }

  return "partially_approved";
}
