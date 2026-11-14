import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import { TILE, TileHeader, TileGlow, TileFigures, TileFigure } from "./MeetingTile";
import {
  buildLoadBuckets,
  MEETING_STATUS_COLORS,
  formatHours,
  percentOf,
} from "./meetingAnalytics";
import type { LoadMode, LoadBucket } from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

// The two widths one bar can have.
const MODES: { mode: LoadMode; label: string }[] = [
  { mode: "week", label: "By week" },
  { mode: "month", label: "By month" },
];

// The little box that follows the mouse: the stretch of time the bar covers,
// then every status inside that bar with its colour and its count.
function LoadTooltip(props: {
  active?: boolean;
  payload?: { payload: LoadBucket }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const bucket = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 flex items-baseline justify-between gap-4 font-semibold">
        {bucket.rangeLabel}
        <span className="tabular-nums text-muted-foreground">
          {bucket.total} {bucket.total === 1 ? "meeting" : "meetings"}
        </span>
      </p>

      {bucket.total === 0 ? (
        <p className="text-muted-foreground">Nothing was scheduled here.</p>
      ) : (
        <>
          {MEETING_STATUS_COLORS.map((row) => (
            <p key={row.status} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: row.color }}
              />
              <span className="flex-1 text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums">
                {bucket[row.status]}
              </span>
            </p>
          ))}

          <p className="mt-1.5 border-t border-border/60 pt-1.5 text-muted-foreground">
            {formatHours(bucket.minutes)} of meeting time
          </p>
        </>
      )}
    </div>
  );
}

// The four statuses written out once, above the bars, so a colour never has
// to be guessed.
function StatusLegend() {
  return (
    <div className="relative mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {MEETING_STATUS_COLORS.map((row) => (
        <span
          key={row.status}
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
  );
}

// How busy the diary has been, drawn as stacked bars.
//
// One bar per week (the last eight) or per month (the last six) — the two
// buttons choose which — and every bar is cut into the four statuses. So the
// height of a bar says how many meetings were put in the diary for that
// stretch of time, and the colours inside it say what became of them.
//
// A meeting belongs to the bar its START time falls in, not the bar it was
// created in: this chart is about when the workspace meets, not about when
// somebody clicked "schedule".
export function MeetingLoadChart(props: { meetings: Meeting[] }) {
  const [mode, setMode] = useState<LoadMode>("week");

  const buckets = buildLoadBuckets(props.meetings, mode);

  // The totals of everything on the screen right now.
  let total = 0;
  let minutes = 0;
  let cancelled = 0;

  buckets.forEach((bucket) => {
    total += bucket.total;
    minutes += bucket.minutes;
    cancelled += bucket.cancelled;
  });

  // The busiest bar, so the reader has one sentence to take away.
  let busiest = buckets[0];
  buckets.forEach((bucket) => {
    if (bucket.total > busiest.total) {
      busiest = bucket;
    }
  });

  const span = mode === "week" ? "eight weeks" : "six months";

  return (
    <div className={TILE}>
      <TileGlow className="left-auto -right-10 bg-violet-500/15" />

      <TileHeader
        title="Meeting load over time"
        subtitle={"The meetings of the last " + span + ", by the day they were held."}
        right={
          <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
            {MODES.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => setMode(item.mode)}
                aria-pressed={mode === item.mode}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  mode === item.mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <TileFigures>
        <TileFigure value={String(total)} label={"meetings in the last " + span} />
        <TileFigure value={formatHours(minutes)} label="of meeting time" tone="small" />
        <TileFigure
          value={percentOf(cancelled, total) + "%"}
          label="called off"
          tone="small"
        />
      </TileFigures>

      {total === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No meeting was held in the last {span}.
        </p>
      ) : (
        <>
          <StatusLegend />

          <div className="relative h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={buckets}
                margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
              >
                {/* Only the lines across, and only faintly: the grid helps to
                    read a height, it must not fight with the bars. */}
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <YAxis
                  width={28}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  // Whole meetings only, never "2.5 meetings".
                  allowDecimals={false}
                />
                <Tooltip
                  content={<LoadTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* One piece of the bar per status. The same stackId is what
                    puts them on top of each other instead of side by side,
                    and the thin stroke in the colour of the card is the gap
                    that keeps two touching colours apart. */}
                {MEETING_STATUS_COLORS.map((row) => (
                  <Bar
                    key={row.status}
                    dataKey={row.status}
                    name={row.label}
                    stackId="bucket"
                    fill={row.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={48}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {busiest.total > 0 ? (
            <p className="relative mt-3 text-sm text-muted-foreground">
              The busiest stretch was{" "}
              <span className="font-semibold text-foreground">
                {busiest.rangeLabel}
              </span>
              , with {busiest.total}{" "}
              {busiest.total === 1 ? "meeting" : "meetings"} and{" "}
              {formatHours(busiest.minutes)} booked.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
