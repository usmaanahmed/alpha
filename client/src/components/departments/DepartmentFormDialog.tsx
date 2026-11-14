import { useEffect } from "react";
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
import { departmentSchema } from "@/validators/department.schema";
import type { DepartmentFormValues } from "@/validators/department.schema";
import {
  useCreateDepartment,
  useUpdateDepartment,
} from "@/hooks/useDepartments";
import type { Department } from "@/types/department.types";

// One dialog for both jobs:
// - department is null  -> we are creating a new department
// - department is given -> we are editing that department
export function DepartmentFormDialog(props: {
  isOpen: boolean;
  department: Department | null;
  onClose: () => void;
}) {
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  const form = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (props.isOpen) {
      form.reset({
        name: props.department ? props.department.name : "",
        description: props.department ? props.department.description : "",
        status: props.department ? props.department.status : "active",
      });
    }
  }, [props.isOpen, props.department, form]);

  function onSubmit(values: DepartmentFormValues) {
    if (props.department) {
      updateDepartment.mutate(
        { id: props.department._id, values: values },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createDepartment.mutate(values, { onSuccess: () => props.onClose() });
    }
  }

  const isSaving = createDepartment.isPending || updateDepartment.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.department ? "Edit department" : "Create department"}
          </DialogTitle>
          <DialogDescription>
            A department belongs only to your organization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="department-name">Department name</Label>
            <Input
              id="department-name"
              placeholder="Engineering"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="department-description">Description (optional)</Label>
            <Textarea
              id="department-description"
              placeholder="What this department does"
              {...form.register("description")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) =>
                form.setValue("status", value as "active" | "inactive")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              An inactive department cannot be chosen in the employee form.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.department ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
