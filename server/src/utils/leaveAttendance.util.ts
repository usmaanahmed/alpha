import { Attendance } from "../modules/attendance/attendance.model.js";
import {
  LeaveRequest,
  APPROVED_LEAVE_STATUSES,
} from "../modules/leave/leave.model.js";
import { Holiday } from "../modules/holiday/holiday.model.js";
import { listDaysBetween, isWeekend, toDayText } from "./date.util.js";

// The bridge between the two HR modules: an employee with an approved leave
// must also show up in the attendance as "on leave".
//
// We do not keep that link in two places by hand. Instead this one function
// reads the approved leave requests of a period and writes the matching
// attendance rows, and every route that reads the attendance calls it first.
// So the answer is always right, also for a leave that was approved before
// this feature existed.
//
// Which days become a row: exactly the days the approval marked "approved" in
// leaveDays. That list already knows about the weekends, the holidays, the
// days the approver left out and the days whose attendance was already
// written, so this file does not have to think about any of it any more.

// The days of one leave that really are leave days.
//
// A leave answered by the new approval flow carries its own leaveDays list,
// so we simply read it. A leave that was approved before this feature existed
// has an empty list, and for those we fall back to the rule the app used at
// that time: every day that is not a weekend and not a holiday.
function approvedDaysOf(leave: any, holidayDays: Set<string>) {
  if (leave.leaveDays && leave.leaveDays.length > 0) {
    return leave.leaveDays
      .filter((day: any) => day.status === "approved")
      .map((day: any) => day.date as Date);
  }

  return listDaysBetween(leave.fromDate, leave.toDate).filter(
    (day) => !isWeekend(day) && !holidayDays.has(toDayText(day))
  );
}

export async function syncLeaveAttendance(
  organizationId: string,
  fromDate: Date,
  toDate: Date,
  // Given only when we look at one employee, for example on the page where
  // somebody reads its own month.
  employeeId?: string
) {
  const filter: Record<string, unknown> = {
    organization: organizationId,
    // A partly approved leave is an approved leave too: some of its days were
    // said yes to, and those days belong in the attendance.
    status: { $in: APPROVED_LEAVE_STATUSES },
    // Two periods touch each other when one starts before the other ends.
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  };

  if (employeeId) {
    filter.employee = employeeId;
  }

  const leaves = await LeaveRequest.find(filter).populate("leaveType", "name");

  if (leaves.length === 0) {
    return;
  }

  // The holidays of the period, as a Set of texts like "2026-07-30". Only the
  // old leaves without a leaveDays list still need this.
  const holidays = await Holiday.find({
    organization: organizationId,
    date: { $gte: fromDate, $lte: toDate },
    isOptional: false,
  });

  const holidayDays = new Set(holidays.map((holiday) => toDayText(holiday.date)));

  // The attendance rows that already exist in this period, read once
  // instead of once per day. The key is "employeeId|2026-07-30".
  const existingRows = await Attendance.find({
    organization: organizationId,
    date: { $gte: fromDate, $lte: toDate },
    employee: { $in: leaves.map((leave) => leave.employee) },
  });

  const rowsByKey = new Map<string, (typeof existingRows)[number]>();

  for (const row of existingRows) {
    rowsByKey.set(String(row.employee) + "|" + toDayText(row.date), row);
  }

  for (const leave of leaves) {
    // The leave type is populated above, so it is an object with a name.
    const leaveTypeName = (leave.leaveType as unknown as { name: string })?.name;
    const remarks = leaveTypeName ? "On leave: " + leaveTypeName : "On leave";

    for (const day of approvedDaysOf(leave, holidayDays)) {
      // A leave can start before the period we are looking at and end after
      // it, so we only write the part that is really inside it.
      if (day.getTime() < fromDate.getTime() || day.getTime() > toDate.getTime()) {
        continue;
      }

      const existingRow = rowsByKey.get(
        String(leave.employee) + "|" + toDayText(day)
      );

      if (!existingRow) {
        await Attendance.create({
          organization: organizationId,
          employee: leave.employee,
          department: leave.department,
          date: day,
          checkIn: null,
          checkOut: null,
          workedHours: 0,
          status: "on_leave",
          remarks: remarks,
        });

        continue;
      }

      // The row is already there. We only fix the ones nobody really used:
      // a day with a check in is a day the person worked, and a day the HR
      // wrote by hand as a half day or a holiday was a decision.
      const isFreeToChange =
        !existingRow.checkIn &&
        (existingRow.status === "present" || existingRow.status === "absent");

      if (isFreeToChange) {
        existingRow.status = "on_leave";
        existingRow.remarks = existingRow.remarks || remarks;
        await existingRow.save();
      }
    }
  }
}

// Is this employee on an approved leave on this day?
//
// The attendance routes use it to stop a check in, and the React side uses
// the same answer to grey out the switch of that line.
//
// A leave that covers the day is not enough any more: with a partial approval
// the day itself must have been said yes to. A day the approver left out, or
// a weekend inside a leave, is a normal working day again.
export async function findApprovedLeaveOfDay(
  organizationId: string,
  employeeId: string,
  day: Date
) {
  const leave = await LeaveRequest.findOne({
    organization: organizationId,
    employee: employeeId,
    status: { $in: APPROVED_LEAVE_STATUSES },
    fromDate: { $lte: day },
    toDate: { $gte: day },
  });

  if (!leave) {
    return null;
  }

  // An older leave has no day list, so it still means "the whole period".
  if (leave.leaveDays.length === 0) {
    return leave;
  }

  const dayText = toDayText(day);

  const isLeaveDay = leave.leaveDays.some(
    (leaveDay) =>
      leaveDay.status === "approved" && toDayText(leaveDay.date) === dayText
  );

  return isLeaveDay ? leave : null;
}
