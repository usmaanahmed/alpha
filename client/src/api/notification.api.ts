import { axiosClient } from "./axiosClient";
import type { NotificationsAnswer } from "@/types/notification.types";

// The newest five notifications of the logged in person, plus the number
// of unread ones.
export async function getMyNotificationsRequest() {
  const response = await axiosClient.get("/notifications");
  return response.data.data as NotificationsAnswer;
}

// Every notification of the logged in person (the newest hundred), for the
// page behind the "See all notifications" link. The answer has the same
// shape as the one above, so both share NotificationsAnswer.
export async function getAllMyNotificationsRequest() {
  const response = await axiosClient.get("/notifications/all");
  return response.data.data as NotificationsAnswer;
}

// One line was opened, so it is not new anymore.
export async function markNotificationReadRequest(id: string) {
  const response = await axiosClient.patch("/notifications/" + id + "/read");
  return response.data;
}

// The "Mark all as read" button of the menu.
export async function markAllNotificationsReadRequest() {
  const response = await axiosClient.patch("/notifications/read-all");
  return response.data;
}
