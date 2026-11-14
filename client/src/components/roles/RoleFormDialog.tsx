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
import { PermissionGrid } from "@/components/roles/PermissionGrid";
import { roleSchema } from "@/validators/role.schema";
import type { RoleFormValues } from "@/validators/role.schema";
import {
  useCreateRole,
  useUpdateRole,
  usePermissionCatalog,
} from "@/hooks/useRoles";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/role.types";

// One dialog for both jobs:
// - role is null  -> we are creating a new role
// - role is given -> we are editing that role
export function RoleFormDialog(props: {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const catalogQuery = usePermissionCatalog();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
      permissions: [],
      status: "active",
    },
  });

  // Every time the dialog opens we fill the form:
  // with the values of the role we edit, or with empty values.
  useEffect(() => {
    if (props.isOpen) {
      form.reset({
        name: props.role ? props.role.name : "",
        description: props.role ? props.role.description : "",
        permissions: props.role ? props.role.permissions : [],
        status: props.role ? props.role.status : "active",
      });
    }
  }, [props.isOpen, props.role, form]);

  function onSubmit(values: RoleFormValues) {
    const body = {
      name: values.name,
      description: values.description || "",
      permissions: values.permissions,
      status: values.status,
    };

    if (props.role) {
      updateRole.mutate(
        { id: props.role._id, values: body },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createRole.mutate(body, { onSuccess: () => props.onClose() });
    }
  }

  const isSaving = createRole.isPending || updateRole.isPending;

  // An employee cannot give away a permission it does not have itself, so the
  // grid greys those boxes out. The organization account owns everything
  // inside its organization, so for it nothing is greyed out at all.
  const allowed =
    user?.role === "organization" ? undefined : user?.permissions || [];

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.role ? "Edit role" : "Create role"}</DialogTitle>
          <DialogDescription>
            A role belongs to your organization only. An inactive role is kept,
            but it is not offered any more in the employee form and the people
            who carry it lose its permissions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="role-name">Role name</Label>
              <Input id="role-name" placeholder="Manager" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
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
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              rows={2}
              placeholder="What this role is for"
              {...form.register("description")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Permissions</Label>
            <PermissionGrid
              groups={catalogQuery.data || []}
              isLoading={catalogQuery.isLoading}
              selected={form.watch("permissions")}
              onChange={(next) =>
                form.setValue("permissions", next, { shouldDirty: true })
              }
              allowed={allowed}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.role ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
