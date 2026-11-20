import type mongoose from "mongoose";

export interface CreateEmployeeInput {
  employmentType: "full_time" | "part_time" | "intern" | "contract";
  name: string;
  email: string;
  password: string;
  departmentId: string;
  roleId: string;
  status: "active" | "inactive";
  designation?: string;
  qualification?: string;
  joiningDate?: string;
  dateOfBirth?: string;
  gender?: "" | "other" | "male" | "female";
  address?: string;
  exitDate?: string;
  exitReason?: string;
  phone?: string;
}

export interface UpdateEmployeeInput {
  employmentType: "full_time" | "part_time" | "intern" | "contract";
  name: string;
  email: string;
  departmentId: string;
  roleId: string;
  status: "active" | "inactive";
  designation?: string;
  qualification?: string;
  joiningDate?: string;
  dateOfBirth?: string;
  gender?: "" | "other" | "male" | "female";
  address?: string;
  exitDate?: string;
  exitReason?: string;
  phone?: string;
}

export interface ChangeEmployeePasswordInput {
  password: string;
}

export interface EmployeeOptions {
  year?: unknown;
  month?: unknown;
}

export interface EmployeeIds {
  id: string;
}

export interface ActivityEvent {
  // Unique inside this answer, used by React as the key of the line.
  id: string;
  kind: "task" | "meeting" | "leave" | "attendance";
  // What happened, in one or two words: "Finished", "Checked in"...
  action: string;
  // What it happened to: the task title, the meeting title...
  title: string;
  // The moment it happened. The browser turns it into "2 hours ago".
  at: Date;
  // Which record to open when the line is pressed. Empty when the line has
  // nothing to open, because a check in is not a page.
  refId: string;
  // Only a finished task carries this: how many minutes of work it took,
  // added up over every stretch somebody spent on it. Nothing else in the
  // feed is measured that way, so on every other line it is simply missing.
  tookMinutes?: number;
}

export interface HrProfile {
  designation: string;
  qualification: string;
  employmentType: "full_time" | "part_time" | "intern" | "contract";
  joiningDate: Date | null;
  dateOfBirth: Date | null;
  gender: "male" | "female" | "other" | "";
  address: string;
  exitDate: Date | null;
  exitReason: string;
}

// How this person works for the organization.
export type EmploymentType = "full_time" | "part_time" | "intern" | "contract";

export type Gender = "male" | "female" | "other" | "";

// An employee belongs to one organization, to one department of that
// organization, and gets one role that the SaaS owner created.
//
// The fields under "HR profile" are the ones the HR module needs.
// They are all optional, so the employees that already exist in the
// database keep working without any change.
export interface EmployeeDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  organization: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  role: mongoose.Types.ObjectId;
  status: "active" | "inactive";
  // --- HR profile ---
  // The file name of the uploaded picture, for example
  // "employee-1753180000-123456789.jpg". An empty text means no picture.
  photo: string;
  // The job title, like "Senior Developer". This is not the same as role:
  // role decides what the person may do in the app, designation is only text.
  designation: string;
  // The highest education of the person, like "BSc Computer Science".
  qualification: string;
  employmentType: EmploymentType;
  joiningDate: Date | null;
  dateOfBirth: Date | null;
  gender: Gender;
  address: string;
  // Filled when the employee leaves the organization.
  exitDate: Date | null;
  exitReason: string;
  createdAt: Date;
  updatedAt: Date;
}
