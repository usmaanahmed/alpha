import type { LeaveBalanceDocument } from "./leave.types.js";

export type { LeaveBalanceDocument } from "./leave.types.js";

import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema({
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
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "LeaveType",
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  allocated: {
    type: Number,
    required: true,
    min: 0,
  },
  used: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

// One employee has exactly one balance row per leave type per year.
leaveBalanceSchema.index({ organization: 1, employee: 1, leaveType: 1, year: 1 }, { unique: true });

export const LeaveBalance = mongoose.model<LeaveBalanceDocument>("LeaveBalance", leaveBalanceSchema);
