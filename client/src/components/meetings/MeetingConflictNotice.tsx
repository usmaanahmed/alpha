import { AlertTriangle } from "lucide-react";
import { formatMeetingDateTime } from "@/types/meeting.types";
import type { MeetingConflict } from "@/types/meeting.types";

// The yellow box the form shows when the chosen time clashes with other
// meetings. It lists each clashing meeting and the people who are already
// busy at that time, so the user can decide to change the time or go ahead.
export function MeetingConflictNotice(props: { conflicts: MeetingConflict[] }) {
  if (props.conflicts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
      <p className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4" />
        Some people are already busy at this time
      </p>

      <ul className="mt-2 flex flex-col gap-2">
        {props.conflicts.map((conflict) => (
          <li key={conflict.meetingId} className="text-amber-800 dark:text-amber-300">
            <span className="font-medium">{conflict.title}</span>
            <span className="text-xs">
              {" "}
              ({formatMeetingDateTime(conflict.startAt)})
            </span>
            <span className="block text-xs">
              Busy: {conflict.employees.map((person) => person.name).join(", ")}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
        You can change the time, or press the button again to schedule anyway.
      </p>
    </div>
  );
}
