// Notification database queries belong here.
import { Notification } from "./notification.model.js";

export async function findUserNotifications(userId: string, limit: number) {
  // -1 shows newest notifications first. limit keeps the response small.
  // lean() returns plain data because this list does not need database methods.
  return Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

export async function countUnreadNotifications(userId: string) {
  return Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });
}

export async function markUserNotificationRead(userId: string, notificationId: string) {
  // Both values must match. Knowing an id does not let a user change
  // a notification that belongs to somebody else.
  return Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true }
  );
}

export async function markUserNotificationsRead(userId: string) {
  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );
}
