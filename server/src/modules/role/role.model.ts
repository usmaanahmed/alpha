import mongoose from "mongoose";

import type { RoleDocument } from "./role.types.js";

// Preserve existing imports of this type from the model file.
export type { RoleDocument } from "./role.types.js";

// Each organization has its own roles and permission lists.
const roleSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
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
    permissions: {
      type: [String],
      default: [],
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

// One role name can be used only one time inside the same organization.
// Two different organizations can both have a role called "Manager".
roleSchema.index({ organization: 1, name: 1 }, { unique: true });

export const Role = mongoose.model<RoleDocument>("Role", roleSchema);
