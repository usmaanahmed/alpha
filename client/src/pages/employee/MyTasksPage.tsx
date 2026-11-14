import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { TaskWorkspace } from "@/components/tasks/TaskWorkspace";
import { TaskStatusDialog } from "@/components/tasks/TaskStatusDialog";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@/types/task.types";

// The tasks I received. An employee can only move a task to another
// status and write a remark, so there is no "new task" button here.
export function MyTasksPage() {
  const tasksQuery = useTasks("assigned");

  const [taskToUpdateStatus, setTaskToUpdateStatus] = useState<Task | null>(null);

  return (
    <div>
      <PageHeader
        title="My Tasks"
        description="The tasks your organization or your manager gave to you. Drag a card to move the task to another status."
      />

      <TaskWorkspace
        tasks={tasksQuery.data || []}
        isLoading={tasksQuery.isLoading}
        // Every task here is mine, so that line is hidden on the cards.
        showAssignee={false}
        // An employee has few tasks and only wants to know what to do
        // next, which is exactly what the board shows.
        defaultView="board"
        onUpdateStatus={setTaskToUpdateStatus}
      />

      <TaskStatusDialog
        task={taskToUpdateStatus}
        onClose={() => setTaskToUpdateStatus(null)}
      />
    </div>
  );
}
