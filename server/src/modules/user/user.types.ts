import type mongoose from "mongoose";

// These are the three kinds of accounts that can login.
// "employee" is used by a normal employee and also by a manager,
// because a manager is only an employee whose role name is "Manager".
export type UserRole = "saas_owner" | "organization" | "employee";

// This is the shape of one user document in MongoDB.
export interface UserDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  // A saas owner has no organization, so this field can be null.
  organization: mongoose.Types.ObjectId | null;
  // Only an employee account points to an employee document.
  employee: mongoose.Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
