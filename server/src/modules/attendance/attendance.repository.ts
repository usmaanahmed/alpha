import mongoose from "mongoose";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import type { MarkAttendanceInput } from "./attendance.types.js";
import { Attendance } from "./attendance.model.js";
import { Employee } from "../employee/employee.model.js";
import { Holiday } from "../holiday/holiday.model.js";
import { todayStart } from "../../utils/date.util.js";
import type { AttendanceDocument } from "./attendance.model.js";
import type { EmployeeDocument } from "../employee/employee.model.js";

export async function findAttendance(organizationId: string, me: LoggedInEmployee, today: Date) {
  return Attendance.findOne({
    organization: organizationId,
    employee: me.employee._id,
    date: today,
  });
}

export async function insertAttendance(organizationId: string, me: LoggedInEmployee, today: Date, now: Date) {
  return Attendance.create({
    organization: organizationId,
    employee: me.employee._id,
    department: me.employee.department,
    date: today,
    checkIn: now,
    checkOut: null,
    workedHours: 0,
    status: "present",
  });
}

export async function findTodayAttendance(organizationId: string, me: LoggedInEmployee) {
  return Attendance.findOne({
    organization: organizationId,
    employee: me.employee._id,
    date: todayStart(),
  });
}

export async function saveAttendance(attendance: AttendanceDocument) {
  return attendance.save();
}

export async function findAttendances(
  organizationId: string,
  me: LoggedInEmployee,
  firstDay: Date,
  firstDayOfNextMonth: Date,
) {
  return Attendance.find({
    organization: organizationId,
    employee: me.employee._id,
    date: { $gte: firstDay, $lt: firstDayOfNextMonth },
  }).sort({ date: -1 });
}

export async function findDayAttendance(organizationId: string, day: Date) {
  return Attendance.find({
    organization: organizationId,
    date: day,
  })
    .populate("employee", "name email photo designation")
    .populate("department", "name")
    .sort({ createdAt: 1 });
}

export async function findMonthAttendance(organizationId: string, firstDay: Date, firstDayOfNextMonth: Date) {
  return Attendance.find({
    organization: organizationId,
    date: { $gte: firstDay, $lt: firstDayOfNextMonth },
  })
    .populate("employee", "name email photo designation")
    .populate("department", "name")
    .sort({ date: 1 });
}

export async function findHolidays(organizationId: string, firstDay: Date, lastDay: Date) {
  return Holiday.find({
    organization: organizationId,
    date: { $gte: firstDay, $lte: lastDay },
  }).sort({ date: 1 });
}

export async function findEmployee(input: MarkAttendanceInput, organizationId: string) {
  return Employee.findOne({
    _id: input.employee,
    organization: organizationId,
  });
}

export async function updateAttendance(
  organizationId: string,
  employee: EmployeeDocument,
  day: Date,
  values: {
  organization: string;
  employee: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  workedHours: number;
  status: "present" | "absent" | "half_day" | "on_leave" | "holiday";
  remarks: string;
},
) {
  return Attendance.findOneAndUpdate({
    organization: organizationId,
    employee: employee._id,
    date: day,
  }, values, { upsert: true, new: true });
}
