import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskStatusDialog } from "@/components/tasks/TaskStatusDialog";
import { TaskReassignDialog } from "@/components/tasks/TaskReassignDialog";
import { useTasks, useDeleteTask } from "@/hooks/useTasks";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Task } from "@/types/task.types";

// The page of every task of the organization. Whoever opens it carries
// "tasks.view_all", so the server answers with the full list and the "view"
// we ask for changes nothing here.
//
// The buttons on each single task are not decided here: every task the server
// sends carries its own canEdit and canUpdateStatus, because the answer is
// different for every row.
export function TasksPage() {
  const { can } = useAuth();
  const tasksQuery = useTasks("assigned");
  const deleteTask = useDeleteTask();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToUpdateStatus, setTaskToUpdateStatus] = useState<Task | null>(null);
  const [taskToReassign, setTaskToReassign] = useState<Task | null>(null);

  function openCreateForm() {
    setTaskToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Task" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.TASKS_ASSIGN));

  function openEditForm(task: Task) {
    setTaskToEdit(task);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!taskToDelete) {
      return;
    }

    deleteTask.mutate(taskToDelete._id, {
      onSuccess: () => setTaskToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Tasks"
        description="Every task of your organization. Switch between the board, the grouped list and the calendar, and drag a card to another status."
      />

      <TaskWorkspace
        tasks={tasksQuery.data || []}
        isLoading={tasksQuery.isLoading}
        showAssignee={true}
        // The organization has the tasks of everybody, so the list with
        // its columns answers more questions than the board.
        defaultView="list"
        // Without "tasks.assign" there is no "New task" button at all: the
        // workspace only draws it when it is given an onCreate.
        onCreate={can(PERMISSIONS.TASKS_ASSIGN) ? openCreateForm : undefined}
        onEdit={openEditForm}
        onDelete={setTaskToDelete}
        onUpdateStatus={setTaskToUpdateStatus}
        onReassign={setTaskToReassign}
      />

      <TaskFormDialog
        isOpen={isFormOpen}
        task={taskToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <TaskStatusDialog
        task={taskToUpdateStatus}
        onClose={() => setTaskToUpdateStatus(null)}
      />

      <TaskReassignDialog
        task={taskToReassign}
        onClose={() => setTaskToReassign(null)}
      />

      <ConfirmDialog
        isOpen={taskToDelete !== null}
        title="Delete task"
        description={"The task \"" + (taskToDelete?.title || "") + "\" will be removed."}
        isPending={deleteTask.isPending}
        onConfirm={confirmDelete}
        onClose={() => setTaskToDelete(null)}
      />
    </div>
  );
}
