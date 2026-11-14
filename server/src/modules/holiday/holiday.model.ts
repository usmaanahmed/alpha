import mongoose from "mongoose";

import type { HolidayDocument } from "./holiday.types.js";

// Preserve existing imports of this type from the model file.
export type { HolidayDocument } from "./holiday.types.js";

// Each organization keeps its own holiday list. Attendance and leave
// calculations also use these records when deciding which days to count.
const holidaySchema = new mongoose.Schema(
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
    date: {
      type: Date,
      required: true,
    },
    // Employees may choose whether to take an optional holiday.
    isOptional: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically.
    timestamps: true,
  }
);

// The same organization cannot save two holidays on the same day.
holidaySchema.index({ organization: 1, date: 1 }, { unique: true });

// HolidayDocument tells TypeScript what fields a database record has.
export const Holiday = mongoose.model<HolidayDocument>("Holiday", holidaySchema);
