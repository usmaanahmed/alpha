import type mongoose from "mongoose";

// Document supplies database methods such as save().
export interface RoleDocument extends mongoose.Document {
  organization: mongoose.Types.ObjectId;
  name: string;
  description: string;
  permissions: string[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: string[];
  status: "active" | "inactive";
}

// forbidden means an employee tried to grant a permission they do not have.
export interface RoleResult {
  status: "success" | "not_found" | "invalid" | "forbidden";
  message: string;
  role?: RoleDocument;
}

export interface PermissionResult {
  list: string[];
  message: string;
}
