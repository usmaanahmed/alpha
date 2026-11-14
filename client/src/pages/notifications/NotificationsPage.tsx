import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/common/PageHeader";
import { TimeAgo } from "@/components/common/TimeAgo";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { NotificationBy } from "@/components/notifications/NotificationBy";
import {
  useAllNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification.types";

// The page behind the "See all notifications" link of the bell.
//
// The menu on the topbar shows the five newest lines and nothing else, so
// this is where the sixth one, and everything older than it, still lives.
//
// It is live for free. The socket listener of the bell (useNotificationSocket,
// running in the topbar above this page) throws away everything filed under
// "notifications" the moment the server speaks, and the list of this page is
// filed under exactly that word too. So a task assigned while somebody is
// reading this page appears on top of it by itself, and the "2 mins ago"
// under every line keeps counting on its own as well.
export function NotificationsPage() {
  const navigate = useNavigate();

  // "all" is everything, "unread" is only what has not been opened yet.
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const notificationsQuery = useAllNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((notification) => !notification.isRead)
      : notifications;

  // Exactly what the menu does: the line is read now, and we go to the page
  // where the thing itself is waiting.
  function openNotification(notification: AppNotification) {
    if (!notification.isRead) {
      markRead.mutate(notification._id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Everything that was created, given to you or answered across the app."
        action={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all as read
            </Button>
          ) : null
        }
      />

      {/* The two views. The unread one carries its own number, because that
          is the question somebody opens this page with: "how much did I
          miss?" */}
      <div className="mb-4 flex gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => setFilter("unread")}
        >
          Unread{unreadCount > 0 ? " (" + unreadCount + ")" : ""}
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {/* The same three answers as the menu: still asking, nothing there,
            or the list. */}
        {notificationsQuery.isLoading ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : visibleNotifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell className="mx-auto h-7 w-7 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              {filter === "unread"
                ? "You have read everything"
                : "No notifications yet"}
            </p>
            <p className="text-xs text-muted-foreground/70">
              Anything created or given to you across the app lands here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {visibleNotifications.map((notification) => (
              <button
                key={notification._id}
                type="button"
                onClick={() => openNotification(notification)}
                className={cn(
                  "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                  // An unread line is a little brighter than the rest.
                  !notification.isRead && "bg-primary/5"
                )}
              >
                <NotificationIcon module={notification.module} />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  {/* Who did it, on its own line, exactly as in the bell
                      menu and in the toast. */}
                  <NotificationBy
                    type={notification.type}
                    actorName={notification.actorName}
                    actorPhoto={notification.actorPhoto}
                    className="mt-0.5"
                  />
                  {/* Rewrites itself every half minute, so an open page never
                      shows a stale "just now". */}
                  <TimeAgo
                    value={notification.createdAt}
                    className="mt-1 block text-[11px] text-muted-foreground/70"
                  />
                </div>

                {/* The dot that says "not opened yet". A read line leaves the
                    space empty, so every row stays the same width. */}
                {!notification.isRead ? (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
