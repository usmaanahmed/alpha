import {
  CalendarClock,
  Clock,
  MapPin,
  Video,
  Pencil,
  CalendarRange,
  PlayCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonInline } from "@/components/common/PersonInline";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import {
  formatMeetingDateTime,
  formatDuration,
  getMeetingTypeLabel,
  getResponseLabel,
  getResponseVariant,
  getMeetingStatusLabel,
} from "@/types/meeting.types";
import type { Meeting, AttendeeAnswer } from "@/types/meeting.types";

// One fact row: a small grey icon, a label, and a value.
function Fact(props: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{props.icon}</span>
      <span className="text-muted-foreground">{props.label}:</span>
      <span className="font-medium">{props.value}</span>
    </div>
  );
}

// The full page of one meeting: the facts, who is invited and what they
// answered, the notes, the action items, the history, and every button.
// Which buttons show depends on the two flags the server sent: canManage (the
// organizer's buttons) and myResponse (the invited employee's buttons).
// readOnly turns every button off and draws only the facts.
//
// The meetings page never uses it: there a meeting is opened to be answered,
// moved or written up. One other screen does: a leave request can point at a
// meeting ("you are away, but this still needs you"), and the person opening
// it from there — the employee, or the approver — is only looking. So the
// seven callbacks are optional, and in that mode none of them can be reached.
export function MeetingDetailDialog(props: {
  meeting: Meeting | null;
  onClose: () => void;
  readOnly?: boolean;
  onEdit?: (meeting: Meeting) => void;
  onReschedule?: (meeting: Meeting) => void;
  onNotes?: (meeting: Meeting) => void;
  onStatusMove?: (
    meeting: Meeting,
    target: "scheduled" | "in_progress" | "completed" | "cancelled",
    label: string
  ) => void;
  onRespond?: (
    meeting: Meeting,
    response: AttendeeAnswer,
    label: string
  ) => void;
  onDelete?: (meeting: Meeting) => void;
}) {
  // Rescheduling and the notes are two sections the SaaS owner can
  // switch off, and then their buttons are simply not drawn.
  const { hasFeature } = useAuth();

  const meeting = props.meeting;

  if (!meeting) {
    return null;
  }

  const isOpen = meeting.status === "scheduled" || meeting.status === "in_progress";

  const organizerName =
    meeting.organizedByType === "organization"
      ? "Organization"
      : meeting.organizedByEmployee?.name || "-";

  return (
    <Dialog open={meeting !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meeting.title}
            <MeetingStatusBadge status={meeting.status} />
          </DialogTitle>
          <DialogDescription>
            Scheduled by {organizerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* --- The facts --- */}
          <div className="grid gap-2 sm:grid-cols-2">
            <Fact
              icon={<CalendarClock className="h-4 w-4" />}
              label="When"
              value={formatMeetingDateTime(meeting.startAt)}
            />
            <Fact
              icon={<Clock className="h-4 w-4" />}
              label="Duration"
              value={formatDuration(meeting.durationMinutes)}
            />
            <Fact
              icon={
                meeting.meetingType === "online" ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )
              }
              label="Type"
              value={getMeetingTypeLabel(meeting.meetingType)}
            />
            <Fact
              icon={<MapPin className="h-4 w-4" />}
              label={meeting.meetingType === "online" ? "Link" : "Place"}
              value={meeting.location || "-"}
            />
          </div>

          {/* --- Agenda --- */}
          {meeting.agenda ? (
            <div>
              <p className="mb-1 text-sm font-medium">Agenda</p>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {meeting.agenda}
              </p>
            </div>
          ) : null}

          {/* --- Attendees --- */}
          <div>
            <p className="mb-2 text-sm font-medium">
              Invited ({meeting.attendees.length})
            </p>
            <ul className="flex flex-col gap-1.5">
              {meeting.attendees.map((attendee) => (
                <li
                  key={attendee._id}
                  className="flex items-center justify-between gap-2"
                >
                  <PersonInline
                    name={attendee.employee?.name || "?"}
                    photo={attendee.employee?.photo || ""}
                  />
                  <Badge variant={getResponseVariant(attendee.response)}>
                    {getResponseLabel(attendee.response)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          {/* --- Action items --- */}
          {meeting.actionItems.length > 0 ? (
            <div>
              <p className="mb-2 text-sm font-medium">Action items</p>
              <ul className="flex flex-col gap-1">
                {meeting.actionItems.map((item) => (
                  <li key={item._id} className="flex items-center gap-2 text-sm">
                    <span
                      className={
                        item.done
                          ? "text-muted-foreground line-through"
                          : ""
                      }
                    >
                      {item.done ? "✓ " : "• "}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* --- Notes --- */}
          {meeting.notes && hasFeature(FEATURES.MEETINGS_NOTES) ? (
            <div>
              <p className="mb-1 text-sm font-medium">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {meeting.notes}
              </p>
            </div>
          ) : null}

          {/* --- Status history --- */}
          <div>
            <p className="mb-2 text-sm font-medium">History</p>
            <ul className="flex flex-col gap-2">
              {meeting.statusHistory.map((entry) => {
                const who =
                  entry.byType === "organization"
                    ? "Organization"
                    : entry.byEmployee?.name || "A manager";

                return (
                  <li key={entry._id} className="text-sm">
                    <span className="font-medium">
                      {getMeetingStatusLabel(entry.status)}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      — {formatMeetingDateTime(entry.at)} by {who}
                    </span>
                    {entry.note ? (
                      <p className="text-xs text-muted-foreground">
                        {entry.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* --- The invited employee's answer buttons --- */}
          {meeting.myResponse && isOpen && !props.readOnly ? (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => props.onRespond?.(meeting, "accepted", "Accept")}
              >
                <ThumbsUp className="h-4 w-4" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => props.onRespond?.(meeting, "declined", "Decline")}
              >
                <ThumbsDown className="h-4 w-4" />
                Decline
              </Button>
              {meeting.status === "in_progress" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    props.onRespond?.(meeting, "attended", "Mark attended")
                  }
                >
                  <UserCheck className="h-4 w-4" />
                  Mark attended
                </Button>
              ) : null}
            </div>
          ) : null}

          {/* --- The organizer's buttons --- */}
          {meeting.canManage && !props.readOnly ? (
            <div className="flex flex-wrap gap-2 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => props.onEdit?.(meeting)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>

              {meeting.status !== "completed" &&
              hasFeature(FEATURES.MEETINGS_RESCHEDULE) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => props.onReschedule?.(meeting)}
                >
                  <CalendarRange className="h-4 w-4" />
                  Reschedule
                </Button>
              ) : null}

              {meeting.status === "scheduled" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    props.onStatusMove?.(meeting, "in_progress", "Start")
                  }
                >
                  <PlayCircle className="h-4 w-4" />
                  Start
                </Button>
              ) : null}

              {isOpen ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    props.onStatusMove?.(meeting, "completed", "Complete")
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete
                </Button>
              ) : null}

              {isOpen ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    props.onStatusMove?.(meeting, "cancelled", "Cancel")
                  }
                >
                  <XCircle className="h-4 w-4" />
                  Cancel
                </Button>
              ) : null}

              {meeting.status === "cancelled" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    props.onStatusMove?.(meeting, "scheduled", "Re-open")
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                  Re-open
                </Button>
              ) : null}

              {hasFeature(FEATURES.MEETINGS_NOTES) ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => props.onNotes?.(meeting)}
                >
                  <FileText className="h-4 w-4" />
                  Notes
                </Button>
              ) : null}

              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => props.onDelete?.(meeting)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
