import type mongoose from "mongoose";

// Document supplies database methods such as save(). The fields below
// describe the department data that our code reads and changes.
// A department belongs to one organization.
// Two different organizations can both have a "Sales" department.
export interface DepartmentDocument extends mongoose.Document {
  name: string;
  description: string;
  organization: mongoose.Types.ObjectId;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

// The validator checks these fields before the controller calls the service.
export interface DepartmentInput {
  name: string;
  description?: string;
  status: "active" | "inactive";
}

// success: the operation finished.
// not_found: the department does not belong to this organization or is missing.
// invalid: a duplicate name, employees, or teams blocked the operation.
// The controller turns these outcomes into HTTP responses.
export interface DepartmentResult {
  status: "success" | "not_found" | "invalid";
  message: string;
  department?: DepartmentDocument;
}
