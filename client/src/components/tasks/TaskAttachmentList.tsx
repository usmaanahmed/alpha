import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentIcon } from "@/components/tasks/AttachmentIcon";
import { PersonInline } from "@/components/common/PersonInline";
import type { TaskAttachment } from "@/types/task.types";
import { formatDateTime } from "@/types/task.types";
import {
  getAttachmentUrl,
  formatFileSize,
  getFileKindLabel,
} from "@/lib/attachment";

// The list of the documents already saved on the server, for a task or
// for one comment.
//
// The name is a link: pressing it opens the file in a new tab, and the
// arrow next to it downloads it instead. A picture also shows a small
// preview, because a name like "task-175318...jpg" says nothing.
//
// canDelete is asked for every file, so the person who sent a file can
// remove it even when they do not own the task.
export function TaskAttachmentList(props: {
  attachments: TaskAttachment[];
  canDelete: (attachment: TaskAttachment) => boolean;
  onDelete?: (attachment: TaskAttachment) => void;
  isDeleting?: boolean;
}) {
  if (props.attachments.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-2">
      {props.attachments.map((attachment) => {
        const fileUrl = getAttachmentUrl(attachment.fileName);
        const isImage = attachment.mimeType.startsWith("image/");

        // The organization account has no employee name and no picture
        // behind it, so it gets the grey circle with its "O".
        const sentByName =
          attachment.uploadedByType === "organization"
            ? "Organization"
            : attachment.uploadedBy?.name || "Employee removed";
        const sentByPhoto =
          attachment.uploadedByType === "organization"
            ? ""
            : attachment.uploadedBy?.photo || "";

        return (
          <li
            key={attachment._id}
            className="flex items-center gap-3 rounded-md border bg-card p-2"
          >
            {isImage ? (
              <a href={fileUrl} target="_blank" rel="noreferrer">
                <img
                  src={fileUrl}
                  alt={attachment.originalName}
                  className="h-10 w-10 rounded border object-cover"
                />
              </a>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                <AttachmentIcon mimeType={attachment.mimeType} />
              </div>
            )}

            <div className="flex min-w-0 flex-col">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium hover:underline"
              >
                {attachment.originalName}
              </a>
              {/* The facts about the file, and inside that same line the
                  picture and the name of the person who sent it. */}
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>
                  {getFileKindLabel(attachment.mimeType)} ·{" "}
                  {formatFileSize(attachment.size)} ·
                </span>
                <PersonInline
                  name={sentByName}
                  photo={sentByPhoto}
                  size="xs"
                  textClassName="text-xs"
                />
                <span>· {formatDateTime(attachment.uploadedAt)}</span>
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1">
              {/* download tells the browser to save the file instead of
                  opening it, and to save it under its real name. */}
              <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                <a href={fileUrl} download={attachment.originalName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>

              {props.onDelete && props.canDelete(attachment) ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  disabled={props.isDeleting}
                  onClick={() => props.onDelete?.(attachment)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
