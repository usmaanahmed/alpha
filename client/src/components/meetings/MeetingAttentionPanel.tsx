import {
  AlarmClock,
  CalendarX2,
  MailQuestion,
  ListTodo,
  FileText,
  FileQuestion,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TILE, TileHeader, TileGlow } from "./MeetingTile";
import { buildAttentionGroups } from "./meetingAnalytics";
import type { AttentionKey } from "./meetingAnalytics";
import { formatMeetingDay, formatMeetingTime } from "@/types/meeting.types";
import type { Meeting } from "@/types/meeting.types";

// The look of one group: which icon it wears and in which colour. The colour
// is a warning level and not a decoration — red is "this is already wrong",
// amber is "this needs you soon", sky is "this is only a reminder".
const GROUP_LOOK: Record<
  AttentionKey,
  { icon: LucideIcon; badge: string }
> = {
  starting_soon: {
    icon: AlarmClock,
    badge: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  },
  past_open: {
    icon: CalendarX2,
    badge: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  },
  waiting_reply: {
    icon: MailQuestion,
    badge: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
  open_items: {
    icon: ListTodo,
    badge:
      "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  },
  no_notes: {
    icon: FileText,
    badge:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  },
  no_agenda: {
    icon: FileQuestion,
    badge: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  },
};

// What somebody has to do something about.
//
// Every other tile on this page looks backwards and says what happened. This
// one looks at right now and says what is wrong: a meeting whose time has
// gone by that nobody closed, invitations nobody answered, minutes nobody
// wrote. A group with nothing in it is dropped, so a tidy workspace sees a
// short list and not six empty rows.
//
// Nothing can be acted on from here — the dashboard only reads. A click opens
// the meetings board, where all the actions live.
export function MeetingAttentionPanel(props: {
  meetings: Meeting[];
  onOpen: (meeting: Meeting) => void;
}) {
  const groups = buildAttentionGroups(props.meetings).filter(
    (group) => group.count > 0
  );

  return (
    <div className={TILE}>
      <TileGlow className="bg-amber-500/15" />

      <TileHeader
        title="Needs attention"
        subtitle="What is waiting on somebody right now."
      />

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-medium">Nothing is waiting.</p>
          <p className="text-sm text-muted-foreground">
            Every meeting is answered, closed and written up.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-3">
          {groups.map((group) => {
            const look = GROUP_LOOK[group.key];

            return (
              <div
                key={group.key}
                className="rounded-xl border border-border/70 p-3"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      look.badge
                    )}
                  >
                    <look.icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">{group.label}</span>
                      <span className="shrink-0 text-lg font-bold tabular-nums leading-none">
                        {group.count}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {group.hint}
                    </p>
                  </div>
                </div>

                {/* The first few by name, so the number is not the only thing
                    the reader gets. */}
                <ul className="mt-2 flex flex-col gap-1">
                  {group.meetings.map((meeting) => (
                    <li key={meeting._id}>
                      <button
                        type="button"
                        onClick={() => props.onOpen(meeting)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {meeting.title}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatMeetingDay(meeting.startAt)},{" "}
                          {formatMeetingTime(meeting.startAt)}
                        </span>
                      </button>
                    </li>
                  ))}

                  {group.count > group.meetings.length ? (
                    <li className="px-2 text-xs text-muted-foreground">
                      and {group.count - group.meetings.length} more
                    </li>
                  ) : null}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
