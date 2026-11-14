import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { taskStatusSchema } from "@/validators/task.schema";
import type { TaskStatusFormValues } from "@/validators/task.schema";
import { useUpdateTaskStatus } from "@/hooks/useTasks";
import type { Task } from "@/types/task.types";
import { TASK_STATUS_OPTIONS } from "@/types/task.types";

// The small form an employee uses on its own task: move it to another
// status and write a short note about it.
export function TaskStatusDialog(props: { task: Task | null; onClose: () => void }) {
  const updateStatus = useUpdateTaskStatus();

  const form = useForm<TaskStatusFormValues>({
    resolver: zodResolver(taskStatusSchema),
    defaultValues: {
      status: "todo",
      remarks: "",
    },
  });

  useEffect(() => {
    if (!props.task) {
      return;
    }

    form.reset({
      status: props.task.status,
      remarks: props.task.remarks,
    });
  }, [props.task, form]);

  function onSubmit(values: TaskStatusFormValues) {
    if (!props.task) {
      return;
    }

    updateStatus.mutate(
      { id: props.task._id, values: values },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.task !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update status</DialogTitle>
          <DialogDescription>{props.task?.title}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) =>
                form.setValue("status", value as TaskStatusFormValues["status"])
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
            <Label htmlFor="status-remarks">Remarks (optional)</Label>
            <Textarea
              id="status-remarks"
              rows={3}
              placeholder="What did you do?"
              {...form.register("remarks")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateStatus.isPending}>
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
