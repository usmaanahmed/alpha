import { axiosClient } from "./axiosClient";
import type { TaskComment } from "@/types/comment.types";

// What the "write a comment" form sends: a message, files, or both.
export interface TaskCommentValues {
  message: string;
  files: File[];
}

// The whole discussion of one task, oldest first.
export async function getTaskCommentsRequest(taskId: string) {
  const response = await axiosClient.get("/tasks/" + taskId + "/comments");
  return response.data.data as TaskComment[];
}

// The message and its files travel together in one request, so this is a
// FormData and not JSON: a file cannot be written inside JSON.
//
// The message goes in as normal text, and every file is added under the
// same name "files", which is how the server receives a list of them.
export async function createTaskCommentRequest(
  taskId: string,
  values: TaskCommentValues
) {
  const formData = new FormData();

  formData.append("message", values.message);
  values.files.forEach((file) => formData.append("files", file));

  const response = await axiosClient.post(
    "/tasks/" + taskId + "/comments",
    formData
  );
  return response.data;
}

export async function deleteTaskCommentRequest(
  taskId: string,
  commentId: string
) {
  const response = await axiosClient.delete(
    "/tasks/" + taskId + "/comments/" + commentId
  );
  return response.data;
}
