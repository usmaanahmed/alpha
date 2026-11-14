import * as repository from "./attendance.repository.js";
import type { ServiceActor } from "../../types/service.types.js";
import type { AttendanceOptions, MarkAttendanceInput } from "./attendance.types.js";
import { toDayStart, todayStart, isFutureDay } from "../../utils/date.util.js";
import { syncLeaveAttendance, findApprovedLeaveOfDay } from "../../utils/leaveAttendance.util.js";

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// Who may read the attendance of the whole organization, and who may fix a
// day by hand, is decided by the two permissions "attendance.view_all" and
// "attendance.edit" on the routes themselves. A normal employee reaches only
// the routes of its own days: check in, check out and "my attendance".
// How long the employee worked, from the check in to the check out.
// We keep two numbers after the point, so 7.5 means seven hours and a half.
function countWorkedHours(checkIn: Date | null, checkOut: Date | null) {
  if (!checkIn || !checkOut) {
    return 0;
  }
  const milliseconds = checkOut.getTime() - checkIn.getTime();
  if (milliseconds <= 0) {
    return 0;
  }
  const hours = milliseconds / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

// Put the time "09:30" that comes from an <input type="time"> on the day
// we are working with, so we get the real moment "30 July 2026 at 09:30".
// An empty text means "no time" and gives null.
//
// The day itself is saved as midnight UTC, so we read its three parts with
// getUTC..., but we build the moment with the normal Date(...) and not with
// Date.UTC(...). That makes 09:30 mean 09:30 on the clock of this computer,
// which is the same clock an employee checks in with. If we used Date.UTC
// here, a time written by the HR would be shown shifted in the table.
function putTimeOnDay(day: Date, time: string | undefined) {
  if (!time) {
    return null;
  }
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hours, minutes);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// GET /api/attendance/me/today
// The React side asks this to know which button to show:
// "check in", "check out", or "you are done for today".
export async function getMyTodayAttendance(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an employee has an attendance",
    };
  }
  const today = todayStart();
  // An approved leave of today becomes a real "on leave" row here, so the
  // card at the top of the page can say "you are on leave" instead of
  // showing a check in button that would only give an error.
  await syncLeaveAttendance(organizationId, today, today, String(me.employee._id));
  const attendance = await repository.findAttendance(organizationId, me, today);
  // No row yet simply means this person did not check in today.
  return {
    status: "success",
    data: attendance,
  };
}

// POST /api/attendance/check-in
export async function checkIn(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an employee can check in",
    };
  }
  const today = todayStart();
  // The unique index of the model already stops a second row for the same
  // day, but we look first so we can give a friendly message instead of a
  // database error.
  const existingAttendance = await repository.findAttendance(organizationId, me, today);
  if (existingAttendance && existingAttendance.checkIn) {
    return {
      status: "invalid",
      message: "You already checked in today",
    };
  }
  // Somebody on an approved leave must not check in, otherwise the day
  // would be counted both as a leave and as a working day.
  const approvedLeave = await findApprovedLeaveOfDay(organizationId, String(me.employee._id), today);
  if (approvedLeave) {
    return {
      status: "invalid",
      message: "You are on an approved leave today",
    };
  }
  const now = new Date();
  // The HR may have already made the row (for example marked "absent"),
  // so we fill that same row instead of making a second one.
  if (existingAttendance) {
    existingAttendance.checkIn = now;
    existingAttendance.status = "present";
    await repository.saveAttendance(existingAttendance);
    return {
      status: "success",
      message: "Checked in",
      data: existingAttendance,
    };
  }
  const attendance = await repository.insertAttendance(organizationId, me, today, now);
  return {
    status: "success",
    message: "Checked in",
    data: attendance,
  };
}

// POST /api/attendance/check-out
export async function checkOut(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an employee can check out",
    };
  }
  const attendance = await repository.findTodayAttendance(organizationId, me);
  if (!attendance || !attendance.checkIn) {
    return {
      status: "invalid",
      message: "You did not check in today",
    };
  }
  if (attendance.checkOut) {
    return {
      status: "invalid",
      message: "You already checked out today",
    };
  }
  attendance.checkOut = new Date();
  attendance.workedHours = countWorkedHours(attendance.checkIn, attendance.checkOut);
  await repository.saveAttendance(attendance);
  return {
    status: "success",
    message: "Checked out",
    data: attendance,
  };
}

