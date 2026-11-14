import mongoose from "mongoose";

import type { NotificationDocument } from "./notification.types.js";

// Preserve existing type imports used by shared notification utilities.
export type { NotificationDocument, NotificationType } from "./notification.types.js";

// Store one notification for one user account.
const notificationSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "created",
        "assigned",
        "removed",
        "updated",
        "reviewed",
        "progress",
        "comment",
      ],
      required: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    actorName: {
      type: String,
      default: "",
      trim: true,
    },
    actorPhoto: {
      type: String,
      default: "",
      trim: true,
    },
    link: {
      type: String,
      default: "",
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Mongoose adds createdAt and updatedAt automatically.
    timestamps: true,
  }
);

// This index speeds up finding one user's newest notifications.
notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<NotificationDocument>(
  "Notification",
  notificationSchema
);
