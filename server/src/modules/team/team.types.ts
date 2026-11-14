import type { DepartmentDocument } from "../department/department.types.js";
import type { EmployeeDocument } from "../employee/employee.types.js";
import type mongoose from "mongoose";

export interface TeamInput {
  name: string;
  departmentId: string;
  teamLeadId: string;
  status: "active" | "inactive";
  description?: string;
  memberIds?: string[];
}

export interface TeamMembersInput {
  memberIds: string[];
}

export interface TeamIds {
  id: string;
}

// A team belongs to one organization and to ONE department of that
// organization. One department can have one or many teams, for example
// "Backend" and "Frontend" inside "Engineering", but a team is never
// shared between two departments.
//
// Every team has one team lead and a list of members. The team lead is an
// employee too: it is simply the person who gives the work to the members
// and follows what they do.
export interface TeamDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  organization: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  teamLead: mongoose.Types.ObjectId;
  // The employees under this lead. The lead is never inside this list.
  members: mongoose.Types.ObjectId[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  photo: string;
  designation: string;
  status: string;
}

// A team form after its department, lead and members have been checked.
export interface TeamFormData {
  department: DepartmentDocument;
  teamLead: EmployeeDocument;
  members: mongoose.Types.ObjectId[];
}
