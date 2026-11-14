import type mongoose from "mongoose";

// Document provides database methods such as save(). These are our holiday fields.
export interface HolidayDocument extends mongoose.Document {
  name: string;
  organization: mongoose.Types.ObjectId;
  // Dates are stored at midnight UTC so the same day can be compared reliably.
  date: Date;
  isOptional: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

// Form fields checked by the validator before the service receives them.
export interface HolidayInput {
  name: string;
  date: string;
  isOptional: boolean;
  description?: string;
}

// The controller decides the HTTP response based on this outcome.
// invalid means an unreadable date or a duplicate holiday date.
export interface HolidayResult {
  status: "success" | "not_found" | "invalid";
  message: string;
  holiday?: HolidayDocument;
}
