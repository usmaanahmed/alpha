import { axiosClient } from "./axiosClient";
import type { Task, AssignableEmployee } from "@/types/task.types";

// What the big task form sends to the server.
export interface TaskValues {
  title: string;
  description?: string;
  assignedTo: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "in_review" | "completed" | "cancelled";
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  tags?: string;
  remarks?: string;
}

// What the small "update status" form sends.
export interface TaskStatusValues {
  status: "todo" | "in_progress" | "in_review" | "completed" | "cancelled";
  remarks?: string;
}

// What the "reassign" form sends.
export interface TaskReassignValues {
  assignedTo: string;
  reason: string;
  resetStatus: boolean;
}

// "assigned" = the tasks I received, "created" = the tasks I gave.
// An organization always gets every task of the organization, so for
// the organization pages this value does not change anything.
export type TaskView = "assigned" | "created";

// One single task, for the screens that know an id but do not hold the list.
// The leave approval screen uses it: it lists the tasks that would stall if a
// leave is approved, and pressing one of them opens the task detail dialog.
export async function getTaskRequest(id: string) {
  const response = await axiosClient.get("/tasks/" + id);
  return response.data.data as Task;
}

export async function getTasksRequest(view: TaskView) {
  const response = await axiosClient.get("/tasks", {
    params: { view: view },
  });
  return response.data.data as Task[];
}

// The employees I am allowed to give a task to.
export async function getAssignableEmployeesRequest() {
  const response = await axiosClient.get("/tasks/assignable-employees");
  return response.data.data as AssignableEmployee[];
}

export async function createTaskRequest(values: TaskValues) {
  const response = await axiosClient.post("/tasks", values);
  return response.data;
}

export async function updateTaskRequest(id: string, values: TaskValues) {
  const response = await axiosClient.put("/tasks/" + id, values);
  return response.data;
}

export async function updateTaskStatusRequest(
  id: string,
  values: TaskStatusValues
) {
  const response = await axiosClient.patch("/tasks/" + id + "/status", values);
  return response.data;
}

export async function reassignTaskRequest(
  id: string,
  values: TaskReassignValues
) {
  const response = await axiosClient.patch("/tasks/" + id + "/reassign", values);
  return response.data;
}

export async function deleteTaskRequest(id: string) {
  const response = await axiosClient.delete("/tasks/" + id);
  return response.data;
}

// ---------------------------------------------------------------------------
// The documents of a task
// ---------------------------------------------------------------------------

// A request that carries files cannot be plain JSON, it must be a
// FormData: that is the same thing the browser sends when a normal
// <form> has an <input type="file"> inside it.
//
// Every file is added under the same name "files", and that is how the
// server receives a list instead of one single file.
export async function uploadTaskAttachmentsRequest(id: string, files: File[]) {
  const formData = new FormData();

  files.forEach((file) => formData.append("files", file));

  const response = await axiosClient.post(
    "/tasks/" + id + "/attachments",
    formData
  );
  return response.data;
}

export async function deleteTaskAttachmentRequest(
  taskId: string,
  attachmentId: string
) {
  const response = await axiosClient.delete(
    "/tasks/" + taskId + "/attachments/" + attachmentId
  );
  return response.data;
}
