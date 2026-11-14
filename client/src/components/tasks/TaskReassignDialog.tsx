import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { TaskAssignmentTimeline } from "@/components/tasks/TaskAssignmentTimeline";
import { Avatar } from "@/components/common/Avatar";
import { PersonInline } from "@/components/common/PersonInline";
import { taskReassignSchema } from "@/validators/task.schema";
import type { TaskReassignFormValues } from "@/validators/task.schema";
import { useReassignTask, useAssignableEmployees } from "@/hooks/useTasks";
import type { Task } from "@/types/task.types";
import { getStatusLabel } from "@/types/task.types";

// Give a task to another person.
//
// This is on purpose NOT the edit form: nothing about the work changes
// here, only the person who has to do it. The reason is required, and the
// move is written in the timeline the dialog shows at the bottom.
export function TaskReassignDialog(props: {
  task: Task | null;
  onClose: () => void;
}) {
  const reassignTask = useReassignTask();

  // We ask for the employee list only while the dialog is open.
  const employeesQuery = useAssignableEmployees(props.task !== null);
  const allEmployees = employeesQuery.data || [];

  // The person who has the task now must not be in the list: giving the
  // task to the same person is not a reassignment.
  const employees = allEmployees.filter(
    (employee) => employee._id !== props.task?.assignedTo?._id
  );

  // Same two groups as the create form: my own team, and the managers of
  // the other departments.
  const myTeam = employees.filter((employee) => !employee.isOtherDepartment);
  const otherDepartmentManagers = employees.filter(
    (employee) => employee.isOtherDepartment
  );

  const form = useForm<TaskReassignFormValues>({
    resolver: zodResolver(taskReassignSchema),
    defaultValues: {
      assignedTo: "",
      reason: "",
      resetStatus: false,
    },
  });

  useEffect(() => {
    if (!props.task) {
      return;
    }

    // A task somebody already started is the one case where the new person
    // usually has to begin again, so there the switch starts on.
    const workAlreadyStarted =
      props.task.status === "in_progress" || props.task.status === "in_review";

    form.reset({
      assignedTo: "",
      reason: "",
      resetStatus: workAlreadyStarted,
    });
  }, [props.task, form]);

  // The name of the person we are giving the task to, for the toast and
  // for the sentence under the switch.
  const chosenId = form.watch("assignedTo");
  const chosenEmployee = employees.find(
    (employee) => employee._id === chosenId
  );

  function onSubmit(values: TaskReassignFormValues) {
    if (!props.task) {
      return;
    }

    reassignTask.mutate(
      {
        id: props.task._id,
        values: values,
        newEmployeeName: chosenEmployee?.name || "the new employee",
      },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.task !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reassign task</DialogTitle>
          <DialogDescription>{props.task?.title}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* The handover itself, read from left to right: the person who
              has the task today, and the person who will have it. */}
          <div className="flex items-end gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">From</span>
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  name={props.task?.assignedTo?.name || "Nobody"}
                  photo={props.task?.assignedTo?.photo || ""}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {props.task?.assignedTo?.name || "-"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {props.task?.department?.name || "-"}
                  </p>
                </div>
              </div>
            </div>

            <ArrowRight className="mb-1 h-4 w-4 shrink-0 text-muted-foreground" />

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">To</span>
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  name={chosenEmployee ? chosenEmployee.name : "?"}
                  photo={chosenEmployee ? chosenEmployee.photo : ""}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {chosenEmployee ? chosenEmployee.name : "Nobody chosen yet"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {chosenEmployee ? chosenEmployee.department.name : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>New employee</Label>
            <Select
              value={form.watch("assignedTo")}
              onValueChange={(value) =>
                form.setValue("assignedTo", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose who takes this task" />
              </SelectTrigger>
              <SelectContent>
                {myTeam.length > 0 ? (
                  <SelectGroup>
                    {otherDepartmentManagers.length > 0 ? (
                      <SelectLabel>My department</SelectLabel>
                    ) : null}
                    {myTeam.map((employee) => (
                      <SelectItem key={employee._id} value={employee._id}>
                        <PersonInline
                          name={employee.name}
                          photo={employee.photo}
                          note={
                            "(" +
                            employee.role.name +
                            " - " +
                            employee.department.name +
                            ")"
                          }
                        />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}

                {otherDepartmentManagers.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Other departments (goes to their manager)</SelectLabel>
                    {otherDepartmentManagers.map((employee) => (
                      <SelectItem key={employee._id} value={employee._id}>
                        <PersonInline
                          name={employee.name}
                          photo={employee.photo}
                          note={"(Manager - " + employee.department.name + ")"}
                        />
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
              </SelectContent>
            </Select>
            {employees.length === 0 && !employeesQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">
                There is nobody else you can give this task to right now.
              </p>
            ) : null}
            {form.formState.errors.assignedTo ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.assignedTo.message}
              </p>
            ) : null}
          </div>

          {/* Required: the timeline has to be able to say why the task
              moved, months later, to somebody who was not there. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="reassign-reason">Reason for reassignment</Label>
            <Textarea
              id="reassign-reason"
              rows={3}
              placeholder="On leave until the 5th, so the report has to move."
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="reassign-reset">Start again from "To do"</Label>
              <p className="text-xs text-muted-foreground">
                {form.watch("resetStatus")
                  ? "The status goes back to \"To do\" and the old remarks are cleared."
                  : "The task keeps the status \"" +
                    getStatusLabel(props.task?.status || "todo") +
                    "\" and the remarks of the person who had it."}
              </p>
            </div>

            <Switch
              id="reassign-reset"
              checked={form.watch("resetStatus")}
              onCheckedChange={(checked) =>
                form.setValue("resetStatus", checked)
              }
            />
          </div>

          {/* Saying what will happen before the button is pressed: this
              action takes the task away from somebody. */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <PersonInline
              name={props.task?.assignedTo?.name || "The current employee"}
              photo={props.task?.assignedTo?.photo || ""}
              size="xs"
              textClassName="text-xs"
            />
            <span>will no longer see this task.</span>

            {chosenEmployee ? (
              <>
                <PersonInline
                  name={chosenEmployee.name}
                  photo={chosenEmployee.photo}
                  size="xs"
                  textClassName="text-xs"
                />
                <span>will find it in My Tasks.</span>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Assignment timeline</span>
              <Badge variant="reassigned">
                {props.task ? props.task.assignmentHistory?.length || 0 : 0}
              </Badge>
            </div>
            {props.task ? <TaskAssignmentTimeline task={props.task} /> : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={reassignTask.isPending}>
              {reassignTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Reassign task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
