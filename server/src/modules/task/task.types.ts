import type mongoose from "mongoose";
import type { AttachmentData } from "../../types/attachment.schema.js";

export interface TaskInput {
  title: string;
  assignedTo: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "cancelled" | "in_progress" | "completed" | "todo" | "in_review";
  description?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string;
  remarks?: string;
}

export interface TaskStatusInput {
  status: "cancelled" | "in_progress" | "completed" | "todo" | "in_review";
  remarks?: string;
}

export interface TaskCommentInput {
  message?: string;
}

export interface TaskReassignInput {
  assignedTo: string;
  reason: string;
  resetStatus?: boolean;
}

export interface TaskOptions {
  view?: unknown;
}

export interface TaskIds {
  id: string;
  attachmentId: string;
}

export interface TaskCommentIds {
  id: string;
  commentId: string;
}

// How urgent the task is.
export type TaskPriority = "low" | "medium" | "high" | "urgent";

// Where the task is right now.
export type TaskStatus = "todo" | "in_progress" | "in_review" | "completed" | "cancelled";

// Who gave the task:
// - "organization" means the organization account created it,
// - "manager" means an EMPLOYEE created it. That employee is a manager or
//   a team lead, and assignedByEmployee says exactly who it was, so we
//   never needed a third value here.
export type TaskAssignerType = "organization" | "manager";

// One line of the assignment timeline.
//
// The first line is written when the task is created, and one more line
// is written every time the task is given to somebody else. So the list
// always answers "who had this task, from when, and why did it move".
export interface AssignmentEntry {
  // The employee who received the task at that moment.
  employee: mongoose.Types.ObjectId;
  // Who made this assignment. It stays null when the organization did it,
  // because an organization account is not an employee.
  byEmployee: mongoose.Types.ObjectId | null;
  byType: TaskAssignerType;
  // Why the task moved. The first line has no reason, because nothing
  // moved yet: the task was simply created.
  reason: string;
  at: Date;
}

// One stretch of real work on a task.
//
// A stretch opens the moment the task is moved to "in progress", and it
// closes the moment the task leaves that status again - finished, cancelled,
// or simply put back on the pile. So a task that is started, stopped and
// started again has two stretches, and the hours in between, when nobody was
// working on it, belong to neither.
//
// endedAt stays null while the work is still running.
export interface WorkSession {
  startedAt: Date;
  endedAt: Date | null;
}

// A task always belongs to one organization and is always given to
// one employee of that same organization.
export interface TaskDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  organization: mongoose.Types.ObjectId;
  // Copied from the employee who receives the task, so we can group
  // and filter tasks by department without a second query.
  department: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  assignedByType: TaskAssignerType;
  // Filled only when a manager created the task.
  assignedByEmployee: mongoose.Types.ObjectId | null;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  estimatedHours: number;
  tags: string[];
  // A short note that the employee writes when changing the status.
  remarks: string;
  // The documents of the task itself: the brief, the design, the file the
  // employee has to work on. The files written inside a comment are not
  // here, they belong to that comment.
  attachments: AttachmentData[];
  // Every person who ever held this task, oldest first.
  assignmentHistory: AssignmentEntry[];
  // Every stretch this task spent in "in progress", oldest first. The time
  // spent on the task is read from this list and nowhere else.
  workSessions: WorkSession[];
  createdAt: Date;
  updatedAt: Date;
}

// One message written under a task.
//
// The comments are their own collection and not a list inside the task,
// because a long discussion would make every task of the list heavy, and
// the task list is read on every page. Here we read the comments only
// when somebody really opens one task.
//
// A comment can carry documents, exactly like the task itself: the
// employee answers "it is done" and puts the finished file with it.
export interface TaskCommentDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  task: mongoose.Types.ObjectId;
  // Kept next to the task so a comment can never be read from another
  // organization, the same way every other collection of the app does it.
  organization: mongoose.Types.ObjectId;
  // The employee who wrote it. It stays null when the organization
  // account wrote it, because an organization is not an employee.
  author: mongoose.Types.ObjectId | null;
  authorType: "organization" | "employee";
  message: string;
  attachments: AttachmentData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDetails {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  organization: mongoose.Types.ObjectId;
  department: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId | {
    _id: mongoose.Types.ObjectId;
  } | null;
  assignedByType: TaskAssignerType;
  assignedByEmployee: mongoose.Types.ObjectId | null;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: Date | null;
  dueDate: Date | null;
  completedAt: Date | null;
  estimatedHours: number;
  tags: string[];
  remarks: string;
  attachments: AttachmentData[];
  assignmentHistory: TaskAssignmentDetails[];
  workSessions: WorkSession[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskAssignmentDetails {
  _id?: mongoose.Types.ObjectId | string;
  employee: mongoose.Types.ObjectId | {
    _id: mongoose.Types.ObjectId;
  } | null;
  byEmployee: mongoose.Types.ObjectId | null;
  byType: TaskAssignerType;
  reason: string;
  at: Date;
}

export interface CommentAuthor {
  _id: mongoose.Types.ObjectId;
  name: string;
  photo?: string;
}
