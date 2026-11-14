// Read the logged-in user, call the service, and send the HTTP response.
import type { Request, Response } from "express";
import * as notificationService from "./notification.service.js";

// GET /api/notifications
export async function getMyNotifications(request: Request, response: Response) {
  // Always take the recipient from login, never from a query or request body.
  const userId = String(request.user?.userId);
  const data = await notificationService.getMyNotifications(userId);

  return response.status(200).json({
    success: true,
    data: data,
  });
}

// GET /api/notifications/all
export async function getAllMyNotifications(request: Request, response: Response) {
  const userId = String(request.user?.userId);
  const data = await notificationService.getAllMyNotifications(userId);

  return response.status(200).json({
    success: true,
    data: data,
  });
}

// PATCH /api/notifications/:id/read
export async function markNotificationRead(request: Request, response: Response) {
  const userId = String(request.user?.userId);
  const notificationId = String(request.params.id);
  const wasFound = await notificationService.markNotificationRead(userId, notificationId);

  if (!wasFound) {
    return response.status(404).json({
      success: false,
      message: "Notification not found",
    });
  }

  return response.status(200).json({
    success: true,
    message: "Notification marked as read",
  });
}

// PATCH /api/notifications/read-all
export async function markAllNotificationsRead(request: Request, response: Response) {
  const userId = String(request.user?.userId);
  await notificationService.markAllNotificationsRead(userId);

  return response.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
}
