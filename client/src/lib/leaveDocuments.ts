import type { LeaveType } from "@/types/hr.types";

// The browser side of the document rules of a leave type.
//
// It is the same table as server/src/config/leaveDocuments.ts, written here
// too so the employee can be told BEFORE the upload that their file is too
// big or of the wrong kind, instead of waiting for the server to say no. The
// server checks all of it again: this side is only for comfort, that side is
// the real rule.

export type LeaveFileKind = "image" | "pdf" | "word" | "excel";

interface FileKindRule {
  // The words next to the checkbox in the leave type form.
  label: string;
  // The short word shown to the employee: "JPG, PNG, WEBP".
  shortLabel: string;
  // What goes in the accept="" of the file input, so the "choose a file"
  // window of the computer already offers only the right files.
  extensions: string;
}

export const LEAVE_FILE_KINDS: Record<LeaveFileKind, FileKindRule> = {
  image: {
    label: "Images (JPG, PNG, WEBP)",
    shortLabel: "images",
    extensions: ".jpg,.jpeg,.png,.webp",
  },
  pdf: {
    label: "PDF",
    shortLabel: "PDF",
    extensions: ".pdf",
  },
  word: {
    label: "Word documents",
    shortLabel: "Word",
    extensions: ".doc,.docx",
  },
  excel: {
    label: "Excel sheets",
    shortLabel: "Excel",
    extensions: ".xls,.xlsx",
  },
};

// The four kinds in the order the form draws them.
export const ALL_LEAVE_FILE_KINDS: LeaveFileKind[] = [
  "image",
  "pdf",
  "word",
  "excel",
];

// The ceilings of the whole app. A leave type may ask for less, never more.
export const MAX_LEAVE_FILE_SIZE_MB = 25;
export const MAX_LEAVE_FILE_COUNT = 5;

// The address of a document, so the browser can open it.
//
// VITE_API_URL points at the api ("/api") and the files
// are not under /api, so we cut that last part away. This is the same thing
// lib/attachment.ts does for the documents of a task.
export function getLeaveDocumentUrl(fileName: string) {
  if (!fileName) {
    return "";
  }

  const apiUrl = import.meta.env.VITE_API_URL || "/api";
  const serverUrl = apiUrl.replace(/\/api\/?$/, "");

  return serverUrl + "/uploads/leaves/" + fileName;
}

// "images or PDF", for the sentence under the upload button.
export function describeFileKinds(kinds: string[]) {
  const labels = kinds
    .map((kind) => LEAVE_FILE_KINDS[kind as LeaveFileKind]?.shortLabel)
    .filter((label) => label);

  if (labels.length === 0) {
    return "no file";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return labels.slice(0, -1).join(", ") + " or " + labels[labels.length - 1];
}

// The accept="" of the file input, built from the kinds this type takes.
export function buildAcceptText(kinds: string[]) {
  return kinds
    .map((kind) => LEAVE_FILE_KINDS[kind as LeaveFileKind]?.extensions)
    .filter((extensions) => extensions)
    .join(",");
}

// Does this file fit the kinds this leave type takes?
//
// Only the extension is asked here, because the browser does not always fill
// file.type: it is empty for some files, and wrong for others. The server
// asks both questions and that is the answer that counts.
function isKindAllowed(kinds: string[], fileName: string) {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

  return kinds.some((kind) =>
    LEAVE_FILE_KINDS[kind as LeaveFileKind]?.extensions.split(",").includes(extension)
  );
}

// Check the files the employee just chose against the rules of the leave type
// they picked. It answers with the message to show, or "" when all is well.
export function checkLeaveDocuments(leaveType: LeaveType, files: File[]) {
  if (files.length > leaveType.maxFiles) {
    return (
      "You can attach at most " +
      leaveType.maxFiles +
      (leaveType.maxFiles === 1 ? " document" : " documents")
    );
  }

  const sizeLimit = leaveType.maxFileSizeMb * 1024 * 1024;

  for (const file of files) {
    if (file.size > sizeLimit) {
      return (
        '"' + file.name + '" is bigger than ' + leaveType.maxFileSizeMb + " MB"
      );
    }

    if (!isKindAllowed(leaveType.allowedFileKinds, file.name)) {
      return (
        '"' +
        file.name +
        '" is not accepted. This leave type takes ' +
        describeFileKinds(leaveType.allowedFileKinds) +
        "."
      );
    }
  }

  return "";
}
