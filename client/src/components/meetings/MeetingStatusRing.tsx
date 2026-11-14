import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Repeat2, Ban } from "lucide-react";
import {
  TILE,
  TileHeader,
  TileGlow,
  TileEmpty,
  LegendRow,
  LegendFootRow,
} from "./MeetingTile";
import {
  buildStatusSlices,
  buildRescheduleStats,
  percentOf,
  CHART_TOOLTIP_STYLE,
} from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

// Where every meeting of the workspace stands right now, as a ring.
//
// This is the one chart on the page that does count the cancelled meetings,
// because how often a meeting gets called off is exactly what it is here to
// show. Every other chart leaves them out.
//
// Under the legend sit the two numbers that are NOT slices of the ring: how
// many meetings were moved to another time, and how many were called off. A
// rescheduled meeting is still "scheduled", so drawing it as a fifth slice
// would count the same meeting twice and the percentages would stop adding
// up to a hundred.
export function MeetingStatusRing(props: { meetings: Meeting[] }) {
  const slices = buildStatusSlices(props.meetings);
  const reschedules = buildRescheduleStats(props.meetings);

  const total = props.meetings.length;

  // A status nobody is in would only be an invisible slice, so it stays out
  // of the ring. It keeps its line in the legend, so the reader still sees
  // that the status exists and holds zero.
  const drawn = slices.filter((slice) => slice.value > 0);

  const cancelled = slices.find((slice) => slice.status === "cancelled");
  const cancelledCount = cancelled ? cancelled.value : 0;

  return (
    <div className={TILE}>
      <TileGlow />

      <TileHeader
        title="Where the meetings stand"
        subtitle="Every meeting ever scheduled, by the status it is in today."
      />

      {total === 0 ? (
        <TileEmpty>No meeting has been scheduled yet.</TileEmpty>
      ) : (
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* The ring, with the total written in its hole. */}
          <div className="relative mx-auto h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={drawn}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="98%"
                  // The small gap and the stroke in the card colour are what
                  // keep two slices apart even when their colours are close.
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {drawn.map((slice) => (
                    <Cell key={slice.status} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {total === 1 ? "meeting" : "meetings"}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {slices.map((slice) => (
              <LegendRow
                key={slice.status}
                color={slice.color}
                name={slice.name}
                value={String(slice.value)}
                percent={percentOf(slice.value, total) + "%"}
              />
            ))}

            <LegendFootRow
              icon={<Repeat2 className="h-4 w-4" />}
              name="Moved to another time"
              value={String(reschedules.movedMeetings)}
              percent={percentOf(reschedules.movedMeetings, total) + "%"}
            />
            <div className="flex items-center gap-2.5">
              <span className="shrink-0 text-muted-foreground">
                <Ban className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                Called off before it happened
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {cancelledCount}
              </span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {percentOf(cancelledCount, total)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
