import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTaskCommentsRequest,
  createTaskCommentRequest,
  deleteTaskCommentRequest,
} from "@/api/taskComment.api";
import type { TaskCommentValues } from "@/api/taskComment.api";
import { getErrorMessage } from "@/api/axiosClient";

// The discussion of one task.
//
// Every task has its own discussion, so the id of the task is part of the
// query key: opening another task asks the server for its own comments
// and never shows the messages of the task we just closed.
//
// taskId is null while no task is open, and enabled stops the request in
// that case.
export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => getTaskCommentsRequest(String(taskId)),
    enabled: taskId !== null,
  });
}

export function useCreateTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { taskId: string; values: TaskCommentValues }) =>
      createTaskCommentRequest(input.taskId, input.values),
    onSuccess: (_data, input) => {
      // The discussion has one message more...
      queryClient.invalidateQueries({
        queryKey: ["task-comments", input.taskId],
      });
      // ...and the number next to the speech bubble of the card comes
      // from the task list, so that one has to be reloaded as well.
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteTaskComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { taskId: string; commentId: string }) =>
      deleteTaskCommentRequest(input.taskId, input.commentId),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["task-comments", input.taskId],
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
