import type { TaskPerson, TaskAttachment } from "@/types/task.types";

// One message of the discussion under a task.
//
// author is null when the organization account wrote it, because an
// organization is not an employee: in that case the screen writes
// "Organization" instead of a name.
//
// canDelete is not saved in the database, the server adds it to every
// message: it is true for my own messages, and for every message when I
// am the owner of the task.
export interface TaskComment {
  _id: string;
  task: string;
  author: TaskPerson | null;
  authorType: "organization" | "employee";
  message: string;
  attachments: TaskAttachment[];
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}
