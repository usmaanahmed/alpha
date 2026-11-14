import mongoose from "mongoose";
import {
  DEFAULT_LEAVE_FILE_KINDS,
  DEFAULT_LEAVE_FILE_SIZE_MB,
  DEFAULT_LEAVE_FILE_COUNT,
  MAX_LEAVE_FILE_SIZE_MB,
  MAX_LEAVE_FILE_COUNT,
} from "../../config/leaveDocuments.js";

import type { LeaveTypeDocument } from "./leaveType.types.js";

// Preserve existing imports of this type from the model file.
export type { LeaveTypeDocument } from "./leaveType.types.js";

// Each organization offers its own leave types.
const leaveTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    daysPerYear: {
      type: Number,
      required: true,
      min: 0,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    // Existing types skip public holidays unless this setting is changed.
    excludeHolidays: {
      type: Boolean,
      default: true,
    },
    // Document uploads stay disabled until the organization enables them.
    allowDocuments: {
      type: Boolean,
      default: false,
    },
    documentRequirement: {
      type: String,
      enum: ["optional", "required"],
      default: "optional",
    },
    allowedFileKinds: {
      type: [String],
      default: DEFAULT_LEAVE_FILE_KINDS,
    },
    maxFileSizeMb: {
      type: Number,
      default: DEFAULT_LEAVE_FILE_SIZE_MB,
      min: 1,
      max: MAX_LEAVE_FILE_SIZE_MB,
    },
    maxFiles: {
      type: Number,
      default: DEFAULT_LEAVE_FILE_COUNT,
      min: 1,
      max: MAX_LEAVE_FILE_COUNT,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically.
    timestamps: true,
  }
);

// Two leave types of the same organization cannot have the same name.
leaveTypeSchema.index({ organization: 1, name: 1 }, { unique: true });

export const LeaveType = mongoose.model<LeaveTypeDocument>(
  "LeaveType",
  leaveTypeSchema
);
