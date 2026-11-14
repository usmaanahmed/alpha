import type { TaskCommentDocument } from "./task.types.js";

export type { TaskCommentDocument } from "./task.types.js";

import mongoose from "mongoose";
import { attachmentSchema } from "../../types/attachment.schema.js";

const taskCommentSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  authorType: {
    type: String,
    enum: ["organization", "employee"],
    required: true,
  },
  // A message can be empty when the comment carries only a document,
  // for example somebody who just sends the signed contract.
  message: {
    type: String,
    default: "",
    trim: true,
  },
  attachments: {
    type: [attachmentSchema],
    default: [],
  },
}, {
  timestamps: true,
});

// The comments are always read for one task, oldest first, so this index
// answers exactly the question the page asks.
taskCommentSchema.index({ task: 1, createdAt: 1 });

export const TaskComment = mongoose.model<TaskCommentDocument>("TaskComment", taskCommentSchema);
