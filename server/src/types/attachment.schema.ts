import mongoose from "mongoose";

// One file that somebody attached, either to a task or to a comment.
//
// The file itself is a normal file on the disk of the server, inside
// server/uploads/tasks. In the database we keep only the small card that
// says how to find it and how to show it:
// - fileName is the name we invented when we saved it. It can never
//   repeat, and it is the name used in the address of the file,
// - originalName is the name the file had on the computer of the user,
//   and it is the only name we ever show on the screen,
// - mimeType tells us what kind of file it is (picture, pdf, word...),
// - size is in bytes, so the screen can write "1.2 MB".
export interface AttachmentData {
  // MongoDB supplies this id when the attachment is saved.
  _id?: mongoose.Types.ObjectId;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  // The employee who sent the file. It stays null when the organization
  // account did it, because an organization is not an employee.
  uploadedBy: mongoose.Types.ObjectId | null;
  uploadedByType: "organization" | "employee";
  uploadedAt: Date;
}

// This schema is used in two places: inside a task and inside a comment.
// It is its own file so both models can use exactly the same shape, and
// mongoose gives every file an _id that React uses as the key of the list.
export const attachmentSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 0,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    default: null,
  },
  uploadedByType: {
    type: String,
    enum: ["organization", "employee"],
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});
