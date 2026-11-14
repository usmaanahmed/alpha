import type mongoose from "mongoose";

// A leave type defines the yearly allowance and document rules.
// Document provides database methods such as save().
export interface LeaveTypeDocument extends mongoose.Document {
  name: string;
  organization: mongoose.Types.ObjectId;
  daysPerYear: number;
  isPaid: boolean;
  // true means public holidays do not use up leave days.
  excludeHolidays: boolean;
  allowDocuments: boolean;
  documentRequirement: "optional" | "required";
  allowedFileKinds: string[];
  maxFileSizeMb: number;
  maxFiles: number;
  description: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// Validated form fields. Optional document settings receive validator defaults.
export interface LeaveTypeInput {
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  excludeHolidays: boolean;
  allowDocuments: boolean;
  documentRequirement: "optional" | "required";
  allowedFileKinds: string[];
  maxFileSizeMb: number;
  maxFiles: number;
  description?: string;
  status: "active" | "inactive";
}

// The controller turns these outcomes into HTTP responses.
export interface LeaveTypeResult {
  status: "success" | "not_found" | "invalid";
  message: string;
  leaveType?: LeaveTypeDocument;
}
