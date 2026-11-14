// What KIND of thing happened. It is also the word the bell writes in front
// of the name of the person who did it (see NotificationBy):
// - "created"  : something new exists (a cheque, a department, a meeting),
// - "assigned" : something was put on my desk (a task, an invitation, a team),
// - "removed"  : something was taken away again (I left a team, a record was
//                deleted),
// - "updated"  : something that already existed was changed,
// - "reviewed" : somebody answered a request (a leave approved, an invitation
//                accepted),
// - "progress" : something I gave out moved on (a task left "To do"),
// - "comment"  : somebody wrote under a task.
export type NotificationType =
  | "created"
  | "assigned"
  | "removed"
  | "updated"
  | "reviewed"
  | "progress"
  | "comment";

// One line of the bell menu, exactly as the server sends it.
export interface AppNotification {
  _id: string;
  type: NotificationType;
  // Where it came from: "tasks", "meetings", "cheques", "leaves"... The menu
  // uses it to draw the right little icon, so a full bell can be read at a
  // glance without anybody reading every sentence.
  module: string;
  // The bold line, for example "New task assigned".
  title: string;
  // The grey line under it.
  message: string;
  // WHO did it. The name is written on the notification when it is born, so
  // an old line still reads the way it read on the day it arrived even if
  // that person has left since. It is shown on its own row, as
  // "Assigned by Ali Khan".
  actorName: string;
  // The file name of that person's picture, so the same row can show the
  // face next to the name. It is empty for the organization account and for
  // anybody who never uploaded one, and then a circle of initials is drawn.
  actorPhoto: string;
  // The page to open when the line is clicked.
  link: string;
  isRead: boolean;
  // The moment it was created, as text like "2026-07-31T09:12:00.000Z".
  // This is what becomes "2 min ago" on the screen.
  createdAt: string;
}

// The whole answer of GET /api/notifications: the newest five lines, and
// how many unread ones there are in total (that is the red badge).
export interface NotificationsAnswer {
  notifications: AppNotification[];
  unreadCount: number;
}
