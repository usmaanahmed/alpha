import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { TaskStatusDialog } from "@/components/tasks/TaskStatusDialog";
import { TaskReassignDialog } from "@/components/tasks/TaskReassignDialog";
import { useTasks, useDeleteTask } from "@/hooks/useTasks";
import type { Task } from "@/types/task.types";

// A manager and a team lead open this page. It shows the tasks they gave:
// a manager to the employees of its own department, a team lead to the
// members of its team.
export function TeamTasksPage() {
  const tasksQuery = useTasks("created");
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
        title="Team Tasks"
        description="The tasks you gave to your people. Drag a card to move the task to another status."
      />

      <TaskWorkspace
        tasks={tasksQuery.data || []}
        isLoading={tasksQuery.isLoading}
        showAssignee={true}
        // A manager follows one team, so the board is the better start.
        defaultView="board"
        onCreate={openCreateForm}
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
