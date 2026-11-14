import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChangeChequeStatus } from "@/hooks/useCheques";
import { getChequeStatusLabel } from "@/types/cheque.types";
import type { Cheque, ChequeStatus } from "@/types/cheque.types";

// The small form for the SIMPLE status moves that carry no extra papers:
// Issue, Receive, Return, Expire, and re-presenting a bounced cheque.
//
// The target status is decided by the button the user pressed, so this
// dialog only asks for an optional note.
export function ChequeStatusDialog(props: {
  cheque: Cheque | null;
  // The status we are moving to, or null when the dialog is closed.
  targetStatus: ChequeStatus | null;
  // The words shown on the title and the button, for example "Re-present".
  actionLabel: string;
  onClose: () => void;
}) {
  const changeStatus = useChangeChequeStatus();

  const form = useForm<{ note: string }>({
    defaultValues: { note: "" },
  });

  useEffect(() => {
    form.reset({ note: "" });
  }, [props.targetStatus, form]);

  function onSubmit(values: { note: string }) {
    if (!props.cheque || !props.targetStatus) {
      return;
    }

    changeStatus.mutate(
      {
        id: props.cheque._id,
        values: { status: props.targetStatus, note: values.note },
      },
      { onSuccess: () => props.onClose() }
    );
  }

  const isOpen = props.cheque !== null && props.targetStatus !== null;

  return (
    <Dialog open={isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.actionLabel} cheque</DialogTitle>
          <DialogDescription>
            Move cheque {props.cheque?.chequeNumber} to "
            {props.targetStatus ? getChequeStatusLabel(props.targetStatus) : ""}
            ". You may add a short note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="status-note">Note (optional)</Label>
            <Textarea id="status-note" rows={2} {...form.register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={changeStatus.isPending}>
              {changeStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {props.actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
