import { useState } from "react";
import {
  ClipboardList,
  CalendarClock,
  Video,
  MapPin,
  Crown,
  Loader2,
} from "lucide-react";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { useTask } from "@/hooks/useTasks";
import { formatDay, formatTime } from "@/lib/date";
import type {
  LeaveContext,
  LeaveWorkloadTask,
  LeaveWorkloadMeeting,
} from "@/types/hr.types";

// What the four task priorities look like.
//
// Priority is a STATE, not a series, so it wears the reserved status colours
// and always carries its word next to the colour: "Urgent" is written out, it
// is never only a red chip.
const PRIORITY_LOOK: Record<string, { label: string; chip: string }> = {
  urgent: {
    label: "Urgent",
    chip: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  },
  high: {
    label: "High",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  medium: {
    label: "Medium",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  low: {
    label: "Low",
    chip: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
  },
};

// Why a task is on the list. This is the sentence that saves an approver from
// working it out from two dates.
const RELATION_WORDS: Record<string, string> = {
  due_in_leave: "due inside the leave",
  overdue: "already overdue",
  spans_leave: "runs across the leave",
};

// What the employee asking for the leave has on their plate in those days.
//
// The point of this panel is one question: if this person is away, what stops
// moving? So it only shows the work that really touches the requested days,
// and it says next to every line WHY it is there.
export function LeaveWorkloadPanel(props: {
  context: LeaveContext;
  employeeName: string;
  isLoading?: boolean;
}) {
  // The task whose details are open, kept as an ID and not as the small row
  // this panel already has.
  //
  // The dialog below is the SAME one the tasks page uses, and it wants a
  // whole task: the documents, the timeline, the discussion. The rows of this
  // list are only a title and a due date, so the task is read on its own the
  // moment somebody presses one.
  const [taskIdToRead, setTaskIdToRead] = useState<string | null>(null);
  const taskQuery = useTask(taskIdToRead);

  const workload = props.context.workload;

  if (props.isLoading) {
    return <div className="h-40 animate-pulse rounded-xl border bg-muted/40" />;
  }

  // The urgent and the high tasks come first: they are the reason somebody
  // would hesitate, so they must not be buried under the low ones.
  const sortedTasks = [...workload.tasks].sort(
    (left, right) => priorityRank(right.priority) - priorityRank(left.priority)
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CountTile value={workload.openTaskCount} label="Open tasks" />
        <CountTile
          value={workload.criticalTaskCount}
          label="High or urgent"
          isAlarming={workload.criticalTaskCount > 0}
        />
        <CountTile
          value={workload.dueInLeaveCount}
          label="Due in the leave"
          isAlarming={workload.dueInLeaveCount > 0}
        />
        <CountTile
          value={workload.overdueCount}
          label="Overdue"
          isAlarming={workload.overdueCount > 0}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="h-4 w-4" />
          Work touching these days
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {sortedTasks.length}
          </span>
        </p>

        {sortedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {props.employeeName + " has no open task touching these days."}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {sortedTasks.map((task) => (
              <TaskRow
                key={task._id}
                task={task}
                isOpening={taskIdToRead === task._id && taskQuery.isLoading}
                onOpen={() => setTaskIdToRead(task._id)}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <CalendarClock className="h-4 w-4" />
          Meetings inside the leave
          <span className="text-xs font-normal text-muted-foreground tabular-nums">
            {workload.meetings.length}
          </span>
        </p>

        {workload.meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No meeting is scheduled for {props.employeeName} in these days.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {workload.meetings.map((meeting) => (
              <MeetingRow key={meeting._id} meeting={meeting} />
            ))}
          </ul>
        )}
      </div>

      {/* The very same dialog the tasks page opens. It only draws itself once
          the task has really arrived, so nothing flashes half empty while the
          request is on its way; the row that was pressed shows the spinner
          during that moment. */}
      <TaskDetailDialog
        task={taskQuery.data || null}
        onClose={() => setTaskIdToRead(null)}
      />
    </div>
  );
}

// Urgent sorts above high, high above medium, and so on.
function priorityRank(priority: string) {
  if (priority === "urgent") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

// One of the four numbers. A number that is not zero when zero would be the
// comfortable answer is painted, the others stay in normal ink.
function CountTile(props: {
  value: number;
  label: string;
  isAlarming?: boolean;
}) {
  return (
    <div className="rounded-xl border p-3">
      <p
        className={
          "text-2xl leading-none font-semibold tabular-nums " +
          (props.isAlarming ? "text-amber-600 dark:text-amber-400" : "")
        }
      >
        {props.value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{props.label}</p>
    </div>
  );
}

// One task of the list.
//
// The whole line is a button, so pressing anywhere on it opens the task. It
// is a real <button> and not a div with an onClick, because then the keyboard
// and the screen reader get it for free.
function TaskRow(props: {
  task: LeaveWorkloadTask;
  isOpening: boolean;
  onOpen: () => void;
}) {
  const look = PRIORITY_LOOK[props.task.priority] || PRIORITY_LOOK.medium;

  return (
    <li>
      <button
        type="button"
        onClick={props.onOpen}
        disabled={props.isOpening}
        title="Open this task"
        className="flex w-full min-w-0 cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/60"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " +
              look.chip
            }
          >
            {look.label}
          </span>
          <span className="truncate text-sm font-medium">
            {props.task.title}
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          {/* While the task is on its way, the row that was pressed says so.
              Without this the screen would look frozen for a moment. */}
          {props.isOpening ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : null}

          <span
            className={
              props.task.isOverdue ? "text-rose-600 dark:text-rose-400" : ""
            }
          >
            {RELATION_WORDS[props.task.relation] || ""}
          </span>
          {props.task.dueDate ? (
            <span className="tabular-nums">{formatDay(props.task.dueDate)}</span>
          ) : null}
        </span>
      </button>
    </li>
  );
}

function MeetingRow(props: { meeting: LeaveWorkloadMeeting }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
      <span className="flex min-w-0 items-center gap-2">
        {props.meeting.meetingType === "online" ? (
          <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}

        <span className="truncate text-sm font-medium">
          {props.meeting.title}
        </span>

        {/* Running a meeting is much harder to hand over than sitting in one,
            so the organizer is called out. */}
        {props.meeting.isOrganizer ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            <Crown className="h-3 w-3" />
            organizer
          </span>
        ) : null}
      </span>

      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDay(props.meeting.startAt) +
          " at " +
          formatTime(props.meeting.startAt)}
      </span>
    </li>
  );
}
