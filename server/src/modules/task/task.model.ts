import type {
  TaskPriority,
  TaskStatus,
  TaskAssignerType,
  AssignmentEntry,
  WorkSession,
  TaskDocument,
} from "./task.types.js";

export type { TaskPriority, TaskStatus, TaskAssignerType, AssignmentEntry, WorkSession, TaskDocument } from "./task.types.js";

import mongoose from "mongoose";
import { attachmentSchema } from "../../types/attachment.schema.js";

// One line of the timeline. It is its own schema so mongoose gives every
// line an _id, which React then uses as the key of the list.
const assignmentEntrySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  byEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  byType: {
    type: String,
    enum: ["organization", "manager"],
    required: true,
  },
  reason: {
    type: String,
    default: "",
    trim: true,
  },
  at: {
    type: Date,
    default: Date.now,
  },
});

// One stretch of work. Like the assignment lines it is its own schema, so
// mongoose gives every stretch an _id of its own.
const workSessionSchema = new mongoose.Schema({
  startedAt: {
    type: Date,
    required: true,
  },
  // null means the stretch is still open: the work is happening right now.
  endedAt: {
    type: Date,
    default: null,
  },
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
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
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  assignedByType: {
    type: String,
    enum: ["organization", "manager"],
    required: true,
  },
  assignedByEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  },
  status: {
    type: String,
    enum: ["todo", "in_progress", "in_review", "completed", "cancelled"],
    default: "todo",
  },
  startDate: {
    type: Date,
    default: null,
  },
  dueDate: {
    type: Date,
    default: null,
  },
  // Filled automatically the moment the status becomes "completed".
  completedAt: {
    type: Date,
    default: null,
  },
  estimatedHours: {
    type: Number,
    default: 0,
    min: 0,
  },
  tags: {
    type: [String],
    default: [],
  },
  remarks: {
    type: String,
    default: "",
    trim: true,
  },
  // The documents of the task, oldest first.
  attachments: {
    type: [attachmentSchema],
    default: [],
  },
  // Oldest first: line 0 is the first assignment, the last line is the
  // person who has the task right now.
  assignmentHistory: {
    type: [assignmentEntrySchema],
    default: [],
  },
  // Oldest first, exactly like the assignment lines above.
  workSessions: {
    type: [workSessionSchema],
    default: [],
  },
}, {
  timestamps: true,
});

// The clock of the task.
//
// Every route that moves a task ends in task.save(), so the clock is kept
// here and not in the controllers. That way no route can forget to start or
// stop it, and a route written next year gets it for free.
//
// The whole rule is one sentence: while the status is "in progress" there is
// an open stretch, and the rest of the time there is not. Writing it as a
// rule instead of as "on this button, do that" is also what makes the trip
// in progress -> to do stop the counting by itself.
taskSchema.pre<TaskDocument>("save", function () {
  const openSession = this.workSessions.find((session) => session.endedAt === null);
  // The work has just begun: open a stretch.
  if (this.status === "in_progress" && !openSession) {
    this.workSessions.push({ startedAt: new Date(), endedAt: null });
  }
  // The work has stopped, whatever it stopped for. Close the stretch, and
  // the counting stops with it until somebody starts the task again.
  if (this.status !== "in_progress" && openSession) {
    openSession.endedAt = new Date();
  }
});

// The task lists are always read for one organization, and very often
// for one employee, so these two indexes keep those queries fast.
taskSchema.index({ organization: 1, createdAt: -1 });

taskSchema.index({ organization: 1, assignedTo: 1 });

export const Task = mongoose.model<TaskDocument>("Task", taskSchema);
