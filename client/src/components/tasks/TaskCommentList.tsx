import { Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskAttachmentList } from "@/components/tasks/TaskAttachmentList";
import { Avatar } from "@/components/common/Avatar";
import type { TaskComment } from "@/types/comment.types";
import { formatDateTime } from "@/types/task.types";

// The discussion of one task, oldest first, like a chat.
//
// A message can be only text, only documents, or both. The documents of a
// comment cannot be removed one by one: they belong to the message, so
// they go away when the message goes away.
export function TaskCommentList(props: {
  comments: TaskComment[];
  isLoading: boolean;
  onDelete: (comment: TaskComment) => void;
  isDeleting: boolean;
}) {
  if (props.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading comments...</p>;
  }

  if (props.comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-md border border-dashed p-6 text-center">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No comment yet.</p>
        <p className="text-xs text-muted-foreground">
          Write the first message about this task below.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {props.comments.map((comment) => {
        // The organization account has no employee name and no picture
        // behind it, so it gets the grey circle with its "O".
        const authorName =
          comment.authorType === "organization"
            ? "Organization"
            : comment.author?.name || "Employee removed";
        const authorPhoto =
          comment.authorType === "organization"
            ? ""
            : comment.author?.photo || "";

        return (
          <li key={comment._id} className="flex gap-3">
            {/* The picture of the person who wrote the message. */}
            <Avatar name={authorName} photo={authorPhoto} />

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(comment.createdAt)}
                </span>

                {comment.canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-6 w-6 text-destructive"
                    disabled={props.isDeleting}
                    onClick={() => props.onDelete(comment)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                ) : null}
              </div>

              {/* whitespace-pre-line keeps the lines the writer made,
                  so a message written on three lines stays on three. */}
              {comment.message ? (
                <p className="text-sm whitespace-pre-line">{comment.message}</p>
              ) : null}

              {comment.attachments.length > 0 ? (
                <TaskAttachmentList
                  attachments={comment.attachments}
                  // The files of a message are part of that message, so
                  // the only way to remove them is to delete the message.
                  canDelete={() => false}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
