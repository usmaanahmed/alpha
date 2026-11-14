// The rules about the documents an employee may attach to a leave request.
//
// Every organization asks for different papers: one wants a medical
// certificate as a PDF, another accepts a photo of it, a third asks for
// nothing at all. So the rules are not written once for the whole app, they
// are part of the LEAVE TYPE, and this file only says which answers exist and
// what each of them means.
//
// A person choosing "images" should not have to know what
// "image/webp" is, so the form works with four plain KINDS and this file
// turns a kind into the real mime types and file extensions behind it.

export type LeaveFileKind = "image" | "pdf" | "word" | "excel";

interface FileKindRule {
  // The words shown next to the checkbox in the leave type form.
  label: string;
  // What the browser really sends. The same kind of file has more than one
  // name: the old Office files (.doc, .xls) and the new ones (.docx, .xlsx)
  // are written differently, so both names have to be here.
  mimeTypes: string[];
  extensions: string[];
}

export const LEAVE_FILE_KINDS: Record<LeaveFileKind, FileKindRule> = {
  image: {
    label: "Images (JPG, PNG, WEBP)",
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
  },
  pdf: {
    label: "PDF",
    mimeTypes: ["application/pdf"],
    extensions: [".pdf"],
  },
  word: {
    label: "Word documents",
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    extensions: [".doc", ".docx"],
  },
  excel: {
    label: "Excel sheets",
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    extensions: [".xls", ".xlsx"],
  },
};

// The four kinds as a plain list, used by the form and by the validator.
export const ALL_LEAVE_FILE_KINDS: LeaveFileKind[] = [
  "image",
  "pdf",
  "word",
  "excel",
];

// What a brand new leave type starts with when the switch is turned on:
// a medical certificate is almost always a photo or a PDF.
export const DEFAULT_LEAVE_FILE_KINDS: LeaveFileKind[] = ["image", "pdf"];
export const DEFAULT_LEAVE_FILE_SIZE_MB = 5;
export const DEFAULT_LEAVE_FILE_COUNT = 3;

// The ceilings nobody can go over, whatever they type in the form.
//
// They are also the limits multer itself uses, because multer runs BEFORE we
// know which leave type the request is for: it accepts anything inside these
// ceilings and writes it to the disk, and the controller then measures the
// files against the real rules of that leave type and throws away what does
// not fit. See createLeaveRequest.
export const MAX_LEAVE_FILE_SIZE_MB = 25;
export const MAX_LEAVE_FILE_COUNT = 5;

// Is this file one of the kinds this leave type accepts?
//
// Both the extension and the mime type are asked, because neither one alone
// is enough: some browsers send "application/octet-stream" (which means "I do
// not know what this is") for a .docx, and an extension on its own is only a
// piece of the file name that anybody can type.
export function isFileKindAllowed(
  kinds: string[],
  fileName: string,
  mimeType: string
) {
  const extension = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();

  for (const kind of kinds) {
    const rule = LEAVE_FILE_KINDS[kind as LeaveFileKind];

    if (!rule) {
      continue;
    }

    const extensionFits = rule.extensions.includes(extension);
    const typeFits =
      rule.mimeTypes.includes(mimeType) ||
      mimeType === "application/octet-stream";

    if (extensionFits && typeFits) {
      return true;
    }
  }

  return false;
}

// "Images (JPG, PNG, WEBP) or PDF", for the error message the employee reads.
export function describeFileKinds(kinds: string[]) {
  const labels = kinds
    .map((kind) => LEAVE_FILE_KINDS[kind as LeaveFileKind]?.label)
    .filter((label) => label);

  if (labels.length === 0) {
    return "no file type";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  return labels.slice(0, -1).join(", ") + " or " + labels[labels.length - 1];
}

// Every extension of every kind, which is what multer accepts before the
// controller narrows it down to the rules of one leave type.
export const ALL_LEAVE_FILE_EXTENSIONS = ALL_LEAVE_FILE_KINDS.flatMap(
  (kind) => LEAVE_FILE_KINDS[kind].extensions
);

export const ALL_LEAVE_FILE_MIME_TYPES = ALL_LEAVE_FILE_KINDS.flatMap(
  (kind) => LEAVE_FILE_KINDS[kind].mimeTypes
);
