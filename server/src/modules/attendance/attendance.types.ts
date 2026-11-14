import type mongoose from "mongoose";

export interface MarkAttendanceInput {
  employee: string;
  date: string;
  status: "present" | "absent" | "half_day" | "on_leave" | "holiday";
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
}

export interface AttendanceOptions {
  year?: unknown;
  month?: unknown;
  date?: unknown;
}

// What happened on that day for that employee.
export type AttendanceStatus = "present" | "absent" | "half_day" | "on_leave" | "holiday";

// One row per employee per day. The employee presses "check in" in the
// morning and "check out" in the evening, and the HR can also fix a day
// by hand (for example mark somebody absent).
export interface AttendanceDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  organization: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  // The day itself, always saved as midnight UTC.
  date: Date;
  // The real moment of the check in / check out, with the time.
  checkIn: Date | null;
  checkOut: Date | null;
  // Counted by the server from checkIn and checkOut.
  workedHours: number;
  status: AttendanceStatus;
  remarks: string;
  createdAt: Date;
  updatedAt: Date;
}
