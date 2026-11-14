import mongoose from "mongoose";

import type { DepartmentDocument } from "./department.types.js";

// Keep this export available for any existing imports from the model file.
export type { DepartmentDocument } from "./department.types.js";

// The schema tells MongoDB which fields a department stores.
const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    // This link keeps each department inside its own organization.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
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

// The same department name cannot be used twice inside one organization,
// but another organization can still use it.
departmentSchema.index({ organization: 1, name: 1 }, { unique: true });

// DepartmentDocument describes the returned record for TypeScript.
export const Department = mongoose.model<DepartmentDocument>(
  "Department",
  departmentSchema
);
