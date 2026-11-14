import { useState } from "react";
import { TaskToolbar } from "@/components/tasks/TaskToolbar";
import type { TaskViewMode } from "@/components/tasks/TaskToolbar";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { Task } from "@/types/task.types";
import { EMPTY_TASK_FILTERS, filterTasks } from "@/types/task.types";

// Everything that is on a task page except the dialogs: the toolbar with
// its three view tabs, then the Kanban board, the grouped list or the
// month calendar.
//
// The three task pages (organization, team, my tasks) all use this one
// component, they only send a different list of tasks, a different first
// view, and (for the two that may create a task) an onCreate handler.
export function TaskWorkspace(props: {
  tasks: Task[];
  isLoading: boolean;
  // On the "My tasks" page every task is mine, so the name is hidden.
  showAssignee: boolean;
  // The organization has many tasks and starts on the list, an employee
  // has few and starts on the board.
  defaultView: TaskViewMode;
  onCreate?: () => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onUpdateStatus?: (task: Task) => void;
  onReassign?: (task: Task) => void;
}) {
  const { hasFeature } = useAuth();

  // Which views this organization has. The list is always there: it is what
  // the page falls back to when the SaaS owner took the two others away.
  const hasKanban = hasFeature(FEATURES.TASKS_KANBAN);
  const hasCalendar = hasFeature(FEATURES.TASKS_CALENDAR);

  // The page asks to open on the board, but the board may be switched off
  // for this organization, and then we start on the list instead.
  const firstView =
    props.defaultView === "board" && !hasKanban ? "list" : props.defaultView;

  const [view, setView] = useState<TaskViewMode>(firstView);

  // The view that is really drawn. It is not always the one in the state:
  // the SaaS owner can switch the board off while somebody is standing on
  // it, and the next paint has to land on the list instead of on nothing.
  const shownView =
    (view === "board" && !hasKanban) || (view === "calendar" && !hasCalendar)
      ? "list"
      : view;
  const [filters, setFilters] = useState(EMPTY_TASK_FILTERS);

  // The task whose documents and comments are open. Every page uses this
  // same workspace, so the detail dialog lives here and the three pages
  // have nothing to do about it.
  //
  // We keep the ID and not the task itself: after sending a comment or a
  // document the list is reloaded, and reading the task from the fresh
  // list is what makes the dialog show the new files at once. A saved
  // task object would stay the old one forever.
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const openTask = props.tasks.find((task) => task._id === openTaskId) || null;

  // The views show only the tasks that answer the filters.
  const visibleTasks = filterTasks(props.tasks, filters);

  return (
    <div className="flex flex-col gap-4">
      <TaskToolbar
        tasks={props.tasks}
        filters={filters}
        onChange={setFilters}
        view={view}
        onViewChange={setView}
        onCreate={props.onCreate}
      />

      {shownView === "board" ? (
        <TaskKanbanBoard
          data={visibleTasks}
          isLoading={props.isLoading}
          showAssignee={props.showAssignee}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onUpdateStatus={props.onUpdateStatus}
          onReassign={props.onReassign}
          onOpenDetail={(task) => setOpenTaskId(task._id)}
        />
      ) : shownView === "list" ? (
        <TaskListView
          data={visibleTasks}
          isLoading={props.isLoading}
          showAssignee={props.showAssignee}
          onEdit={props.onEdit}
          onDelete={props.onDelete}
          onUpdateStatus={props.onUpdateStatus}
          onReassign={props.onReassign}
          onCreate={props.onCreate}
          onOpenDetail={(task) => setOpenTaskId(task._id)}
        />
      ) : (
        <TaskCalendarView
          data={visibleTasks}
          isLoading={props.isLoading}
          onOpenDetail={(task) => setOpenTaskId(task._id)}
        />
      )}

      {/* Everybody who sees a task can open it, read its documents and
          write a comment, so this dialog is not behind any permission. */}
      <TaskDetailDialog task={openTask} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}
