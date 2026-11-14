import { useEffect, useState } from "react";
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
import { meetingSchema } from "@/validators/meeting.schema";
import type { MeetingFormValues } from "@/validators/meeting.schema";
import {
  useCreateMeeting,
  useUpdateMeeting,
  useAssignableMeetingEmployees,
} from "@/hooks/useMeetings";
import { getMeetingConflicts } from "@/api/meeting.api";
import { AttendeePicker } from "./AttendeePicker";
import { MeetingConflictNotice } from "./MeetingConflictNotice";
import { MEETING_TYPE_OPTIONS, toDateTimeInput } from "@/types/meeting.types";
import type { Meeting, MeetingConflict } from "@/types/meeting.types";

// The form we start from when we schedule a new meeting.
const emptyForm: MeetingFormValues = {
  title: "",
  agenda: "",
  startAt: "",
  durationMinutes: 30,
  location: "",
  meetingType: "in_person",
  attendees: [],
};

// One dialog for both jobs:
// - meeting is null  -> we are scheduling a new meeting
// - meeting is given -> we are editing that meeting
//
// The time is only asked when scheduling. To move an existing meeting to
// another time, the organizer uses the separate "Reschedule" action, so the
// change is written in the history and everybody is asked again.
export function MeetingFormDialog(props: {
  isOpen: boolean;
  meeting: Meeting | null;
  onClose: () => void;
}) {
  const createMeeting = useCreateMeeting();
  const updateMeeting = useUpdateMeeting();

  // The invite list is only fetched while the dialog is open.
  const employeesQuery = useAssignableMeetingEmployees(props.isOpen);
  const employees = employeesQuery.data || [];

  // The clashes the server sent back, shown in the yellow box.
  const [conflicts, setConflicts] = useState<MeetingConflict[]>([]);
  // Becomes true after a clash, so the next press means "schedule anyway".
  const [override, setOverride] = useState(false);

  const isEditing = props.meeting !== null;

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setConflicts([]);
    setOverride(false);

    if (!props.meeting) {
      form.reset(emptyForm);
      return;
    }

    // The attendees are stored as full people; the form only needs their ids.
    const attendeeIds = props.meeting.attendees
      .map((attendee) => attendee.employee?._id || "")
      .filter((id) => id !== "");

    form.reset({
      title: props.meeting.title,
      agenda: props.meeting.agenda,
      startAt: toDateTimeInput(props.meeting.startAt),
      durationMinutes: props.meeting.durationMinutes,
      location: props.meeting.location,
      meetingType: props.meeting.meetingType,
      attendees: attendeeIds,
    });
  }, [props.isOpen, props.meeting, form]);

  // When the time or the invited people change, the old clash list is no
  // longer true, so we clear it and ask for a fresh check on the next press.
  const watchedStart = form.watch("startAt");
  const watchedDuration = form.watch("durationMinutes");
  const watchedAttendees = form.watch("attendees");
  const signature =
    watchedStart +
    "|" +
    watchedDuration +
    "|" +
    [...watchedAttendees].sort().join(",");

  useEffect(() => {
    setConflicts([]);
    setOverride(false);
  }, [signature]);

  function onSubmit(values: MeetingFormValues) {
    const payload = {
      title: values.title,
      agenda: values.agenda,
      startAt: values.startAt,
      durationMinutes: values.durationMinutes,
      location: values.location,
      meetingType: values.meetingType,
      attendees: values.attendees,
      ignoreConflicts: override,
    };

    // Remember the clashes, or close on success.
    function handleError(error: unknown) {
      const found = getMeetingConflicts(error);
      if (found) {
        setConflicts(found);
        setOverride(true);
      }
    }

    if (props.meeting) {
      updateMeeting.mutate(
        { id: props.meeting._id, values: payload },
        { onSuccess: () => props.onClose(), onError: handleError }
      );
    } else {
      createMeeting.mutate(payload, {
        onSuccess: () => props.onClose(),
        onError: handleError,
      });
    }
  }

  const isSaving = createMeeting.isPending || updateMeeting.isPending;

  // The buttons that carry the number-input values register with valueAsNumber
  // so the form holds a real number, not the text of it.
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {props.meeting ? "Edit meeting" : "Schedule meeting"}
          </DialogTitle>
          <DialogDescription>
            {props.meeting
              ? "Change the details or the invited people. Use \"Reschedule\" to move the time."
              : "Pick a time and invite the people who should come. We warn you if anyone is already busy."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* --- Title --- */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              placeholder="Weekly team sync"
              {...form.register("title")}
            />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          {/* --- Time + duration, only when scheduling --- */}
          {!isEditing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="meeting-start">Date and time</Label>
                <Input
                  id="meeting-start"
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
                <Label htmlFor="meeting-duration">Duration (minutes)</Label>
                <Input
                  id="meeting-duration"
                  type="number"
                  min="1"
                  step="5"
                  placeholder="30"
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                />
                {form.formState.errors.durationMinutes ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.durationMinutes.message}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* --- Type + location --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Meeting type</Label>
              <Select
                value={form.watch("meetingType")}
                onValueChange={(value) =>
                  form.setValue(
                    "meetingType",
                    value as MeetingFormValues["meetingType"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEETING_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="meeting-location">
                {form.watch("meetingType") === "online"
                  ? "Meeting link"
                  : "Room / place"}
              </Label>
              <Input
                id="meeting-location"
                placeholder={
                  form.watch("meetingType") === "online"
                    ? "https://..."
                    : "Meeting room 2"
                }
                {...form.register("location")}
              />
            </div>
          </div>

          {/* --- Agenda --- */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-agenda">Agenda (optional)</Label>
            <Textarea
              id="meeting-agenda"
              rows={2}
              placeholder="What will be discussed"
              {...form.register("agenda")}
            />
          </div>

          {/* --- Attendees --- */}
          <div className="flex flex-col gap-2">
            <Label>Invite people</Label>
            <AttendeePicker
              employees={employees}
              selected={form.watch("attendees")}
              onChange={(next) =>
                form.setValue("attendees", next, { shouldValidate: true })
              }
              isLoading={employeesQuery.isLoading}
            />
            {form.formState.errors.attendees ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.attendees.message}
              </p>
            ) : null}
          </div>

          {/* The clash box, when the server pushed back on the time. */}
          <MeetingConflictNotice conflicts={conflicts} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {override
                ? "Schedule anyway"
                : props.meeting
                  ? "Save changes"
                  : "Schedule meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
