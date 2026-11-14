import { ClipboardList, CalendarClock, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { formatDay, formatTime } from "@/lib/date";
import type { LeaveContext } from "@/types/hr.types";

// What the approver ticked. The kind matters as much as the id, because a
// task and a meeting can never share one, but the two lists are drawn and
// sent together and a plain id would not say which list a line came from.
export interface ChosenReference {
  kind: "task" | "meeting";
  refId: string;
}

// Is this one ticked right now?
function isChosen(chosen: ChosenReference[], kind: string, id: string) {
  return chosen.some((item) => item.kind === kind && item.refId === id);
}

// The tasks and the meetings of the requested days, with a box in front of
// each one.
//
// This is the step that turns "approved" into something an employee can act
// on. The approver already sees this exact work in the panel above; here they
// point at the pieces that still need the employee, and those end up in the
// answer, in the leave history and in the audit trail.
//
// Only the KIND and the ID leave the browser. The title and the date the
// employee will read are looked up again by the server, so nothing on their
// screen can be invented here.
export function LeaveReferencePicker(props: {
  context: LeaveContext;
  chosen: ChosenReference[];
  onChange: (chosen: ChosenReference[]) => void;
}) {
  const tasks = props.context.workload.tasks;
  const meetings = props.context.workload.meetings;

  // Nothing overlaps these days, so there is nothing to point at and the
  // whole block stays off the screen.
  if (tasks.length === 0 && meetings.length === 0) {
    return null;
  }

  function toggle(kind: "task" | "meeting", refId: string) {
    props.onChange(
      isChosen(props.chosen, kind, refId)
        ? props.chosen.filter(
            (item) => !(item.kind === kind && item.refId === refId)
          )
        : props.chosen.concat({ kind: kind, refId: refId })
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border p-4">
      <div>
        <Label className="flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Point at their commitments
        </Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Whatever you tick is written into your answer, and the employee gets
          it as a list they can open.
        </p>
      </div>

      {tasks.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ClipboardList className="h-3.5 w-3.5" />
            Tasks
          </p>

          {tasks.map((task) => (
            <PickRow
              key={task._id}
              isChosen={isChosen(props.chosen, "task", task._id)}
              onToggle={() => toggle("task", task._id)}
              title={task.title}
              detail={
                task.dueDate ? "due " + formatDay(task.dueDate) : "no due date"
              }
              tag={task.priority}
            />
          ))}
        </div>
      ) : null}

      {meetings.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Meetings
          </p>

          {meetings.map((meeting) => (
            <PickRow
              key={meeting._id}
              isChosen={isChosen(props.chosen, "meeting", meeting._id)}
              onToggle={() => toggle("meeting", meeting._id)}
              title={meeting.title}
              detail={
                formatDay(meeting.startAt) +
                " at " +
                formatTime(meeting.startAt)
              }
              tag={meeting.isOrganizer ? "organizer" : ""}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// One tickable line. The whole line is the label of its own checkbox, so
// pressing anywhere on it works and the box is never a small target.
function PickRow(props: {
  isChosen: boolean;
  onToggle: () => void;
  title: string;
  detail: string;
  tag: string;
}) {
  return (
    <label
      className={
        "flex min-w-0 cursor-pointer flex-wrap items-center gap-2 rounded-lg border px-3 py-2 transition-colors " +
        (props.isChosen ? "border-primary/40 bg-primary/5" : "hover:bg-muted/60")
      }
    >
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0"
        checked={props.isChosen}
        onChange={props.onToggle}
      />

      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {props.title}
      </span>

      {props.tag ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
          {props.tag}
        </span>
      ) : null}

      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
        {props.detail}
      </span>
    </label>
  );
}
