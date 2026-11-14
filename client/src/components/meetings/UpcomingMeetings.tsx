import { MapPin, Video, Users } from "lucide-react";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import { TILE, TileHeader, TileGlow, TileEmpty } from "./MeetingTile";
import { MEETING_RESPONSE_COLORS, formatHours } from "./meetingAnalytics";
import {
  buildUpcomingMeetings,
  groupMeetingsByDay,
  formatMeetingDay,
  formatMeetingTime,
  formatDuration,
  countResponses,
} from "@/types/meeting.types";
import type { Meeting } from "@/types/meeting.types";

// The colours of the little answer strip, looked up once so the strip and
// the rings on the same page always agree.
function responseColor(response: "accepted" | "attended" | "declined" | "invited") {
  const row = MEETING_RESPONSE_COLORS.find((item) => item.response === response);
  return row ? row.color : "#94a3b8";
}

// A thin bar under a meeting, cut into the four answers of its invitations.
// It is the same picture as the big ring above, shrunk down to one meeting,
// so a glance says "this room is nearly full" or "nobody has replied".
function ResponseStrip(props: { meeting: Meeting }) {
  const counts = countResponses(props.meeting);
  const total = props.meeting.attendees.length;

  if (total === 0) {
    return null;
  }

  const pieces = [
    { key: "attended", value: counts.attended },
    { key: "accepted", value: counts.accepted },
    { key: "declined", value: counts.declined },
    { key: "invited", value: counts.invited },
  ] as const;

  return (
    <span
      className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
      title={
        counts.accepted +
        " accepted, " +
        counts.declined +
        " declined, " +
        counts.invited +
        " not answered"
      }
    >
      {pieces
        .filter((piece) => piece.value > 0)
        .map((piece) => (
          <span
            key={piece.key}
            style={{
              width: (piece.value / total) * 100 + "%",
              backgroundColor: responseColor(piece.key),
            }}
          />
        ))}
    </span>
  );
}

// The days ahead: every meeting that has not started yet, grouped by day and
// soonest first.
//
// This is the only tile on the page that looks forward. Each day heading
// carries what that day costs — how many meetings and how many hours — so
// somebody can see a day is already full before they book one more thing in
// it. Clicking a meeting opens the meetings board, where the actions live.
export function UpcomingMeetings(props: {
  meetings: Meeting[];
  onView: (meeting: Meeting) => void;
}) {
  const upcoming = buildUpcomingMeetings(props.meetings);
  const groups = groupMeetingsByDay(upcoming);

  // How much time is booked ahead, all together.
  let totalMinutes = 0;
  upcoming.forEach((meeting) => {
    totalMinutes += meeting.durationMinutes;
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="The days ahead"
        subtitle="Everything still to come, and what each day already costs."
        right={
          upcoming.length > 0 ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {upcoming.length} ahead · {formatHours(totalMinutes)}
            </span>
          ) : null
        }
      />

      {groups.length === 0 ? (
        <TileEmpty>Nothing is scheduled ahead.</TileEmpty>
      ) : (
        // The diary can run long, so it scrolls inside its own tile instead
        // of stretching the whole page.
        <div className="relative flex max-h-140 flex-col gap-4 overflow-y-auto pr-1">
          {groups.map((group) => {
            // What this one day costs.
            let dayMinutes = 0;
            group.meetings.forEach((meeting) => {
              dayMinutes += meeting.durationMinutes;
            });

            return (
              <div key={group.dayKey}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="text-xs font-semibold">
                    {formatMeetingDay(group.date)}
                  </p>
                  <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {group.meetings.length}{" "}
                    {group.meetings.length === 1 ? "meeting" : "meetings"} ·{" "}
                    {formatHours(dayMinutes)}
                  </p>
                </div>

                <ul className="flex flex-col gap-1.5">
                  {group.meetings.map((meeting) => (
                    <li key={meeting._id}>
                      <button
                        type="button"
                        onClick={() => props.onView(meeting)}
                        className="w-full rounded-lg border border-border/70 px-3 py-2 text-left transition-colors hover:bg-accent"
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">
                            {formatMeetingTime(meeting.startAt)}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">
                              {meeting.title}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                {meeting.meetingType === "online" ? (
                                  <Video className="h-3 w-3" />
                                ) : (
                                  <MapPin className="h-3 w-3" />
                                )}
                                {meeting.location ||
                                  (meeting.meetingType === "online"
                                    ? "Online"
                                    : "In person")}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {meeting.attendees.length}
                              </span>
                              <span>{formatDuration(meeting.durationMinutes)}</span>
                            </span>
                          </span>

                          <MeetingStatusBadge status={meeting.status} />
                        </span>

                        <span className="mt-2 block">
                          <ResponseStrip meeting={meeting} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
