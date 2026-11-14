// Everything the screens need to show a document that is attached to a
// task or to a comment: its address, its size and what kind of file it is.

// The same two limits the server uses. They are written here as well so
// the user can be told BEFORE the upload, instead of getting an error
// back from the server after waiting for nothing.
export const MAX_ATTACHMENTS = 5;
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

// What the "choose a file" window offers. It is the same list as the
// server: pictures, pdf, word, excel and powerpoint.
export const ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx";

// The server saves a document as a normal file and gives us back only its
// file name, for example "task-1753180000-123456789.pdf".
//
// To open it in the browser we need the full address of that file:
//   /uploads/tasks/task-...pdf
//
// VITE_API_URL points at the api ("/api") and the
// files are not under /api, so we cut that last part away. This is the
// same thing lib/photo.ts does for the employee pictures.
export function getAttachmentUrl(fileName: string) {
  if (!fileName) {
    return "";
  }

  const apiUrl = import.meta.env.VITE_API_URL || "/api";
  const serverUrl = apiUrl.replace(/\/api\/?$/, "");

  return serverUrl + "/uploads/tasks/" + fileName;
}

// The size in bytes is a huge number like 1536000, and nobody reads that.
// We turn it into "1.5 MB".
export function formatFileSize(bytes: number) {
  if (!bytes) {
    return "0 KB";
  }

  if (bytes < 1024 * 1024) {
    return Math.round(bytes / 1024) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// The kind of a file, read from its mimeType. The list and the icons all
// ask this one question, so the words stay the same everywhere.
export type FileKind = "image" | "pdf" | "word" | "excel" | "powerpoint" | "other";

export function getFileKind(mimeType: string): FileKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  // The old Office files and the new ones have different mime types, but
  // they all carry the name of the program inside, so one includes() is
  // enough for both.
  if (mimeType.includes("word")) {
    return "word";
  }

  if (
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    mimeType === "text/csv"
  ) {
    return "excel";
  }

  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) {
    return "powerpoint";
  }

  return "other";
}

// The short word shown under the file name.
export function getFileKindLabel(mimeType: string) {
  const kind = getFileKind(mimeType);

  if (kind === "image") return "Image";
  if (kind === "pdf") return "PDF";
  if (kind === "word") return "Word";
  if (kind === "excel") return "Excel";
  if (kind === "powerpoint") return "PowerPoint";
  return "File";
}

// A very long name would break the line of the list, so we cut the middle
// of it and keep the end, because the end says what the file is:
// "quarterly-report-of-the-whole-year.xlsx" -> "quarterly-repo....xlsx"
export function shortFileName(name: string, maxLength = 28) {
  if (name.length <= maxLength) {
    return name;
  }

  const extension = name.slice(name.lastIndexOf("."));
  return name.slice(0, maxLength - extension.length - 3) + "..." + extension;
}

// Check the files the user just chose, before sending anything.
// It answers with the error message to show, or "" when all is well.
export function checkChosenFiles(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    return "You can attach at most " + MAX_ATTACHMENTS + " files";
  }

  const tooBig = files.find((file) => file.size > MAX_ATTACHMENT_SIZE);

  if (tooBig) {
    return '"' + tooBig.name + '" is bigger than 10 MB';
  }

  return "";
}
