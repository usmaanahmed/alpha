import { z } from "zod";

// Rules for the big task form (used for both create and edit).
//
// estimatedHours stays a text here, because every input of a form gives
// text. The dialog turns it into a real number before sending it.
export const taskSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters"),
  description: z.string().optional(),
  assignedTo: z.string().min(1, "Please choose the employee for this task"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "in_review", "completed", "cancelled"]),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z
    .string()
    .refine(
      (text) => text === "" || (Number(text) >= 0 && Number(text) <= 1000),
      "Estimated hours must be a number between 0 and 1000"
    ),
  tags: z.string().optional(),
  remarks: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

// Rules for the small "update status" form.
export const taskStatusSchema = z.object({
  status: z.enum(["todo", "in_progress", "in_review", "completed", "cancelled"]),
  remarks: z.string().optional(),
});

export type TaskStatusFormValues = z.infer<typeof taskStatusSchema>;

// Rules for the "reassign" form.
//
// The reason is required, not optional: taking a task away from somebody
// and giving it to another person is a decision, and the timeline has to
// be able to say why it happened.
export const taskReassignSchema = z.object({
  assignedTo: z.string().min(1, "Please choose the new employee for this task"),
  reason: z
    .string()
    .trim()
    .min(5, "Please write why this task is being reassigned")
    .max(300, "The reason is too long"),
  resetStatus: z.boolean(),
});

export type TaskReassignFormValues = z.infer<typeof taskReassignSchema>;
