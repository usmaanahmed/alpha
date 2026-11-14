import { Repeat2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TaskAssignmentTimeline } from "@/components/tasks/TaskAssignmentTimeline";
import type { Task } from "@/types/task.types";
import { getReassignmentCount } from "@/types/task.types";

// The violet mark on a task that changed hands. Pressing it opens the
// whole assignment timeline, so the badge is not only a colour: it is the
// door to the history.
//
// A task that never moved shows nothing at all.
export function TaskReassignedBadge(props: { task: Task }) {
  const count = getReassignmentCount(props.task);

  if (count === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {/* On the board this badge sits inside a card we can drag, so we
            stop the mouse event before dnd-kit reads it as a drag. */}
        <button type="button" onPointerDown={(event) => event.stopPropagation()}>
          <Badge variant="reassigned" className="cursor-pointer">
            <Repeat2 className="h-3 w-3" />
            {count === 1 ? "Reassigned" : "Reassigned " + count + "x"}
          </Badge>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80">
        <p className="mb-3 text-sm font-semibold">Assignment timeline</p>
        <TaskAssignmentTimeline task={props.task} />
      </PopoverContent>
    </Popover>
  );
}
