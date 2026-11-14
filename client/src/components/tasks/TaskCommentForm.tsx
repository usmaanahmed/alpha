import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TaskAttachmentPicker } from "@/components/tasks/TaskAttachmentPicker";
import { useCreateTaskComment } from "@/hooks/useTaskComments";

// The box at the bottom of the discussion: write a message, attach the
// documents you want to send with it, and press the button.
//
// This form has no react-hook-form and no zod, because there is only one
// text and one list of files, and the only rule is "do not send an empty
// message with no file at all".
export function TaskCommentForm(props: { taskId: string }) {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const createComment = useCreateTaskComment();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (cleanMessage === "" && files.length === 0) {
      toast.error("Write a message or attach a file");
      return;
    }

    createComment.mutate(
      {
        taskId: props.taskId,
        values: { message: cleanMessage, files: files },
      },
      {
        // The box is emptied only when the message really arrived, so
        // nothing the user wrote is lost if the request fails.
        onSuccess: () => {
          setMessage("");
          setFiles([]);
        },
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Textarea
        rows={3}
        placeholder="Write a comment about this task..."
        value={message}
        disabled={createComment.isPending}
        onChange={(event) => setMessage(event.target.value)}
      />

      <TaskAttachmentPicker
        files={files}
        onChange={setFiles}
        disabled={createComment.isPending}
      />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={createComment.isPending}>
          {createComment.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send
        </Button>
      </div>
    </form>
  );
}
