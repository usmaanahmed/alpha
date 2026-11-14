import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";
import mongoose from "mongoose";
import { deleteUploadedFiles } from "./upload.middleware.js";

// This middleware checks req.body with a zod schema.
// If the data is wrong we stop here and send back the first error message.
export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // On a form that carries files, multer already saved them on the disk
      // before we got here: an employee photo, the documents of a task
      // comment, a cheque scan or the papers of a leave request. The request
      // stops now, so nobody will ever use them and we throw them away.
      deleteUploadedFiles(req);

      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        success: false,
        message: firstIssue.message,
      });
    }

    // Data is valid, so we replace req.body with the clean data.
    req.body = result.data;
    next();
  };
}

// MongoDB ids look like "6650f1c2a4f1b2c3d4e5f6a7".
// If someone sends a wrong id we stop here instead of crashing the database call.
export function validateIdParam(req: Request, res: Response, next: NextFunction) {
  const isValidId = mongoose.isValidObjectId(req.params.id);

  if (!isValidId) {
    return res.status(400).json({
      success: false,
      message: "Invalid id",
    });
  }

  next();
}
