import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Paperclip,
  MessageSquare,
  MoreHorizontal,
  CircleDot,
  Loader2,
  CircleDashed,
  CheckCircle2,
  CircleSlash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/common/Avatar";
import { TaskReassignedBadge } from "@/components/tasks/TaskReassignedBadge";
import { TaskPriorityFlag } from "@/components/tasks/TaskPriorityFlag";
import { TaskTimeSpent } from "@/components/tasks/TaskTimeSpent";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types/task.types";
import {
  TASK_STATUS_GROUPS,
  getTasksByStatus,
  getReassignmentCount,
  formatDate,
  isTaskLate,
  getTaskAttachments,
} from "@/types/task.types";

interface TaskListViewProps {
  data: Task[];
  isLoading: boolean;
  // On the "My tasks" page every row is mine, so that column is hidden.
  showAssignee: boolean;
  // These four are optional because the employee page has no menu at all.
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  // A manager or the organization can start a new task from a section
  // header. Missing on the employee page, and then the "+" is not drawn.
  onCreate?: () => void;
  // Open the documents and the comments of the task. Everybody who sees a
  // task can do that, so unlike the four above it is never missing.
  onOpenDetail: (task: Task) => void;
}

// The colour and the icon each status wears on its section header. The
// four first sections copy the snapshot (blue, amber, rose, green) and
// "Cancelled" gets a calm grey. Every colour has its dark-mode twin.
//
// The header itself is a left-to-right gradient: vibrant on the left,
// carrying that colour further across the bar, and only settling to a
// faint tint at the far right instead of fading all the way to nothing —
// so the bar never looks empty on that side.
const STATUS_STYLE: Record<
  TaskStatus,
  { icon: typeof CircleDot; header: string; iconColor: string }
