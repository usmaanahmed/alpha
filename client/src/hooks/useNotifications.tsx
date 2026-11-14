import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMyNotificationsRequest,
  getAllMyNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from "@/api/notification.api";
import { getErrorMessage } from "@/api/axiosClient";
import { ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { connectSocket } from "@/lib/socket";
import { NotificationBy } from "@/components/notifications/NotificationBy";
import type { AppNotification } from "@/types/notification.types";

// The five newest notifications plus the unread count.
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: getMyNotificationsRequest,
  });
}

// The whole list, for the "All notifications" page.
//
// The key starts with the same word "notifications" as the query above, and
// that is on purpose: invalidateQueries({ queryKey: ["notifications"] })
// matches every key that STARTS with it, so the one line the socket already
// runs refreshes the bell and this page together. The page is live without
// writing a single extra listener for it.
export function useAllNotifications() {
  return useQuery({
    queryKey: ["notifications", "all"],
    queryFn: getAllMyNotificationsRequest,
  });
}

// Open one notification. The menu closes and the page changes right after,
// so there is no toast here: it would say something the user already sees.
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markNotificationReadRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsReadRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// How long a notification toast stays on the screen. Twenty seconds.
const TOAST_MILLISECONDS = 20000;

// A task notification is the one that gets the green toast.
function isTask(notification: AppNotification) {
  return notification.module === "tasks";
}

// The green of a task toast. Two greens from left to right, white writing on
// top, and no border: a coloured toast that still has a grey line around it
// looks like a mistake.
const TASK_TOAST_STYLE = {
  background: "linear-gradient(90deg, #059669 0%, #22c55e 100%)",
  color: "#ffffff",
  border: "none",
};

// This is the part that makes the bell live.
//
// The socket line is already open (see lib/socket.ts). Here we simply say:
// "when a message called 'notification' arrives, do these two things".
//   1. read the list again, so the bell and its menu show the new line,
//   2. show a small toast, so the person notices even if they were
//      looking at another corner of the screen.
//
// Nothing on this page is reloaded and nobody presses F5: the server spoke
// first, and React only redrew the parts that changed.
export function useNotificationSocket() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    function onNotification(notification: AppNotification) {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });

      // The lists of the module itself (the task board, the cheque table...)
      // are not reloaded here. They have their own channel: useLiveUpdates(),
      // which the dashboard frame runs for every page. Two systems, one job
      // each: this one is the bell, that one is the screen.
      //
      // The description is not a piece of text but two lines: what happened,
      // and who did it. That second line is the same <NotificationBy /> the
      // bell menu and the notifications page draw, so a task looks the same
      // wherever a person meets it.
      const description = (
        <span className="block">
          <span className="block">{notification.message}</span>
          <NotificationBy
            type={notification.type}
            actorName={notification.actorName}
            actorPhoto={notification.actorPhoto}
            className={cn(
              "mt-1",
              // The grey this line uses in the bell menu is meant for a pale
              // card. A toast is coloured, so here the line simply takes the
              // colour of the toast it sits on and goes a little quieter
              // than the message above it.
              isTask(notification) ? "text-white/85" : "text-current opacity-80"
            )}
          />
        </span>
      );

      // A task is the one notification that is really WORK: somebody is now
      // waiting for this person. So it arrives in the green of the app
      // instead of the usual blue, and it is the only one that does.
      if (isTask(notification)) {
        toast(notification.title, {
          description: description,
          duration: TOAST_MILLISECONDS,
          closeButton: true,
          icon: <ListChecks className="h-4 w-4" />,
          // Written as a real style and not as classes on purpose: sonner
          // paints its own background and text colour on the toast, and an
          // inline style is the one thing that is always stronger than a
          // stylesheet. The gradient is drawn as a picture on top of that
          // background, so the two never fight.
          style: TASK_TOAST_STYLE,
        });

        return;
      }

      toast.info(notification.title, {
        description: description,
        // Twenty seconds instead of the four a normal toast gets. A "saved"
        // message is about something the person just did and can disappear
        // quickly; this one is about something SOMEBODY ELSE did, so it has
        // to survive being looked at late.
        duration: TOAST_MILLISECONDS,
        // The little x in the corner. Twenty seconds is long enough to be in
        // the way, so there must always be a way to push it aside.
        closeButton: true,
      });
    }

    socket.on("notification", onNotification);

    // React runs this when the component leaves the screen. We only stop
    // LISTENING here, we do not close the line: the line belongs to the
    // whole app and is closed on logout.
    return () => {
      socket.off("notification", onNotification);
    };
  }, [queryClient]);
}
