import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteOrganization } from "@/hooks/useOrganizations";
import type { Organization } from "@/types/organization.types";

// A small confirm box before deleting an organization.
export function DeleteOrganizationDialog(props: {
  organization: Organization | null;
  onClose: () => void;
}) {
  const deleteOrganization = useDeleteOrganization();

  function onConfirm() {
    if (!props.organization) {
      return;
    }

    deleteOrganization.mutate(props.organization._id, {
      onSuccess: () => {
        props.onClose();
      },
    });
  }

  return (
    <Dialog open={props.organization !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete organization</DialogTitle>
          <DialogDescription>
            "{props.organization?.name}" and its login account will be removed. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={deleteOrganization.isPending}
          >
            {deleteOrganization.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
