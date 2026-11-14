import { useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { GripVertical, MoreHorizontal, Paperclip, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskReassignedBadge } from "@/components/tasks/TaskReassignedBadge";
import { TaskTimeSpent } from "@/components/tasks/TaskTimeSpent";
import { PersonInline } from "@/components/common/PersonInline";
import type { Task, TaskPriority } from "@/types/task.types";
import {
  getPriorityLabel,
  formatDate,
  isTaskLate,
  getPreviousAssignee,
  getTaskAttachments,
} from "@/types/task.types";

interface TaskCardProps {
  task: Task;
  // On the "My tasks" page every card is mine, so that line is hidden.
  showAssignee: boolean;
  // These four are optional because the employee page has no menu at all.
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  // Open the documents and the comments of the task.
  onOpenDetail: (task: Task) => void;
}

// A "high" or "urgent" task is red, so it is easy to see on the board.
function getPriorityVariant(priority: TaskPriority) {
  if (priority === "urgent" || priority === "high") {
    return "destructive" as const;
  }
  if (priority === "medium") {
    return "default" as const;
  }
  return "secondary" as const;
}

// One card of the board. Somebody who is not allowed to change the
// status of this task cannot drag the card, the card is only readable.
export function TaskCard(props: TaskCardProps) {
  const task = props.task;
  const canDrag = task.canUpdateStatus;

  // useDraggable gives us everything dnd-kit needs on this card:
  // - setNodeRef: dnd-kit must know the real html element,
  // - listeners / attributes: the mouse and keyboard events,
  // - isDragging: true while this card is in the air.
  const draggable = useDraggable({
    id: task._id,
    disabled: !canDrag,
  });

  // "Open" is always in the menu, so the menu is always there: even an
  // employee who can change nothing has to reach the documents and the
  // comments of their own task.
  const attachments = getTaskAttachments(task);
  const commentCount = task.commentCount || 0;

  // The person who had this task before the one who has it now.
  const previousAssignee = getPreviousAssignee(task);

  // Where the mouse was when it went down on the card. We need it to know
  // if the user only tapped the card or really dragged it away.
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  // "Capture" means this runs on the way down, before the children. So we
  // still write the position even when a child (the menu, the counters)
  // stops the event to protect itself from the drag.
  function handlePointerDownCapture(event: React.PointerEvent) {
    pointerStart.current = { x: event.clientX, y: event.clientY };
  }

  // A tap opens the task, a drag must not. The mouse never stands
  // perfectly still, so everything under 5 pixels is still a tap.
  function handleClick(event: React.MouseEvent) {
    const start = pointerStart.current;
    pointerStart.current = null;

    if (!start) {
      return;
    }

    const movedX = Math.abs(event.clientX - start.x);
    const movedY = Math.abs(event.clientY - start.y);

    if (movedX > 5 || movedY > 5) {
      return;
    }

    props.onOpenDetail(task);
  }

  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      onPointerDownCapture={handlePointerDownCapture}
      onClick={handleClick}
      className={
        // The hand tells the user the card can be pressed. While a card
        // is really moving we show the closed hand instead.
        "flex select-none flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm cursor-pointer " +
        (canDrag ? "active:cursor-grabbing " : "") +
        // The card we are dragging stays in place as a pale copy, the
        // real card that follows the mouse is drawn by the DragOverlay.
        (draggable.isDragging ? "opacity-40" : "")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1">
          {canDrag ? (
            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : null}
          <span className="text-sm font-medium">{task.title}</span>
        </div>

        {/* The menu must not start a drag, so we stop the mouse event
            before dnd-kit can see it. The click is stopped too, otherwise
            pressing the menu would also open the detail dialog. */}
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
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

      {task.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={getPriorityVariant(task.priority)}>
          {getPriorityLabel(task.priority)}
        </Badge>

        <TaskReassignedBadge task={task} />

        {task.dueDate ? (
          <span
            className={
              "text-xs " +
              (isTaskLate(task) ? "text-destructive" : "text-muted-foreground")
            }
          >
            {formatDate(task.dueDate)}
            {isTaskLate(task) ? " (late)" : ""}
          </span>
        ) : null}
      </div>

      {/* How long the card has been worked on. It draws nothing for a task
          nobody has started, so a fresh board stays clean. */}
      <TaskTimeSpent
        settledMinutesToday={task.settledMinutesToday}
        settledMinutesTotal={task.settledMinutesTotal}
        runningSince={task.runningSince}
        isDone={task.status === "completed"}
        className="text-xs text-muted-foreground"
      />

      {/* The two counters: how many documents and how many comments this
          task has. Pressing them opens the task on that same content, so
          the card is also the door to the discussion. */}
      {attachments.length > 0 || commentCount > 0 ? (
        <div
          className="flex items-center gap-3"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {attachments.length > 0 ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => props.onOpenDetail(task)}
            >
              <Paperclip className="h-3 w-3" />
              {attachments.length}
            </button>
          ) : null}

          {commentCount > 0 ? (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => props.onOpenDetail(task)}
            >
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </button>
          ) : null}
        </div>
      ) : null}

      {props.showAssignee ? (
        <div className="flex flex-col gap-1">
          {/* The picture and the name of the person who has the task, and
              the department written after it in grey. */}
          <PersonInline
            name={task.assignedTo?.name || "Nobody"}
            photo={task.assignedTo?.photo || ""}
            note={task.department ? "· " + task.department.name : undefined}
            textClassName="text-xs"
          />

          {previousAssignee ? (
            <PersonInline
              name={previousAssignee.name}
              photo={previousAssignee.photo}
              size="xs"
              textClassName="text-xs text-violet-700 dark:text-violet-400"
              className="pl-0.5"
              note="had it before"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
