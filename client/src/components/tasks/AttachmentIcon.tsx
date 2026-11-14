import { FileImage, FileText, FileSpreadsheet, Presentation, File } from "lucide-react";
import { getFileKind } from "@/lib/attachment";

// The little picture in front of a file name.
//
// Every kind of document gets its own icon and its own colour, so a long
// list of files can be read with the eyes only: the green ones are the
// excel files, the red one is the pdf, and so on.
export function AttachmentIcon(props: { mimeType: string; className?: string }) {
  const kind = getFileKind(props.mimeType);
  const className = "h-4 w-4 shrink-0 " + (props.className || "");

  if (kind === "image") {
    return <FileImage className={className + " text-blue-600 dark:text-blue-400"} />;
  }

  if (kind === "pdf") {
    return <FileText className={className + " text-red-600 dark:text-red-400"} />;
  }

  if (kind === "word") {
    return <FileText className={className + " text-sky-700 dark:text-sky-400"} />;
  }

  if (kind === "excel") {
    return (
      <FileSpreadsheet className={className + " text-green-700 dark:text-green-400"} />
    );
  }

  if (kind === "powerpoint") {
    return (
      <Presentation className={className + " text-orange-600 dark:text-orange-400"} />
    );
  }

  return <File className={className + " text-muted-foreground"} />;
}
