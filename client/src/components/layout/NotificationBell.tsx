import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimeAgo } from "@/components/common/TimeAgo";
import { NotificationIcon } from "@/components/notifications/NotificationIcon";
import { NotificationBy } from "@/components/notifications/NotificationBy";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationSocket,
} from "@/hooks/useNotifications";
import { useAuth } from "@/context/AuthContext";
import { getHomePath } from "@/types/auth.types";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/notification.types";

// The bell of the topbar.
//
// It is drawn once, inside the frame that holds every page after the login,
// so it is on the screen the whole time the person is using the app. That is
// exactly what a live notification needs: something that never leaves.
//
// Three things work together here:
// - useNotifications() reads the five newest lines from the server,
// - useNotificationSocket() listens on the open socket line, and reads them
//   again the moment the server says a new one arrived,
// - <TimeAgo /> rewrites "just now" into "2 min ago" while nobody touches
//   anything.
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // The page is mounted once under every root of the app (/owner,
  // /organization, /employee), so the link is built from the role instead of
  // being written by hand.
  const allNotificationsPath =
    getHomePath(user?.role || "employee") + "/notifications";

  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // This is the line that makes the whole thing live.
  useNotificationSocket();

  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  // A person clicked one line: it is read now, the menu closes and we go to
  // the page where the task is waiting.
  function openNotification(notification: AppNotification) {
    if (!notification.isRead) {
      markRead.mutate(notification._id);
    }

    setIsOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />

          {/* The red badge. It is only drawn when there is something to
              count, so a bell with nothing new stays calm.
              More than nine becomes "9+", otherwise a big number would
              break out of the little circle. */}
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        // p-0 because the rows go edge to edge, and every row draws its own
        // padding. On a phone the menu takes the width of the screen minus
        // the padding around the page.
        className="w-[calc(100vw-2rem)] p-0 sm:w-88"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>

          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </Button>
          ) : null}
        </div>

        {/* Three different things can be true, so there are three answers:
            we are still asking the server, there is nothing at all, or we
            have the list. */}
        {notificationsQuery.isLoading ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading...
          </p>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto h-6 w-6 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No notifications yet
            </p>
            <p className="text-xs text-muted-foreground/70">
              Anything created or given to you across the app lands here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
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
                {/* The icon of the module it came from. The bell now hears
                    from every part of the app, so the picture is what lets a
                    person see "task, meeting, cheque" without reading. */}
                <NotificationIcon module={notification.module} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {notification.title}
                  </p>
                  {/* line-clamp-2 keeps a long task title to two lines
                      instead of letting one notification fill the menu. */}
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  {/* Who did it, on its own line, so the name is always in
                      the same place on every row. */}
                  <NotificationBy
                    type={notification.type}
                    actorName={notification.actorName}
                    actorPhoto={notification.actorPhoto}
                    className="mt-0.5 max-w-full"
                  />
                  <TimeAgo
                    value={notification.createdAt}
                    className="mt-1 block text-[11px] text-muted-foreground/70"
                  />
                </div>

                {/* The small dot that says "you have not opened this one
                    yet". A read line keeps the space empty, so every row
                    stays exactly as wide as the others. */}
                {!notification.isRead ? (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                ) : null}
              </button>
            ))}
          </div>
        )}

        {/* The way out of the menu.
            The menu only ever holds the five newest lines, so without this
            link the sixth one would be lost for good. It is drawn even when
            the list is empty, because the page is also where somebody goes
            to read what they already opened. */}
        <div className="border-t p-1">
          <Button
            variant="ghost"
            className="w-full justify-center text-xs font-medium text-muted-foreground"
            onClick={() => {
              setIsOpen(false);
              navigate(allNotificationsPath);
            }}
          >
            See all notifications
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
