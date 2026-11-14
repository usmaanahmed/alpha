import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { meetingRescheduleSchema } from "@/validators/meeting.schema";
import type { MeetingRescheduleFormValues } from "@/validators/meeting.schema";
import { useRescheduleMeeting } from "@/hooks/useMeetings";
import { getMeetingConflicts } from "@/api/meeting.api";
import { MeetingConflictNotice } from "./MeetingConflictNotice";
import { toDateTimeInput } from "@/types/meeting.types";
import type { Meeting, MeetingConflict } from "@/types/meeting.types";

// Move a meeting to another time. Everybody's answer is cleared when this
// happens, because the old "yes" was for the old time.
export function MeetingRescheduleDialog(props: {
  meeting: Meeting | null;
  onClose: () => void;
}) {
  const reschedule = useRescheduleMeeting();

  const [conflicts, setConflicts] = useState<MeetingConflict[]>([]);
  const [override, setOverride] = useState(false);

  const form = useForm<MeetingRescheduleFormValues>({
    resolver: zodResolver(meetingRescheduleSchema),
    defaultValues: { startAt: "", durationMinutes: 30, note: "" },
  });

  useEffect(() => {
    setConflicts([]);
    setOverride(false);

    if (props.meeting) {
      form.reset({
        startAt: toDateTimeInput(props.meeting.startAt),
        durationMinutes: props.meeting.durationMinutes,
        note: "",
      });
    }
  }, [props.meeting, form]);

  // A changed time makes the old clash list wrong, so we clear it.
  const watchedStart = form.watch("startAt");
  const watchedDuration = form.watch("durationMinutes");
  useEffect(() => {
    setConflicts([]);
    setOverride(false);
  }, [watchedStart, watchedDuration]);

  function onSubmit(values: MeetingRescheduleFormValues) {
    if (!props.meeting) {
      return;
    }

    reschedule.mutate(
      {
        id: props.meeting._id,
        values: {
          startAt: values.startAt,
          durationMinutes: values.durationMinutes,
          note: values.note,
          ignoreConflicts: override,
        },
      },
      {
        onSuccess: () => props.onClose(),
        onError: (error) => {
          const found = getMeetingConflicts(error);
          if (found) {
            setConflicts(found);
            setOverride(true);
          }
        },
      }
    );
  }

  return (
    <Dialog open={props.meeting !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule meeting</DialogTitle>
          <DialogDescription>
            Move "{props.meeting?.title}" to a new time. Everybody will be asked
            to accept again.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reschedule-start">New date and time</Label>
              <Input
                id="reschedule-start"
                type="datetime-local"
                {...form.register("startAt")}
              />
              {form.formState.errors.startAt ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.startAt.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="reschedule-duration">Duration (minutes)</Label>
              <Input
                id="reschedule-duration"
                type="number"
                min="1"
                step="5"
                {...form.register("durationMinutes", { valueAsNumber: true })}
              />
              {form.formState.errors.durationMinutes ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.durationMinutes.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reschedule-note">Note (optional)</Label>
            <Textarea
              id="reschedule-note"
              rows={2}
              placeholder="Why the time changed"
              {...form.register("note")}
            />
          </div>

          <MeetingConflictNotice conflicts={conflicts} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={reschedule.isPending}>
              {reschedule.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {override ? "Reschedule anyway" : "Reschedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
