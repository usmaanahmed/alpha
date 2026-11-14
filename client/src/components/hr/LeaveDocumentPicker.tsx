import { useRef } from "react";
import { Paperclip, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AttachmentIcon } from "@/components/tasks/AttachmentIcon";
import { formatFileSize, shortFileName } from "@/lib/attachment";
import {
  buildAcceptText,
  describeFileKinds,
  checkLeaveDocuments,
} from "@/lib/leaveDocuments";
import type { LeaveType } from "@/types/hr.types";

// The "attach documents" field of the apply form.
//
// Everything it allows comes from the leave type the employee just chose: how
// many files, how big, which kinds, and whether one is needed at all. So the
// same field is a quiet "you may add a paper" for a casual leave and a red
// "a medical certificate is needed" for a sick leave, without this component
// knowing anything about either of them.
//
// Nothing is sent to the server here: the chosen files are given back with
// onChange, and the apply form sends them together with the dates.
export function LeaveDocumentPicker(props: {
  leaveType: LeaveType;
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  // We need the real <input type="file"> to open it from our own button and
  // to reset it afterwards, so we keep a reference to it.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRequired = props.leaveType.documentRequirement === "required";
  // A required document that is still missing. The apply form checks this
  // again before sending; here it is only shown, so the employee knows before
  // pressing the button.
  const isMissing = isRequired && props.files.length === 0;

  function handleFilesChosen(event: React.ChangeEvent<HTMLInputElement>) {
    // event.target.files is not a real array, so we turn it into one.
    const chosen = Array.from(event.target.files || []);

    // The files already chosen stay, the new ones are added after them.
    const allFiles = [...props.files, ...chosen];

    const error = checkLeaveDocuments(props.leaveType, allFiles);

    if (error) {
      toast.error(error);
    } else {
      props.onChange(allFiles);
    }

    // Without this the same file cannot be chosen a second time, because the
    // input would think nothing changed.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeFile(indexToRemove: number) {
    props.onChange(props.files.filter((_file, index) => index !== indexToRemove));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>
        Supporting documents
        <span
          className={
            "ml-2 rounded-full px-2 py-0.5 text-xs font-medium " +
            (isRequired
              ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
              : "bg-slate-500/10 text-slate-700 dark:text-slate-400")
          }
        >
          {isRequired ? "Required" : "Optional"}
        </span>
      </Label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Attach documents
        </Button>

        {/* The rules of this leave type, said in plain words, so nobody has
            to try an upload to find out what is allowed. */}
        <p className="text-xs text-muted-foreground">
          {describeFileKinds(props.leaveType.allowedFileKinds) +
            ". Up to " +
            props.leaveType.maxFiles +
            (props.leaveType.maxFiles === 1 ? " file, " : " files, ") +
            props.leaveType.maxFileSizeMb +
            " MB each."}
        </p>
      </div>

      {isMissing ? (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This leave type needs at least one document.
        </p>
      ) : null}

      {/* The files waiting to be sent. They are still only on the computer of
          the employee, so there is nothing to open yet, only to remove. */}
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
        accept={buildAcceptText(props.leaveType.allowedFileKinds)}
        className="hidden"
        onChange={handleFilesChosen}
      />
    </div>
  );
}
