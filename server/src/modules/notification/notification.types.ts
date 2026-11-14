import type mongoose from "mongoose";

// The event that caused the notification.
export type NotificationType =
  | "created"
  | "assigned"
  | "removed"
  | "updated"
  | "reviewed"
  | "progress"
  | "comment";

// Document provides database methods. The remaining fields describe one notification.
export interface NotificationDocument extends mongoose.Document {
  organization: mongoose.Types.ObjectId;
  // Use a user account so organization accounts can receive notifications too.
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  module: string;
  title: string;
  message: string;
  // Copy the actor's name and photo so old notifications retain their original details.
  actorName: string;
  actorPhoto: string;
  // Destination page when the notification is clicked.
  link: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
