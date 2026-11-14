import { Flag } from "lucide-react";
import type { TaskPriority } from "@/types/task.types";
import { getPriorityLabel } from "@/types/task.types";

// The little coloured flag the list and the calendar show for a task.
//
// It is only a flag and a word, no pill behind it, exactly like the
// snapshot: red shouts "high/urgent", amber is the middle "medium", and
// a calm blue is "low". Every colour has a dark-mode twin so the flag
// stays readable on the dark theme too.
const PRIORITY_CLASS: Record<TaskPriority, string> = {
  urgent: "text-red-600 dark:text-red-400",
  high: "text-red-600 dark:text-red-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-blue-600 dark:text-blue-400",
};

export function TaskPriorityFlag(props: { priority: TaskPriority }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 text-sm font-medium " +
        PRIORITY_CLASS[props.priority]
      }
    >
      <Flag className="h-3.5 w-3.5 fill-current" />
      {getPriorityLabel(props.priority)}
    </span>
  );
}
