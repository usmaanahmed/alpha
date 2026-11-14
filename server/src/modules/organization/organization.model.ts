import type { OrganizationDocument } from "./organization.types.js";

export type { OrganizationDocument } from "./organization.types.js";

import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    default: "",
    trim: true,
  },
  address: {
    type: String,
    default: "",
    trim: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  // Empty means "this organization has everything the app offers".
  disabledModules: {
    type: [String],
    default: [],
  },
  disabledFeatures: {
    type: [String],
    default: [],
  },
}, {
  // Mongoose will add createdAt and updatedAt automatically.
  timestamps: true,
});

export const Organization = mongoose.model<OrganizationDocument>("Organization", organizationSchema);
