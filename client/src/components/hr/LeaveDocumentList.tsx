import { Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttachmentIcon } from "@/components/tasks/AttachmentIcon";
import {
  formatFileSize,
  getFileKindLabel,
} from "@/lib/attachment";
import { getLeaveDocumentUrl } from "@/lib/leaveDocuments";
import { formatDay } from "@/lib/date";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { LeaveDocument } from "@/types/hr.types";

// The papers the employee handed in with a leave request.
//
// It only reads. The team lead sees it before writing its note, the HR sees
// it before deciding, and the history keeps it forever, so the same component
// sits in all three dialogs. Nobody can remove a document here on purpose:
// a paper that was used to decide a leave has to stay next to that decision.
//
// The name is a link that opens the file in a new tab, and the arrow next to
// it downloads it instead. A picture also shows a small preview, because a
// name like "leave-175318...jpg" says nothing.
export function LeaveDocumentList(props: { documents: LeaveDocument[] }) {
  // This list hangs on four different dialogs, so the switch of the SaaS
  // owner is asked here, one time, instead of at every one of them.
  const { hasFeature } = useAuth();

  if (!hasFeature(FEATURES.LEAVES_DOCUMENTS)) {
    return null;
  }

  if (props.documents.length === 0) {
    return null;
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Paperclip className="h-4 w-4" />
        {props.documents.length === 1
          ? "1 supporting document"
          : props.documents.length + " supporting documents"}
      </p>

      <ul className="flex flex-col gap-2">
        {props.documents.map((document) => {
          const fileUrl = getLeaveDocumentUrl(document.fileName);
          const isImage = document.mimeType.startsWith("image/");

          return (
            <li
              key={document._id}
              className="flex min-w-0 items-center gap-3 rounded-md border bg-card p-2"
            >
              {isImage ? (
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  <img
                    src={fileUrl}
                    alt={document.originalName}
                    className="h-10 w-10 rounded border object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                  <AttachmentIcon mimeType={document.mimeType} />
                </div>
              )}

              <div className="flex min-w-0 flex-col">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium hover:underline"
                >
                  {document.originalName}
                </a>
                <span className="text-xs text-muted-foreground">
                  {getFileKindLabel(document.mimeType) +
                    " · " +
                    formatFileSize(document.size) +
                    " · sent on " +
                    formatDay(document.uploadedAt)}
                </span>
              </div>

              {/* download tells the browser to save the file instead of
                  opening it, and to save it under its real name. */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8"
              >
                <a href={fileUrl} download={document.originalName}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
