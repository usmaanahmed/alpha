import mongoose from "mongoose";

import type { SalaryDocument } from "./salary.types.js";

// Preserve existing type imports used by other modules and seed scripts.
export type { SalaryType, Allowance, SalaryDocument } from "./salary.types.js";

// One allowance line. It keeps its own _id, so React can use it as the key of
// the rows in the form and in the detail dialog.
const allowanceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    // An allowance is money added, never money taken away.
    min: 0,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
});

const salarySchema = new mongoose.Schema(
  {
    // A salary always belongs to one organization. We take this id from the
    // login token, never from the form, so one tenant can never read or
    // change the salaries of another one.
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
    salaryType: {
      type: String,
      enum: ["monthly", "daily", "hourly"],
      required: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    grossSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    netSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    // A salary can have no allowance at all, so this list simply starts empty.
    allowances: {
      type: [allowanceSchema],
      default: [],
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically.
    timestamps: true,
  }
);

// Every employee can have only ONE salary structure.
//
// The service checks this too and answers with a friendly sentence, but
// the index is the real lock: two requests arriving at the very same moment
// cannot both slip through, because the database itself refuses the second
// one.
salarySchema.index({ organization: 1, employee: 1 }, { unique: true });

// The salary list is always read for one organization, newest first.
salarySchema.index({ organization: 1, createdAt: -1 });

export const Salary = mongoose.model<SalaryDocument>("Salary", salarySchema);
