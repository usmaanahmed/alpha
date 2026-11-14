import { ListChecks, AlertTriangle } from "lucide-react";
import { TILE, TileHeader, TileGlow, TileEmpty } from "./MeetingTile";
import { buildFollowUpStats, percentOf } from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

// One meter: a label, "7 of 12", and a bar that fills to that share.
//
// A meter and not a ring, because these three numbers are each a part of a
// different whole. Three rings side by side would invite the reader to
// compare them as if they were slices of one thing, and they are not.
function Meter(props: {
  label: string;
  hint: string;
  part: number;
  whole: number;
  color: string;
}) {
  const share = percentOf(props.part, props.whole);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">{props.label}</p>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{props.part}</span> of{" "}
          {props.whole}
          <span className="ml-2 font-semibold text-foreground">{share}%</span>
        </p>
      </div>

      {/* The track is the whole, the coloured piece is the part. The width is
          a plain inline style because the share is a number we work out and
          not one of the handful of widths Tailwind knows. */}
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: share + "%", backgroundColor: props.color }}
        />
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{props.hint}</p>
    </div>
  );
}

// Whether the meetings are actually run properly, rather than merely held.
//
// Three habits, each drawn as its own meter: was the meeting given an agenda
// before it happened, were minutes written after it, and did the things it
// left behind get done. The cancelled meetings are left out — a meeting that
// never happened cannot be blamed for having no minutes.
export function MeetingFollowUpTile(props: { meetings: Meeting[] }) {
  const stats = buildFollowUpStats(props.meetings);

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="Agenda, minutes and follow-up"
        subtitle="Whether the meetings are prepared, written down and followed through."
      />

      {stats.total === 0 ? (
        <TileEmpty>There is nothing to follow up yet.</TileEmpty>
      ) : (
        <div className="relative flex flex-col gap-5">
          <Meter
            label="Given an agenda"
            hint="Meetings where somebody wrote what it is about."
            part={stats.withAgenda}
            whole={stats.total}
            color="#6366f1"
          />

          <Meter
            label="Minutes written afterwards"
            hint="Of the meetings that finished, the ones with notes."
            part={stats.withNotes}
            whole={stats.completed}
            color="#0284c7"
          />

          <Meter
            label="Action items ticked off"
            hint={
              stats.meetingsWithItems +
              (stats.meetingsWithItems === 1
                ? " meeting left something to do."
                : " meetings left something to do.")
            }
            part={stats.doneItems}
            whole={stats.actionItems}
            color="#059669"
          />

          {/* The two counts that are not a share of anything. */}
          <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2.5">
              <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                Things to do still open
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {stats.actionItems - stats.doneItems}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <AlertTriangle
                className={
                  "h-4 w-4 shrink-0 " +
                  (stats.overdueItems > 0 ? "text-amber-500" : "text-muted-foreground")
                }
              />
              <span className="min-w-0 flex-1 text-sm text-muted-foreground">
                Open on a meeting that already finished
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {stats.overdueItems}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