// GET /api/attendance/me?year=2026&month=7
// The employee reads its own days of one month. month is 1 for January.
export async function getMyAttendance(actor: ServiceActor, options: AttendanceOptions) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an employee has an attendance",
    };
  }
  const now = new Date();
  const year = Number(options.year) || now.getUTCFullYear();
  const month = Number(options.month) || now.getUTCMonth() + 1;
  // From the first day of that month up to (but not including) the first
  // day of the next month. Date.UTC(2026, 12, 1) is January 2027 by itself,
  // so December needs no special case.
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfNextMonth = new Date(Date.UTC(year, month, 1));
  // The last day of the month, which is the day before the first day of the
  // next one. The sync wants the two ends of the period, both included.
  const lastDay = new Date(firstDayOfNextMonth);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  // The approved leaves of this month become "on leave" rows before we
  // read them, so the calendar and the table show them like any other day.
  await syncLeaveAttendance(organizationId, firstDay, lastDay, String(me.employee._id));
  const attendances = await repository.findAttendances(organizationId, me, firstDay, firstDayOfNextMonth);
  return {
    status: "success",
    data: attendances,
  };
}

// GET /api/attendance?date=2026-07-30
// The organization and the HR read the whole organization for one day.
// Without a date we use today.
export async function getAttendanceOfDay(actor: ServiceActor, options: AttendanceOptions) {
  const organizationId = String(actor.user?.organizationId);
  const day = toDayStart(options.date as string) || todayStart();
  // Everybody who has an approved leave on this day gets an "on leave" row
  // before we read the day, so the HR sees them in the table with everybody
  // else instead of as "not marked".
  await syncLeaveAttendance(organizationId, day, day);
  const attendances = await repository.findDayAttendance(organizationId, day);
  return {
    status: "success",
    data: attendances,
  };
}

// GET /api/attendance/month?year=2026&month=7
// The whole organization for a whole month, used by the calendar page.
//
// It is the same data as the day route, only for every day of the month at
// once, so the React side can draw one square per day and put the people
// inside it without asking the server thirty times.
export async function getAttendanceOfMonth(actor: ServiceActor, options: AttendanceOptions) {
  const organizationId = String(actor.user?.organizationId);
  const now = new Date();
  const year = Number(options.year) || now.getUTCFullYear();
  const month = Number(options.month) || now.getUTCMonth() + 1;
  // From the first day of that month up to (but not including) the first
  // day of the next month. Date.UTC(2026, 12, 1) is January 2027 by itself,
  // so December needs no special case.
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfNextMonth = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(firstDayOfNextMonth);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  // The approved leaves of the month become real "on leave" rows first,
  // so the calendar shows them like any other day.
  await syncLeaveAttendance(organizationId, firstDay, lastDay);
  const attendances = await repository.findMonthAttendance(organizationId, firstDay, firstDayOfNextMonth);
  // The holidays of the month travel with the answer, because the calendar
  // paints those squares differently and would otherwise need a second
  // request for them.
  const holidays = await repository.findHolidays(organizationId, firstDay, lastDay);
  return {
    status: "success",
    data: {
      attendances: attendances,
      holidays: holidays,
    },
  };
}

// POST /api/attendance/mark
// The HR fixes one day of one employee by hand, for example to mark
// somebody absent or to write the times of a day that was forgotten.
//
// The same route is used to make the row and to change it, because there
// can only ever be one row for that employee on that day.
export async function markAttendance(actor: ServiceActor, input: MarkAttendanceInput) {
  const organizationId = String(actor.user?.organizationId);
  const day = toDayStart(input.date);
  if (!day) {
    return {
      status: "invalid",
      message: "Please choose a valid date",
    };
  }
  if (isFutureDay(day)) {
    return {
      status: "invalid",
      message: "You cannot mark the attendance of a day in the future",
    };
  }
  const employee = await repository.findEmployee(input, organizationId);
  if (!employee) {
    return {
      status: "invalid",
      message: "Please choose an employee of your organization",
    };
  }
  const checkIn = putTimeOnDay(day, input.checkIn);
  const checkOut = putTimeOnDay(day, input.checkOut);
  if (checkIn && checkOut && checkOut.getTime() <= checkIn.getTime()) {
    return {
      status: "invalid",
      message: "The check out time must be after the check in time",
    };
  }
  // The two modules must never say different things about the same day.
  // This employee has an approved leave on it, and those days were already
  // taken from the leave balance, so the day stays "on leave".
  //
  // The only way out is a real check in time: writing one means the HR
  // says this person did come to work after all, and then the day is
  // really a working day again.
  const approvedLeave = await findApprovedLeaveOfDay(organizationId, String(employee._id), day);
  if (approvedLeave && input.status !== "on_leave" && !checkIn) {
    return {
      status: "invalid",
      message: "This employee is on an approved leave on this day, so it can only be saved as 'On leave'. Write a check in time if the person did come to work.",
    };
  }
  const values = {
    organization: organizationId,
    employee: employee._id,
    department: employee.department,
    date: day,
    checkIn: checkIn,
    checkOut: checkOut,
    workedHours: countWorkedHours(checkIn, checkOut),
    status: input.status,
    remarks: input.remarks || "",
  };
  // upsert means "change the row if it is there, otherwise make it".
  // new: true asks mongoose to give us back the row after the change.
  const attendance = await repository.updateAttendance(organizationId, employee, day, values);
  return {
    status: "success",
    message: "Attendance saved successfully",
    data: attendance,
  };
}
