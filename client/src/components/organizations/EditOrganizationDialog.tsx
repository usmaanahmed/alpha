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
import { updateOrganizationSchema } from "@/validators/organization.schema";
import type { UpdateOrganizationFormValues } from "@/validators/organization.schema";
import { useUpdateOrganization } from "@/hooks/useOrganizations";
import type { Organization } from "@/types/organization.types";

// Dialog used to edit one organization.
// "organization" is null when no row is selected.
export function EditOrganizationDialog(props: {
  organization: Organization | null;
  onClose: () => void;
}) {
  const updateOrganization = useUpdateOrganization();

  const form = useForm<UpdateOrganizationFormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      status: "active",
    },
  });

  // When a new row is selected, fill the form with its values.
  useEffect(() => {
    if (props.organization) {
      form.reset({
        name: props.organization.name,
        phone: props.organization.phone,
        address: props.organization.address,
        status: props.organization.status,
      });
    }
  }, [props.organization, form]);

  function onSubmit(values: UpdateOrganizationFormValues) {
    if (!props.organization) {
      return;
    }

    updateOrganization.mutate(
      { id: props.organization._id, values: values },
      {
        onSuccess: () => {
          props.onClose();
        },
      }
    );
  }

  return (
    <Dialog open={props.organization !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit organization</DialogTitle>
          <DialogDescription>
            The login email cannot be changed here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Organization name</Label>
            <Input id="edit-name" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-phone">Phone</Label>
            <Input id="edit-phone" {...form.register("phone")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-address">Address</Label>
            <Textarea id="edit-address" {...form.register("address")} />
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
              An inactive organization cannot login.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateOrganization.isPending}>
              {updateOrganization.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
