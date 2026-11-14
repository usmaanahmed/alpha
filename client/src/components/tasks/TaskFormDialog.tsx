import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { taskSchema } from "@/validators/task.schema";
import type { TaskFormValues } from "@/validators/task.schema";
import { TaskAttachmentPicker } from "@/components/tasks/TaskAttachmentPicker";
import { AssigneePicker } from "@/components/tasks/AssigneePicker";
import {
  useCreateTask,
  useUpdateTask,
  useAssignableEmployees,
  useUploadTaskAttachments,
} from "@/hooks/useTasks";
import type { Task } from "@/types/task.types";
import {
  TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  toDateInputValue,
} from "@/types/task.types";

// The empty form we start from when we create a new task.
const emptyForm: TaskFormValues = {
  title: "",
  description: "",
  assignedTo: "",
  priority: "medium",
  status: "todo",
  startDate: "",
  dueDate: "",
  estimatedHours: "",
  tags: "",
  remarks: "",
};

// One dialog for both jobs:
// - task is null  -> we are creating a new task
// - task is given -> we are editing that task
//
// The "assign to" list comes from the server, so an organization sees
// every employee, a manager sees its own department, and a team lead sees
// the members of its teams.
//
// defaultAssignedTo is used by the "My Team" page: the lead presses "Give
// task" on one member, and that person is already chosen in the form. It
// is only read when we create a new task.
export function TaskFormDialog(props: {
  isOpen: boolean;
  task: Task | null;
  defaultAssignedTo?: string;
  onClose: () => void;
}) {
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const uploadAttachments = useUploadTaskAttachments();

  // The documents the user chose in this form. They are sent in their own
  // request, right after the task is saved, because a task cannot receive
  // a file before it exists and has an id.
  const [files, setFiles] = useState<File[]>([]);

  // We ask for the employee list only while the dialog is open.
  const employeesQuery = useAssignableEmployees(props.isOpen);
  const employees = employeesQuery.data || [];

  // The AssigneePicker is the field that shows this list: it has its own
  // search line and it writes the people under the name of their
  // department, so nothing has to be sorted or grouped here.

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: emptyForm,
  });

  // A new dialog starts with no chosen file, so the files of the task we
  // saved before are never sent a second time to another task.
  useEffect(() => {
    setFiles([]);
  }, [props.isOpen, props.task]);

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.task) {
      // A new task, with the person the page already chose for us (the
      // "Give task" button of the My Team page) or nobody at all.
      form.reset({ ...emptyForm, assignedTo: props.defaultAssignedTo || "" });
      return;
    }

    // Editing. The old employee may be inactive or may have moved to
    // another department, so we keep it only while it is still in the list.
    const oldEmployeeIsStillThere = employees.some(
      (employee) => employee._id === props.task?.assignedTo?._id
    );

    form.reset({
      title: props.task.title,
      description: props.task.description,
      assignedTo: oldEmployeeIsStillThere
        ? String(props.task.assignedTo?._id)
        : "",
      priority: props.task.priority,
      status: props.task.status,
      startDate: toDateInputValue(props.task.startDate),
      dueDate: toDateInputValue(props.task.dueDate),
      estimatedHours: props.task.estimatedHours
        ? String(props.task.estimatedHours)
        : "",
      tags: props.task.tags.join(", "),
      remarks: props.task.remarks,
    });
  }, [props.isOpen, props.task, props.defaultAssignedTo, employees, form]);

  function onSubmit(values: TaskFormValues) {
    // The form keeps the hours as text, the server wants a number.
    const valuesToSend = {
      ...values,
      estimatedHours: Number(values.estimatedHours || 0),
    };

    if (props.task) {
      updateTask.mutate(
        { id: props.task._id, values: valuesToSend },
        { onSuccess: () => sendFilesThenClose(props.task!._id) }
      );
    } else {
      createTask.mutate(valuesToSend, {
        // The server answers with the task it just created, and that
        // answer is the only place where the new id can be read.
        onSuccess: (data) => sendFilesThenClose(data.data._id),
      });
    }
  }

  // The task is saved. If the user also chose documents we send them now,
  // and the dialog closes only when they really arrived.
  function sendFilesThenClose(taskId: string) {
    if (files.length === 0) {
      props.onClose();
      return;
    }

    uploadAttachments.mutate(
      { taskId: taskId, files: files },
      // The task itself is already saved, so we close the dialog even if
      // the files failed: the hook showed the error, and the user can add
      // them again from the details of the task.
      { onSettled: () => props.onClose() }
    );
  }

  const isSaving =
    createTask.isPending || updateTask.isPending || uploadAttachments.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            Choose the employee who has to do this task and when it must be
            finished.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Prepare the monthly report"
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="task-description">Description (optional)</Label>
            <Textarea
              id="task-description"
              rows={3}
              placeholder="What exactly has to be done?"
              {...form.register("description")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Assign to</Label>
            <AssigneePicker
              employees={employees}
              value={form.watch("assignedTo")}
              onChange={(employeeId) =>
                form.setValue("assignedTo", employeeId, { shouldValidate: true })
              }
              isLoading={employeesQuery.isLoading}
            />
            {employees.length === 0 && !employeesQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">
                There is nobody you can give a task to right now.
              </p>
            ) : null}
            {form.formState.errors.assignedTo ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.assignedTo.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Priority</Label>
              <Select
                value={form.watch("priority")}
                onValueChange={(value) =>
                  form.setValue("priority", value as TaskFormValues["priority"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a priority" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as TaskFormValues["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a status" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-start-date">Start date (optional)</Label>
              <Input
                id="task-start-date"
                type="date"
                {...form.register("startDate")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-due-date">Due date (optional)</Label>
              <Input id="task-due-date" type="date" {...form.register("dueDate")} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-hours">Estimated hours (optional)</Label>
              <Input
                id="task-hours"
                type="number"
                min="0"
                placeholder="8"
                {...form.register("estimatedHours")}
              />
              {form.formState.errors.estimatedHours ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.estimatedHours.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-tags">Tags (optional)</Label>
              <Input
                id="task-tags"
                placeholder="report, monthly"
                {...form.register("tags")}
              />
              <p className="text-xs text-muted-foreground">
                Write them with a comma between.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="task-remarks">Remarks (optional)</Label>
            <Textarea
              id="task-remarks"
              rows={2}
              placeholder="Anything the employee should know"
              {...form.register("remarks")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Documents (optional)</Label>
            <TaskAttachmentPicker
              files={files}
              onChange={setFiles}
              disabled={isSaving}
            />
            {props.task ? (
              <p className="text-xs text-muted-foreground">
                These files are added to the ones the task already has. To see
                or remove the old ones, open the details of the task.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.task ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
