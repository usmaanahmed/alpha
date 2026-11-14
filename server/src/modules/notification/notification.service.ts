// Notification display rules live here, without HTTP requests or responses.
import * as notificationRepository from "./notification.repository.js";

// The bell shows a short preview. The page shows a longer recent history.
const MENU_NOTIFICATION_LIMIT = 5;
const PAGE_NOTIFICATION_LIMIT = 100;

export async function getMyNotifications(userId: string) {
  const notifications = await notificationRepository.findUserNotifications(
    userId,
    MENU_NOTIFICATION_LIMIT
  );

  // Count every unread notification, including those outside the preview.
  const unreadCount = await notificationRepository.countUnreadNotifications(userId);

  return {
    notifications: notifications,
    unreadCount: unreadCount,
  };
}

export async function getAllMyNotifications(userId: string) {
  const notifications = await notificationRepository.findUserNotifications(
    userId,
    PAGE_NOTIFICATION_LIMIT
  );
  const unreadCount = await notificationRepository.countUnreadNotifications(userId);

  return {
    notifications: notifications,
    unreadCount: unreadCount,
  };
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await notificationRepository.markUserNotificationRead(
    userId,
    notificationId
  );

  // false tells the controller that this user has no notification with that id.
  if (!notification) {
    return false;
  }

  return true;
}

export async function markAllNotificationsRead(userId: string) {
  await notificationRepository.markUserNotificationsRead(userId);
}
