import { z } from "zod";

// Rules for the "create task" and "edit task" forms.
//
// The dates come from a <input type="date"> so they arrive as text
// like "2026-07-30". The controller turns them into real dates.
// tags arrive as one text like "urgent, client" and the service
// cuts that text on every comma.
export const taskSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters"),
  description: z.string().optional(),
  // A MongoDB id is always 24 characters like "6650f1c2a4f1b2c3d4e5f6a7".
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Please choose the employee for this task"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "in_review", "completed", "cancelled"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  // coerce turns the text "5" that comes from the number input into 5.
  estimatedHours: z.coerce
    .number()
    .min(0, "Estimated hours cannot be negative")
    .max(1000, "Estimated hours looks too big")
    .optional(),
  tags: z.string().optional(),
  remarks: z.string().optional(),
});

// Rules for the small "update status" form.
// The employee who received the task uses only this one.
export const taskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "in_review", "completed", "cancelled"]),
  remarks: z.string().optional(),
});

// Rules for one comment written under a task.
//
// The message is optional because a comment can carry only a document,
// for example somebody who just sends the signed contract. The controller
// is the one that refuses a comment with no text AND no file, because the
// files are not in req.body, they are in req.files.
export const taskCommentSchema = z.object({
  message: z.string().trim().max(2000, "The comment is too long").optional(),
});

// Rules for the "reassign" form.
//
// The reason is required on purpose: giving a task to somebody else takes
// it away from the person who had it, and the timeline has to say why.
export const taskReassignSchema = z.object({
  assignedTo: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, "Please choose the new employee for this task"),
  reason: z
    .string()
    .trim()
    .min(5, "Please write why this task is being reassigned")
    .max(300, "The reason is too long"),
  // true means "the new person starts from zero", so the status goes back
  // to "To do".
  resetStatus: z.boolean().optional(),
});
