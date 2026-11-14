import type { AttendanceStatus, AttendanceDocument } from "./attendance.types.js";

export type { AttendanceStatus, AttendanceDocument } from "./attendance.types.js";

import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  checkIn: {
    type: Date,
    default: null,
  },
  checkOut: {
    type: Date,
    default: null,
  },
  workedHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  status: {
    type: String,
    enum: ["present", "absent", "half_day", "on_leave", "holiday"],
    default: "present",
  },
  remarks: {
    type: String,
    default: "",
    trim: true,
  },
}, {
  timestamps: true,
});

// This is the important one: one employee can have only one row per day.
// It is what stops a double check in.
attendanceSchema.index({ organization: 1, employee: 1, date: 1 }, { unique: true });

// The HR reads the whole organization for one day, so this helps too.
attendanceSchema.index({ organization: 1, date: -1 });

export const Attendance = mongoose.model<AttendanceDocument>("Attendance", attendanceSchema);
