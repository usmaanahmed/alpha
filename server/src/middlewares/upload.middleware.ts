import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import type { Request, Response, NextFunction } from "express";
import {
  ALL_LEAVE_FILE_EXTENSIONS,
  ALL_LEAVE_FILE_MIME_TYPES,
  MAX_LEAVE_FILE_SIZE_MB,
  MAX_LEAVE_FILE_COUNT,
} from "../config/leaveDocuments.js";

// Where the uploaded files are saved on the disk.
// It is a normal folder inside the server project: server/uploads/employees
export const UPLOAD_FOLDER = path.join(process.cwd(), "uploads");
const EMPLOYEE_PHOTO_FOLDER = path.join(UPLOAD_FOLDER, "employees");
// The documents attached to a task or to a comment of a task.
const TASK_FILE_FOLDER = path.join(UPLOAD_FOLDER, "tasks");
// The scanned picture (or PDF) of a cheque.
const CHEQUE_FILE_FOLDER = path.join(UPLOAD_FOLDER, "cheques");
// The papers attached to a leave request, for example a medical certificate.
const LEAVE_FILE_FOLDER = path.join(UPLOAD_FOLDER, "leaves");

// The folders must exist before multer tries to write inside them,
// so we create them one time when the server starts.
fs.mkdirSync(EMPLOYEE_PHOTO_FOLDER, { recursive: true });
fs.mkdirSync(TASK_FILE_FOLDER, { recursive: true });
fs.mkdirSync(CHEQUE_FILE_FOLDER, { recursive: true });
fs.mkdirSync(LEAVE_FILE_FOLDER, { recursive: true });

// Only these three picture types are allowed.
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// diskStorage tells multer where to put the file and how to name it.
const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, EMPLOYEE_PHOTO_FOLDER);
  },
  filename: (req, file, callback) => {
    // Two employees can both upload "photo.jpg", so we build our own
    // name that can never repeat: employee-<time>-<random>.jpg
    const extension = path.extname(file.originalname).toLowerCase();
    const randomPart = Math.round(Math.random() * 1000000000);
    callback(null, "employee-" + Date.now() + "-" + randomPart + extension);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    // 2 MB. A bigger file is refused by multer itself.
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return callback(new Error("Only JPG, PNG and WEBP pictures are allowed"));
    }
    callback(null, true);
  },
});

// This is the middleware we put on the employee routes.
// "photo" is the name of the field the React form sends.
//
// We wrap it ourselves so a multer error (too big, wrong type) comes back
// as the same { success, message } answer as every other error of the app,
// instead of crashing into the general error handler.
export function uploadEmployeePhoto(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single("photo")(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "The picture is too big, please use a file under 2 MB"
          : error.message;

      return res.status(400).json({
        success: false,
        message: message,
      });
    }

    next();
  });
}

// Delete an old picture from the disk, for example when the employee
// uploads a new one or when the employee is deleted.
// If the file is already gone we simply do nothing.
export function deleteEmployeePhoto(fileName: string) {
  if (!fileName) {
    return;
  }

  const filePath = path.join(EMPLOYEE_PHOTO_FOLDER, path.basename(fileName));

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    // The file was not there. That is not a problem for us.
  }
}

// ---------------------------------------------------------------------------
// The documents of a task and of a comment
// ---------------------------------------------------------------------------

// The kinds of document a task accepts: pictures, pdf, word, excel and
// powerpoint. A file that is not in this list is refused, so nobody can
// upload a program or a script to our server.
//
// The same file type has more than one name: the old Office files
// (.doc, .xls, .ppt) and the new ones (.docx, .xlsx, .pptx) are written
// differently by the browser, so both names have to be here.
const ALLOWED_TASK_FILE_TYPES = [
  // Pictures
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // PDF
  "application/pdf",
  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Excel (a .csv file is a small excel file for us)
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

// The same list written as file extensions.
//
// We need both lists because the mimetype does not always arrive: some
// browsers, and some tools, send "application/octet-stream" (which means
// "I do not know what this is") for a .xlsx or a .pptx. So a file is
// accepted when its extension is one of these AND its mimetype is either
// a known good one or that "I do not know" one.
const ALLOWED_TASK_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".csv",
  ".ppt",
  ".pptx",
];

// How many files one message can carry, and how big one file can be.
// The React side shows these same two numbers to the user.
export const MAX_TASK_FILES = 5;
const MAX_TASK_FILE_SIZE = 10 * 1024 * 1024;

const taskFileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, TASK_FILE_FOLDER);
  },
  filename: (req, file, callback) => {
    // Two people can both upload "report.pdf", so we build our own name
    // that can never repeat: task-<time>-<random>.pdf
    const extension = path.extname(file.originalname).toLowerCase();
    const randomPart = Math.round(Math.random() * 1000000000);
    callback(null, "task-" + Date.now() + "-" + randomPart + extension);
  },
});

const taskUpload = multer({
  storage: taskFileStorage,
  limits: {
    fileSize: MAX_TASK_FILE_SIZE,
    files: MAX_TASK_FILES,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const extensionIsAllowed = ALLOWED_TASK_FILE_EXTENSIONS.includes(extension);
    const typeIsAllowed =
      ALLOWED_TASK_FILE_TYPES.includes(file.mimetype) ||
      file.mimetype === "application/octet-stream";

    if (!extensionIsAllowed || !typeIsAllowed) {
      return callback(
        new Error(
          "Only images, PDF, Word, Excel and PowerPoint files are allowed"
        )
      );
    }

    callback(null, true);
  },
});

// The middleware we put on the routes that carry documents.
// "files" is the name of the field the React form sends, and this time
// there can be more than one file in it, so multer puts them all in
// req.files instead of req.file.
export function uploadTaskFiles(req: Request, res: Response, next: NextFunction) {
  taskUpload.array("files", MAX_TASK_FILES)(req, res, (error: any) => {
    if (error) {
      let message = error.message;

      if (error.code === "LIMIT_FILE_SIZE") {
        message = "One file is too big, please use files under 10 MB";
      }
      if (error.code === "LIMIT_FILE_COUNT") {
        message = "You can attach at most " + MAX_TASK_FILES + " files";
      }

      return res.status(400).json({
        success: false,
        message: message,
      });
    }

    next();
  });
}

// Delete one document from the disk. We call it when somebody removes an
// attachment, and also when a request stops after multer already wrote
// the files, so no file stays on the disk for nothing.
export function deleteTaskFile(fileName: string) {
  if (!fileName) {
    return;
  }

  const filePath = path.join(TASK_FILE_FOLDER, path.basename(fileName));

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    // The file was not there. That is not a problem for us.
  }
}

// ---------------------------------------------------------------------------
// The scanned picture of a cheque
// ---------------------------------------------------------------------------

// A cheque scan is one single file: a picture of the paper cheque, or a PDF
// when the bank sent a PDF. Nothing else is allowed, so nobody can upload a
// program to our server.
const ALLOWED_CHEQUE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const ALLOWED_CHEQUE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

// 5 MB is plenty for a photo or a scan of one cheque.
const MAX_CHEQUE_FILE_SIZE = 5 * 1024 * 1024;

const chequeFileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, CHEQUE_FILE_FOLDER);
  },
  filename: (req, file, callback) => {
    // Our own name that can never repeat: cheque-<time>-<random>.jpg
    const extension = path.extname(file.originalname).toLowerCase();
    const randomPart = Math.round(Math.random() * 1000000000);
    callback(null, "cheque-" + Date.now() + "-" + randomPart + extension);
  },
});

const chequeUpload = multer({
  storage: chequeFileStorage,
  limits: {
    fileSize: MAX_CHEQUE_FILE_SIZE,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const extensionIsAllowed = ALLOWED_CHEQUE_EXTENSIONS.includes(extension);
    const typeIsAllowed =
      ALLOWED_CHEQUE_TYPES.includes(file.mimetype) ||
      file.mimetype === "application/octet-stream";

    if (!extensionIsAllowed || !typeIsAllowed) {
      return callback(
        new Error("The cheque scan must be a JPG, PNG, WEBP or PDF file")
      );
    }

    callback(null, true);
  },
});

// The middleware we put on the cheque routes. "scan" is the name of the
// field the React form sends. It is one single file, so multer puts it in
// req.file, exactly like the employee photo.
export function uploadChequeScan(req: Request, res: Response, next: NextFunction) {
  chequeUpload.single("scan")(req, res, (error: any) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "The cheque scan is too big, please use a file under 5 MB"
          : error.message;

      return res.status(400).json({
        success: false,
        message: message,
      });
    }

    next();
  });
}

