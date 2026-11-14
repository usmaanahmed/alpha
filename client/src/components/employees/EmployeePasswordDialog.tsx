import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { employeePasswordSchema } from "@/validators/employee.schema";
import type { EmployeePasswordFormValues } from "@/validators/employee.schema";
import { useChangeEmployeePassword } from "@/hooks/useEmployees";
import type { Employee } from "@/types/employee.types";

// Dialog used by the organization to set a new login password
// for one of its employees.
export function EmployeePasswordDialog(props: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const changePassword = useChangeEmployeePassword();

  const form = useForm<EmployeePasswordFormValues>({
    resolver: zodResolver(employeePasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  function onSubmit(values: EmployeePasswordFormValues) {
    if (!props.employee) {
      return;
    }

    changePassword.mutate(
      { id: props.employee._id, password: values.password },
      {
        onSuccess: () => {
          form.reset();
          props.onClose();
        },
      }
    );
  }

  return (
    <Dialog open={props.employee !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            New login password for {props.employee?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-new-password">New password</Label>
            <Input
              id="employee-new-password"
              type="text"
              placeholder="At least 6 characters"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={changePassword.isPending}>
              {changePassword.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
