import { useRef } from "react";
import { Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AttachmentIcon } from "@/components/tasks/AttachmentIcon";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  checkChosenFiles,
  formatFileSize,
  shortFileName,
} from "@/lib/attachment";

// The "attach files" button, plus the list of the files the user just
// chose. Nothing is sent to the server here: the chosen files are given
// back with onChange, and the form that owns them decides when to send.
//
// Two places use it: the documents of the task, and the comment form.
export function TaskAttachmentPicker(props: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  // We need the real <input type="file"> to open it from our own button
  // and to reset it afterwards, so we keep a reference to it.
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    // event.target.files is not a real array, so we turn it into one.
    const chosen = Array.from(event.target.files || []);

    // The files already chosen stay, the new ones are added after them.
    const allFiles = [...props.files, ...chosen];

    const error = checkChosenFiles(allFiles);

    if (error) {
      toast.error(error);
    } else {
      props.onChange(allFiles);
    }

    // Without this the same file cannot be chosen a second time, because
    // the input would think nothing changed.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(indexToRemove: number) {
    props.onChange(props.files.filter((_file, index) => index !== indexToRemove));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Attach files
        </Button>

        <p className="text-xs text-muted-foreground">
          Images, PDF, Word, Excel or PowerPoint. Up to {MAX_ATTACHMENTS} files,
          10 MB each.
        </p>
      </div>

      {/* The files waiting to be sent. They are still only on the computer
          of the user, so there is nothing to open yet, only to remove. */}
      {props.files.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {props.files.map((file, index) => (
            <li
              key={file.name + index}
              className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1"
            >
              <AttachmentIcon mimeType={file.type} />

              <span className="text-xs font-medium">
                {shortFileName(file.name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6"
                disabled={props.disabled}
                onClick={() => removeFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* The real file input is hidden, the button above opens it, so the
          look stays the same as the rest of the app. */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        onChange={handleFilesChosen}
      />
    </div>
  );
}