// Delete one cheque scan from the disk. We call it when the cheque is
// deleted, when its scan is replaced, or when a request stops after multer
// already saved the file.
export function deleteChequeFile(fileName: string) {
  if (!fileName) {
    return;
  }

  const filePath = path.join(CHEQUE_FILE_FOLDER, path.basename(fileName));

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    // The file was not there. That is not a problem for us.
  }
}

// ---------------------------------------------------------------------------
// The documents of a leave request
// ---------------------------------------------------------------------------

// This one is different from the three above, and it is worth understanding
// why: which files a leave request accepts is NOT one rule for the whole app.
// It belongs to the leave type ("a sick leave takes a PDF up to 5 MB"), and
// multer runs before anybody has read that leave type from the database.
//
// So this middleware only guards the CEILINGS: the widest set of file kinds
// the app knows about, and the biggest size and count an organization is ever
// allowed to configure. Everything that gets through is written to the disk,
// and createLeaveRequest then measures each file against the real rules of
// that leave type and throws away what does not fit.

const leaveFileStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, LEAVE_FILE_FOLDER);
  },
  filename: (req, file, callback) => {
    // Our own name that can never repeat: leave-<time>-<random>.pdf
    const extension = path.extname(file.originalname).toLowerCase();
    const randomPart = Math.round(Math.random() * 1000000000);
    callback(null, "leave-" + Date.now() + "-" + randomPart + extension);
  },
});

const leaveUpload = multer({
  storage: leaveFileStorage,
  limits: {
    fileSize: MAX_LEAVE_FILE_SIZE_MB * 1024 * 1024,
    files: MAX_LEAVE_FILE_COUNT,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const extensionIsAllowed = ALL_LEAVE_FILE_EXTENSIONS.includes(extension);
    const typeIsAllowed =
      ALL_LEAVE_FILE_MIME_TYPES.includes(file.mimetype) ||
      file.mimetype === "application/octet-stream";

    if (!extensionIsAllowed || !typeIsAllowed) {
      return callback(
        new Error("Only images, PDF, Word and Excel files are allowed")
      );
    }

    callback(null, true);
  },
});

// The middleware we put on the "apply for leave" route. "documents" is the
// name of the field the React form sends, and there can be more than one file
// in it, so multer puts them all in req.files.
//
// The apply form is always sent as a multipart form, even when the employee
// attached nothing at all. That way there is one single road into this route
// instead of two, and a form with no file simply arrives with no file.
export function uploadLeaveDocuments(
  req: Request,
  res: Response,
  next: NextFunction
) {
  leaveUpload.array("documents", MAX_LEAVE_FILE_COUNT)(req, res, (error: any) => {
    if (error) {
      let message = error.message;

      if (error.code === "LIMIT_FILE_SIZE") {
        message =
          "One file is too big, please use files under " +
          MAX_LEAVE_FILE_SIZE_MB +
          " MB";
      }
      if (error.code === "LIMIT_FILE_COUNT") {
        message =
          "You can attach at most " + MAX_LEAVE_FILE_COUNT + " documents";
      }

      return res.status(400).json({
        success: false,
        message: message,
      });
    }

    next();
  });
}

// A leave document is never deleted one by one: the papers an employee handed
// in are part of the audit trail and stay with the request. The only files we
// throw away are the ones of a request that was refused, and that is what
// deleteUploadedFiles below does.

// The files multer just saved for this request, as a normal list.
// A route without any file gives an empty list instead of undefined,
// so the controllers can always use .length and forEach on it.
export function getUploadedFiles(req: Request) {
  if (!Array.isArray(req.files)) {
    return [];
  }

  return req.files;
}

// Throw away every file multer just wrote for this request.
//
// It is called when a request stops AFTER multer has already saved the files:
// the answer is an error, nobody will ever use those files, and without this
// they would stay on the disk forever.
//
// The four delete functions above each know one folder, because they are used
// when we only have a file NAME. Here we have the file object multer built,
// and it carries its own full path, so this one function works for a photo,
// a task document, a cheque scan and a leave document alike.
export function deleteUploadedFiles(req: Request) {
  // A copy, because getUploadedFiles gives back req.files itself and we do
  // not want to change what the request carries, only to read it.
  const files = [...getUploadedFiles(req)];

  if (req.file) {
    files.push(req.file);
  }

  deleteFileUploads(files);
}


// Services already have file metadata, so they can clean up without a request.
export function deleteFileUploads(files: { path: string }[]) {
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch (error) {
      // The file was not there. That is not a problem for us.
    }
  }
}
