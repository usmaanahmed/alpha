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

// A small "are you sure?" box.
// We use it before deleting a role, a department or an employee.
export function ConfirmDialog(props: {
  isOpen: boolean;
  title: string;
  description: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={props.onConfirm}
            disabled={props.isPending}
          >
            {props.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
