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
import { changePasswordSchema } from "@/validators/organization.schema";
import type { ChangePasswordFormValues } from "@/validators/organization.schema";
import { useChangeOrganizationPassword } from "@/hooks/useOrganizations";
import type { Organization } from "@/types/organization.types";

// Dialog used by the SaaS owner to set a new login password
// for one organization.
export function ChangePasswordDialog(props: {
  organization: Organization | null;
  onClose: () => void;
}) {
  const changePassword = useChangeOrganizationPassword();

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  function onSubmit(values: ChangePasswordFormValues) {
    if (!props.organization) {
      return;
    }

    changePassword.mutate(
      { id: props.organization._id, password: values.password },
      {
        onSuccess: () => {
          form.reset();
          props.onClose();
        },
      }
    );
  }

  return (
    <Dialog open={props.organization !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            New login password for {props.organization?.name}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
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
