import { useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ChequeAttachment } from "@/types/cheque.types";

// The "cheque scan" field of the cheque form.
//
// It holds one file that the user chose but did not send yet. The form keeps
// that file in its own state and uploads it right after the cheque is saved,
// because the scan travels on its own request.
//
// currentScan is the scan already saved on the server (only when editing);
// we show its name so the user knows a scan is already there.
export function ChequeScanInput(props: {
  currentScan: ChequeAttachment | null;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    props.onChange(file);
  }

  function removeChosenFile() {
    props.onChange(null);

    // Without this the same file cannot be chosen a second time, because the
    // input would think nothing changed.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Cheque scan (optional)</Label>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Choose file
        </Button>

        {props.file ? (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-40 truncate">{props.file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={removeChosenFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : props.currentScan ? (
          <span className="text-sm text-muted-foreground">
            Current: {props.currentScan.originalName}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No scan yet</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        JPG, PNG, WEBP or PDF, up to 5 MB. Choosing a new file replaces the
        old scan.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="hidden"
        onChange={handleFileChosen}
      />
    </div>
  );
}
