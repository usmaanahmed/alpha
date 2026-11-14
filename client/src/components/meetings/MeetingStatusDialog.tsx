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
import { useChangeMeetingStatus } from "@/hooks/useMeetings";
import { getMeetingStatusLabel } from "@/types/meeting.types";
import type { Meeting, MeetingStatus } from "@/types/meeting.types";

// The small form for a status move: start, complete, cancel, or re-open.
// The target status is decided by the button the user pressed, so this dialog
// only asks for an optional note.
export function MeetingStatusDialog(props: {
  meeting: Meeting | null;
  targetStatus: MeetingStatus | null;
  actionLabel: string;
  onClose: () => void;
}) {
  const changeStatus = useChangeMeetingStatus();

  const form = useForm<{ note: string }>({
    defaultValues: { note: "" },
  });

  useEffect(() => {
    form.reset({ note: "" });
  }, [props.targetStatus, form]);

  function onSubmit(values: { note: string }) {
    if (!props.meeting || !props.targetStatus) {
      return;
    }

    changeStatus.mutate(
      {
        id: props.meeting._id,
        values: { status: props.targetStatus, note: values.note },
      },
      { onSuccess: () => props.onClose() }
    );
  }

  const isOpen = props.meeting !== null && props.targetStatus !== null;

  return (
    <Dialog open={isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.actionLabel} meeting</DialogTitle>
          <DialogDescription>
            Move "{props.meeting?.title}" to "
            {props.targetStatus
              ? getMeetingStatusLabel(props.targetStatus)
              : ""}
            ". You may add a short note.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-status-note">Note (optional)</Label>
            <Textarea
              id="meeting-status-note"
              rows={2}
              {...form.register("note")}
            />
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
