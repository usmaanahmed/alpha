import type { EmploymentType, Gender, EmployeeDocument } from "./employee.types.js";

export type { EmploymentType, Gender, EmployeeDocument } from "./employee.types.js";

import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    default: "",
    trim: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  // --- HR profile ---
  photo: {
    type: String,
    default: "",
  },
  designation: {
    type: String,
    default: "",
    trim: true,
  },
  qualification: {
    type: String,
    default: "",
    trim: true,
  },
  employmentType: {
    type: String,
    enum: ["full_time", "part_time", "intern", "contract"],
    default: "full_time",
  },
  joiningDate: {
    type: Date,
    default: null,
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  gender: {
    type: String,
    enum: ["male", "female", "other", ""],
    default: "",
  },
  address: {
    type: String,
    default: "",
    trim: true,
  },
  exitDate: {
    type: Date,
    default: null,
  },
  exitReason: {
    type: String,
    default: "",
    trim: true,
  },
}, {
  timestamps: true,
});

// One email can be used only one time inside the same organization.
employeeSchema.index({ organization: 1, email: 1 }, { unique: true });

export const Employee = mongoose.model<EmployeeDocument>("Employee", employeeSchema);
