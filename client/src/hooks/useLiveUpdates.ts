import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { connectSocket } from "@/lib/socket";

// This is the other half of the "activity" message the server sends from
// middlewares/activity.middleware.ts.
//
// The server does not send the new record, only the NAME of the module that
// changed. So here we say, for every module, which lists have to be read
// again. React Query then fetches them, React redraws the parts that really
// changed, and the screen moves while nobody touches it.

// "employeeActivity" is the open accordion of the employee table. It shows a
// person's tasks, meetings, attendance and leaves all at once, so it appears
// under every one of those five modules: whichever of them changes, the panel
// somebody has open reads itself again.
const KEYS_OF_MODULE: Record<string, string[]> = {
  employees: ["employees", "dashboard-stats", "employeeActivity"],
  departments: ["departments", "active-departments", "dashboard-stats"],
  teams: ["teams", "my-teams", "dashboard-stats"],
  // A task also changes the two charts of the dashboard, which the server
  // counts on its own side.
  tasks: [
    "tasks",
    "dashboard-stats",
    "task-progress",
    "department-tasks",
    "employeeActivity",
  ],
  meetings: ["meetings", "dashboard-stats", "employeeActivity"],
  holidays: ["holidays", "dashboard-stats"],
  leaveTypes: ["leaveTypes", "dashboard-stats"],
  // An answered leave also writes the days into the attendance sheet, so
  // that one is read again too.
  leaves: [
    "leaveRequests",
    "leaveBalance",
    "attendance",
    "dashboard-stats",
    "employeeActivity",
  ],
  attendance: ["attendance", "dashboard-stats", "employeeActivity"],
  cheques: ["cheques", "dashboard-stats"],
  // A salary that changes moves the list and the one salary a view dialog
  // may be showing right now.
  salaries: ["salaries", "salary"],
  // A role that changes also changes what the people carrying it may do, so
  // "my-profile" is read again: the menu of somebody who just gained or lost
  // a permission follows without a reload.
  roles: ["roles", "active-roles", "my-profile"],
};

// One "activity" message, exactly as the server writes it.
interface ActivityMessage {
  module: string;
  at: string;
}

// Call this once on a page that has to stay live. It listens as long as the
// page is on the screen and stops listening when it leaves.
export function useLiveUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    function onActivity(message: ActivityMessage) {
      const keys = KEYS_OF_MODULE[message.module];

      // A module nothing on this screen reads. Nothing to do.
      if (!keys) {
        return;
      }

      keys.forEach((key) => {
        // invalidateQueries marks the list as old. React Query then reads it
        // again by itself, but only the lists a screen is really using, so
        // this costs nothing on the pages that do not show them.
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    }

    socket.on("activity", onActivity);

    // Like the bell: we only stop LISTENING here. The line itself belongs to
    // the whole app and is closed on logout.
    return () => {
      socket.off("activity", onActivity);
    };
  }, [queryClient]);
}
