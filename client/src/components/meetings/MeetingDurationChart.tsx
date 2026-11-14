import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Timer } from "lucide-react";
import {
  TILE,
  TileHeader,
  TileGlow,
  TileEmpty,
  TileFigures,
  TileFigure,
  LegendRow,
  LegendFootRow,
} from "./MeetingTile";
import {
  buildDurationAnalysis,
  MEETING_TYPE_COLORS,
  formatHours,
  percentOf,
} from "./meetingAnalytics";
import type { DurationBar } from "./meetingAnalytics";
import { formatDuration } from "@/types/meeting.types";
import type { Meeting } from "@/types/meeting.types";

// The little box that follows the mouse: the length band, then the two kinds
// of meeting inside it.
function DurationTooltip(props: {
  active?: boolean;
  payload?: { payload: DurationBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const bar = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 flex items-baseline justify-between gap-4 font-semibold">
        {bar.label}
        <span className="tabular-nums text-muted-foreground">
          {bar.total} {bar.total === 1 ? "meeting" : "meetings"}
        </span>
      </p>

      {MEETING_TYPE_COLORS.map((row) => (
        <p key={row.type} className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span className="flex-1 text-muted-foreground">{row.label}</span>
          <span className="font-semibold tabular-nums">{bar[row.type]}</span>
        </p>
      ))}
    </div>
  );
}

// How long the meetings of the workspace run, and where they are held.
//
// The bars lie on their side because a band name is a phrase and not a date:
// written under an upright bar it would have to be turned sideways to fit.
//
// The two kinds sit SIDE BY SIDE inside a band and are not stacked, because
// the question here is "which kind runs longer?" — and that is a comparison
// between the two, not a total of them.
export function MeetingDurationChart(props: { meetings: Meeting[] }) {
  const analysis = buildDurationAnalysis(props.meetings);

  return (
    <div className={TILE}>
      <TileGlow className="bg-teal-500/15" />

      <TileHeader
        title="How long meetings run"
        subtitle="The length of every meeting that was held, split by where it is held."
      />

      {analysis.total === 0 ? (
        <TileEmpty>No meeting has been held yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={formatDuration(analysis.averageMinutes)}
              label="the average meeting"
            />
            <TileFigure
              value={formatHours(analysis.totalMinutes)}
              label="booked in total"
              tone="small"
            />
          </TileFigures>

          {/* The legend of the two kinds, written out once above the bars. */}
          <div className="relative mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {MEETING_TYPE_COLORS.map((row) => (
              <span
                key={row.type}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </span>
            ))}
          </div>

          <div className="relative h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analysis.bars}
                // "vertical" is what lays the bars on their side: the count
                // runs along the x axis and the bands go down the y axis.
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
              >
                {/* Only the lines up and down here, because the bars now run
                    across: a line has to cross a bar to help read it. */}
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  content={<DurationTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {MEETING_TYPE_COLORS.map((row) => (
                  <Bar
                    key={row.type}
                    dataKey={row.type}
                    name={row.label}
                    fill={row.color}
                    maxBarSize={14}
                    // The bars lie down, so the rounded corners belong on the
                    // right: that is where a bar ends.
                    radius={[0, 4, 4, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* What each kind adds up to, under the chart. */}
          <div className="relative mt-3 flex flex-col gap-2 border-t border-border/60 pt-3">
            {analysis.types.map((type) => (
              <LegendRow
                key={type.type}
                color={type.color}
                name={
                  type.label +
                  " · " +
                  formatDuration(type.averageMinutes) +
                  " on average"
                }
                value={String(type.count)}
                percent={percentOf(type.count, analysis.total) + "%"}
              />
            ))}

            {analysis.longest ? (
              <LegendFootRow
                icon={<Timer className="h-4 w-4" />}
                name={"Longest: " + analysis.longest.title}
                value={formatDuration(analysis.longest.durationMinutes)}
              />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
