import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTasksRequest,
  getTaskRequest,
  getAssignableEmployeesRequest,
  createTaskRequest,
  updateTaskRequest,
  updateTaskStatusRequest,
  reassignTaskRequest,
  deleteTaskRequest,
  uploadTaskAttachmentsRequest,
  deleteTaskAttachmentRequest,
} from "@/api/task.api";
import type {
  TaskValues,
  TaskStatusValues,
  TaskReassignValues,
  TaskView,
} from "@/api/task.api";
import { getErrorMessage } from "@/api/axiosClient";

// The tasks I can see. "assigned" and "created" are two different
// lists for a manager, so they also need two different query keys.
//
// enabled is there for the pages that only want this list when the person
// looking at them carries "tasks.view_all" — without that permission the
// server narrows the answer down to their own tasks, which is the right list
// for a task page and the wrong one for an analytics page. Left alone it is
// true, so every page written before this line keeps working as it did.
export function useTasks(view: TaskView, enabled = true) {
  return useQuery({
    queryKey: ["tasks", view],
    queryFn: () => getTasksRequest(view),
    enabled: enabled,
  });
}

// ONE task, read on its own instead of picked out of a list.
//
// id is null when nothing is open, and then the query does not run at all.
// The leave approval screen needs this: it shows the tasks that would stall
// if the leave is approved, and the person looking at them very often does
// not carry "tasks.view_all", so those tasks are in no list they can read.
export function useTask(id: string | null) {
  return useQuery({
    queryKey: ["task", id],
    queryFn: () => getTaskRequest(String(id)),
    enabled: id !== null,
  });
}

// The employees of the "assign to" dropdown.
// enabled: false stops the request for a normal employee, who is not
// allowed to assign anything.
export function useAssignableEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ["assignable-employees"],
    queryFn: getAssignableEmployeesRequest,
    enabled: enabled,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TaskValues) => createTaskRequest(values),
    onSuccess: () => {
      // Both lists may change, so we reload every task query.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: TaskValues }) =>
      updateTaskRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: TaskStatusValues }) =>
      updateTaskStatusRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task status updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Give a task to somebody else. The name of the new person comes back in
// the toast, so the user sees at once that the task really moved.
export function useReassignTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      values: TaskReassignValues;
      newEmployeeName: string;
    }) => reassignTaskRequest(input.id, input.values),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task reassigned to " + input.newEmployeeName);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Add documents to the task itself.
//
// The attachments are part of the task, so reloading the task list is
// enough: the dialog reads its task from that same list and shows the new
// files as soon as the list comes back.
export function useUploadTaskAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { taskId: string; files: File[] }) =>
      uploadTaskAttachmentsRequest(input.taskId, input.files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Files attached");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteTaskAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { taskId: string; attachmentId: string }) =>
      deleteTaskAttachmentRequest(input.taskId, input.attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("File removed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTaskRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