> = {
  todo: {
    icon: CircleDot,
    header:
      "bg-gradient-to-r from-blue-200 via-blue-100/80 to-blue-50/40 dark:from-blue-500/35 dark:via-blue-500/15 dark:to-blue-500/5",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  in_progress: {
    icon: Loader2,
    header:
      "bg-gradient-to-r from-amber-200 via-amber-100/80 to-amber-50/40 dark:from-amber-500/35 dark:via-amber-500/15 dark:to-amber-500/5",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  in_review: {
    icon: CircleDashed,
    header:
      "bg-gradient-to-r from-rose-200 via-rose-100/80 to-rose-50/40 dark:from-rose-500/35 dark:via-rose-500/15 dark:to-rose-500/5",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  completed: {
    icon: CheckCircle2,
    header:
      "bg-gradient-to-r from-emerald-200 via-emerald-100/80 to-emerald-50/40 dark:from-emerald-500/35 dark:via-emerald-500/15 dark:to-emerald-500/5",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  cancelled: {
    icon: CircleSlash,
    header:
      "bg-gradient-to-r from-muted via-muted/70 to-muted/30",
    iconColor: "text-muted-foreground",
  },
};

// The column titles shown once at the top of every open section, in the
// same order as the cells below. "Assignee" is dropped on "My tasks".
function ColumnHeader(props: { showAssignee: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-2 text-xs font-medium text-muted-foreground">
      <span className="flex-1 min-w-0">Task name</span>
      <span className="hidden w-48 shrink-0 xl:block">Description</span>
      {props.showAssignee ? (
        <span className="w-20 shrink-0">Assignee</span>
      ) : null}
      <span className="hidden w-24 shrink-0 sm:block">Start</span>
      <span className="w-24 shrink-0">Due Date</span>
      <span className="w-24 shrink-0">Priority</span>
      <span className="hidden w-28 shrink-0 lg:block">Time spent</span>
      <span className="hidden w-12 shrink-0 sm:block">Attach</span>
      <span className="hidden w-12 shrink-0 sm:block">Chat</span>
      <span className="w-8 shrink-0" />
    </div>
  );
}

// One task, drawn as a row with the same widths as the column header above.
function TaskRow(props: {
  task: Task;
  showAssignee: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
}) {
  const task = props.task;
  const attachments = getTaskAttachments(task);
  const commentCount = task.commentCount || 0;
  const late = isTaskLate(task);

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40">
      {/* Task name — a button so a click opens the documents and comments.
          The reassigned badge and the tags live under the title. */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => props.onOpenDetail(task)}
          className="truncate text-left text-sm font-medium hover:text-primary"
        >
          {task.title}
        </button>

        {task.tags.length > 0 || getReassignmentCount(task) > 0 ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <TaskReassignedBadge task={task} />
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <span className="hidden w-48 shrink-0 truncate text-sm text-muted-foreground xl:block">
        {task.description || "-"}
      </span>

      {props.showAssignee ? (
        <span className="w-20 shrink-0">
          {task.assignedTo ? (
            <Avatar
              name={task.assignedTo.name}
              photo={task.assignedTo.photo}
              size="sm"
            />
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </span>
      ) : null}

      <span className="hidden w-24 shrink-0 text-sm text-muted-foreground sm:block">
        {formatDate(task.startDate)}
      </span>

      <span
        className={cn(
          "w-24 shrink-0 text-sm",
          late ? "font-medium text-destructive" : "text-muted-foreground"
        )}
      >
        {formatDate(task.dueDate)}
      </span>

      <span className="w-24 shrink-0">
        <TaskPriorityFlag priority={task.priority} />
      </span>

      {/* The hours that really went into the task. A task nobody started
          leaves the cell empty rather than writing a zero in it. */}
      <span className="hidden w-28 shrink-0 text-xs text-muted-foreground lg:block">
        <TaskTimeSpent
          settledMinutesToday={task.settledMinutesToday}
          settledMinutesTotal={task.settledMinutesTotal}
          runningSince={task.runningSince}
          isDone={task.status === "completed"}
        />
      </span>

      {/* Attach — the paperclip and the number of documents. When the task
          has none the whole thing is greyed out but still opens the detail. */}
      <button
        type="button"
        onClick={() => props.onOpenDetail(task)}
        className={cn(
          "hidden w-12 shrink-0 items-center gap-1 text-sm sm:flex",
          attachments.length > 0
            ? "text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/50"
        )}
      >
        <Paperclip className="h-3.5 w-3.5" />
        {attachments.length}
      </button>

      <button
        type="button"
        onClick={() => props.onOpenDetail(task)}
        className={cn(
          "hidden w-12 shrink-0 items-center gap-1 text-sm sm:flex",
          commentCount > 0
            ? "text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/50"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {commentCount}
      </button>

      {/* The "..." menu. "Open details" is always there, so even an
          employee who can change nothing still reaches its own task. */}
      <div className="w-8 shrink-0 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => props.onOpenDetail(task)}>
              Open details
            </DropdownMenuItem>
            {task.canUpdateStatus && props.onUpdateStatus ? (
              <DropdownMenuItem onClick={() => props.onUpdateStatus?.(task)}>
                Update status
              </DropdownMenuItem>
            ) : null}
            {task.canReassign && props.onReassign ? (
              <DropdownMenuItem onClick={() => props.onReassign?.(task)}>
                Reassign
              </DropdownMenuItem>
            ) : null}
            {task.canEdit && props.onEdit ? (
              <DropdownMenuItem onClick={() => props.onEdit?.(task)}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {task.canEdit && props.onDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => props.onDelete?.(task)}
              >
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// One status section: the coloured header with the name and the count, and
// under it the table of that status. Pressing the header folds the section.
function StatusSection(props: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  isOpen: boolean;
  onToggle: () => void;
  showAssignee: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  onCreate?: () => void;
  onOpenDetail: (task: Task) => void;
}) {
  const style = STATUS_STYLE[props.status];
  const StatusIcon = style.icon;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div
        className={cn("flex items-center gap-2 px-4 py-2.5", style.header)}
      >
        <button
          type="button"
          onClick={props.onToggle}
          className="flex items-center gap-2"
        >
          {props.isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <StatusIcon className={cn("h-4 w-4", style.iconColor)} />
          <span className="text-sm font-semibold">{props.label}</span>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background/70 px-1.5 text-xs font-medium text-muted-foreground">
            {props.tasks.length}
          </span>
        </button>

        {props.onCreate ? (
          <button
            type="button"
            onClick={props.onCreate}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background/60 hover:text-foreground"
            title="Create task"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {props.isOpen ? (
        props.tasks.length === 0 ? (
          // An empty section has no columns to line up, so it stays plain and
          // centred on the card instead of sitting inside the wide, sliding
          // area below (where it would look pushed off to the right).
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No task here.
          </p>
        ) : (
          // The rows are a table drawn with flex, and their columns have fixed
          // widths. On a phone and a tablet those widths add up to more than
          // the screen, so the section slides sideways instead of squashing
          // the task names to nothing. "min-w-3xl" is the width the columns
          // really need; from "xl" up there is room for it anyway and nothing
          // ever scrolls.
          <div className="overflow-x-auto">
            <div className="min-w-3xl xl:min-w-0">
              <ColumnHeader showAssignee={props.showAssignee} />

              {props.tasks.map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  showAssignee={props.showAssignee}
                  onEdit={props.onEdit}
                  onDelete={props.onDelete}
                  onUpdateStatus={props.onUpdateStatus}
                  onReassign={props.onReassign}
                  onOpenDetail={props.onOpenDetail}
                />
              ))}
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}

// The whole list view: one section per status, stacked. This replaces the
// old flat, paginated table with the grouped board-like list of the design.
export function TaskListView(props: TaskListViewProps) {
  // Which sections the user folded. A status in this set is closed; every
  // other one is open, so everything starts open.
  const [closed, setClosed] = useState<Set<TaskStatus>>(new Set());

  function toggle(status: TaskStatus) {
    const next = new Set(closed);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    setClosed(next);
  }

  if (props.isLoading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {TASK_STATUS_GROUPS.map((group) => {
        const tasksHere = getTasksByStatus(props.data, group.status);

        // "Cancelled" is only shown when it actually holds something, so a
        // clean board is not cluttered by an empty grey section. The four
        // main statuses of the snapshot are always shown.
        if (group.status === "cancelled" && tasksHere.length === 0) {
          return null;
        }

        return (
          <StatusSection
            key={group.status}
            status={group.status}
            label={group.label}
            tasks={tasksHere}
            isOpen={!closed.has(group.status)}
            onToggle={() => toggle(group.status)}
            showAssignee={props.showAssignee}
            onEdit={props.onEdit}
            onDelete={props.onDelete}
            onUpdateStatus={props.onUpdateStatus}
            onReassign={props.onReassign}
            onCreate={props.onCreate}
            onOpenDetail={props.onOpenDetail}
          />
        );
      })}
    </div>
  );
}
