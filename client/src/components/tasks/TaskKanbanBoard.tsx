import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "@/components/tasks/TaskCard";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import type { Task, TaskStatus } from "@/types/task.types";

// The columns of the board. There is one column for every status the
// server knows, so no task can ever be invisible here.
const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "in_review", label: "In review" },
  { status: "completed", label: "Done" },
  { status: "cancelled", label: "Cancelled" },
];

interface TaskKanbanBoardProps {
  data: Task[];
  isLoading: boolean;
  // On the "My tasks" page every card is mine, so that line is hidden.
  showAssignee: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  // Open the documents and the comments of the task. Everybody who sees
  // a task can do that, so unlike the four above it is never missing.
  onOpenDetail: (task: Task) => void;
}

// One column. useDroppable tells dnd-kit that a card can be let go here,
// and isOver is true while a card is flying over this column.
function BoardColumn(props: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  showAssignee: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  onOpenDetail: (task: Task) => void;
}) {
  const droppable = useDroppable({ id: props.status });

  return (
    <div
      ref={droppable.setNodeRef}
      className={
        "flex min-h-[200px] flex-col gap-3 rounded-lg border bg-muted/40 p-3 " +
        (droppable.isOver ? "border-primary bg-muted" : "")
      }
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{props.label}</h3>
        <Badge variant="secondary">{props.tasks.length}</Badge>
      </div>

      <div className="flex flex-col gap-2">
        {props.tasks.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No task here.
          </p>
        ) : (
          props.tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              showAssignee={props.showAssignee}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
              onUpdateStatus={props.onUpdateStatus}
              onReassign={props.onReassign}
              onOpenDetail={props.onOpenDetail}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function TaskKanbanBoard(props: TaskKanbanBoardProps) {
  const updateStatus = useUpdateTaskStatus();

  // We keep our own copy of the tasks so a card can move to the new
  // column at once, without waiting for the server. Every time the
  // server sends a new list we take that list again.
  const [tasks, setTasks] = useState<Task[]>(props.data);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setTasks(props.data);
  }, [props.data]);

  // Without this small distance a simple click on the menu would already
  // count as a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const draggedTask = tasks.find((task) => task._id === draggedTaskId) || null;

  function handleDragStart(event: DragStartEvent) {
    setDraggedTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedTaskId(null);

    // The card was let go outside of a column.
    if (!event.over) {
      return;
    }

    const taskId = String(event.active.id);
    const newStatus = String(event.over.id) as TaskStatus;

    const task = tasks.find((item) => item._id === taskId);

    if (!task || task.status === newStatus) {
      return;
    }

    // Move the card first, so the board answers immediately.
    // We keep the old list, because if the server says no we have to
    // put the card back where it was.
    const tasksBeforeTheDrag = tasks;

    setTasks(
      tasks.map((item) =>
        item._id === taskId ? { ...item, status: newStatus } : item
      )
    );

    // The server saves remarks together with the status, so we send the
    // remarks the task already has, otherwise they would be erased.
    updateStatus.mutate(
      {
        id: taskId,
        values: { status: newStatus, remarks: task.remarks },
      },
      {
        // The hook already shows the error message, here we only undo
        // the move so the board never lies about the real status.
        onError: () => setTasks(tasksBeforeTheDrag),
      }
    );
  }

  if (props.isLoading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {BOARD_COLUMNS.map((column) => (
            <BoardColumn
              key={column.status}
              status={column.status}
              label={column.label}
              tasks={tasks.filter((task) => task.status === column.status)}
              showAssignee={props.showAssignee}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
              onUpdateStatus={props.onUpdateStatus}
              onReassign={props.onReassign}
              onOpenDetail={props.onOpenDetail}
            />
          ))}
        </div>

        {/* The card that follows the mouse while we drag. */}
        <DragOverlay>
          {draggedTask ? (
            <div className="rounded-lg border bg-card p-3 shadow-lg">
              <span className="text-sm font-medium">{draggedTask.title}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
