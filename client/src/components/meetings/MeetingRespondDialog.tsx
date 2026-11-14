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
import { useRespondToMeeting } from "@/hooks/useMeetings";
import type { Meeting, AttendeeAnswer } from "@/types/meeting.types";

// The invited employee's answer. The answer (accept / decline / attended) is
// decided by the button the employee pressed, so this dialog only asks for an
// optional note.
export function MeetingRespondDialog(props: {
  meeting: Meeting | null;
  response: AttendeeAnswer | null;
  actionLabel: string;
  onClose: () => void;
}) {
  const respond = useRespondToMeeting();

  const form = useForm<{ note: string }>({
    defaultValues: { note: "" },
  });

  useEffect(() => {
    form.reset({ note: "" });
  }, [props.response, form]);

  function onSubmit(values: { note: string }) {
    if (!props.meeting || !props.response) {
      return;
    }

    respond.mutate(
      {
        id: props.meeting._id,
        values: { response: props.response, note: values.note },
      },
      { onSuccess: () => props.onClose() }
    );
  }

  const isOpen = props.meeting !== null && props.response !== null;

  return (
    <Dialog open={isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{props.actionLabel}</DialogTitle>
          <DialogDescription>
            Your answer for "{props.meeting?.title}". You may add a short note
            for the organizer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="respond-note">Note (optional)</Label>
            <Textarea id="respond-note" rows={2} {...form.register("note")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={respond.isPending}>
              {respond.isPending ? (
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
