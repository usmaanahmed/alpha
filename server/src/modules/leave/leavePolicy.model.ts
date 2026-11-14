import type { LeavePolicyDocument } from "./leave.types.js";

export type { LeavePolicyDocument } from "./leave.types.js";

import mongoose from "mongoose";

const leavePolicySchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    unique: true,
  },
  minWorkforcePercent: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  highConflictPercent: {
    type: Number,
    default: 30,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

export const LeavePolicy = mongoose.model<LeavePolicyDocument>("LeavePolicy", leavePolicySchema);
