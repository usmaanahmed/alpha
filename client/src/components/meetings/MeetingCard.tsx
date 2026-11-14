import {
  MoreHorizontal,
  Clock,
  MapPin,
  Video,
  Users,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/common/Avatar";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import {
  formatMeetingDateTime,
  formatDuration,
  getResponseLabel,
  getResponseVariant,
  countResponses,
} from "@/types/meeting.types";
import type { Meeting } from "@/types/meeting.types";

// One meeting as a card. Clicking it (or "View details") opens the detail
// dialog, where all the actions live.
export function MeetingCard(props: {
  meeting: Meeting;
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
}) {
  const meeting = props.meeting;
  const counts = countResponses(meeting);

  // We show the first few attendee pictures, then a "+N" for the rest.
  const shownAttendees = meeting.attendees.slice(0, 4);
  const extra = meeting.attendees.length - shownAttendees.length;

  return (
    <div
      className="flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => props.onView(meeting)}
    >
      {/* --- Title row --- */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{meeting.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <MeetingStatusBadge status={meeting.status} />
            {/* On the employee page this shows the person's own answer. */}
            {meeting.myResponse ? (
              <Badge variant={getResponseVariant(meeting.myResponse)}>
                You: {getResponseLabel(meeting.myResponse)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => props.onView(meeting)}>
                View details
              </DropdownMenuItem>
              {meeting.canManage ? (
                <DropdownMenuItem onClick={() => props.onEdit(meeting)}>
                  Edit
                </DropdownMenuItem>
              ) : null}
              {meeting.canManage ? (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => props.onDelete(meeting)}
                >
                  Delete
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* --- When --- */}
      <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {formatMeetingDateTime(meeting.startAt)}
        </span>
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {formatDuration(meeting.durationMinutes)}
        </span>
        <span className="flex items-center gap-2">
          {meeting.meetingType === "online" ? (
            <Video className="h-4 w-4" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
          {meeting.location ||
            (meeting.meetingType === "online" ? "Online" : "In person")}
        </span>
      </div>

      {/* --- Attendees --- */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center -space-x-2">
          {shownAttendees.map((attendee) => (
            <Avatar
              key={attendee._id}
              name={attendee.employee?.name || "?"}
              photo={attendee.employee?.photo || ""}
              size="sm"
            />
          ))}
          {extra > 0 ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-full border bg-muted text-xs">
              +{extra}
            </span>
          ) : null}
        </div>

        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {counts.accepted + counts.attended} in / {meeting.attendees.length}
        </span>
      </div>
    </div>
  );
}
