import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { TILE, TileHeader, TileGlow, TileEmpty } from "./MeetingTile";
import {
  buildOrganizerLoad,
  formatHours,
  percentOf,
} from "./meetingAnalytics";
import type { OrganizerLoad } from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

const ROW_HEIGHT = 34;
const CHART_PADDING = 40;

// The two colours of one organizer's bar: the meetings that stood, and the
// ones they called off again.
const HELD_COLOR = "#7c3aed";
const CALLED_OFF_COLOR = "#dc2626";

// One row of the chart. "held" is worked out here rather than counted again:
// it is every meeting the person called, minus the ones they cancelled.
interface OrganizerBar extends OrganizerLoad {
  held: number;
}

function OrganizerTooltip(props: {
  active?: boolean;
  payload?: { payload: OrganizerBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const row = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold">{row.name}</p>
      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: HELD_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">Went ahead</span>
        <span className="font-semibold tabular-nums">{row.held}</span>
      </p>
      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: CALLED_OFF_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">Called off</span>
        <span className="font-semibold tabular-nums">{row.cancelled}</span>
      </p>
      <p className="mt-1.5 border-t border-border/60 pt-1.5 text-muted-foreground">
        {formatHours(row.minutes)} of everybody's time booked
      </p>
    </div>
  );
}

// Who puts the meetings in the diary.
//
// Every bar is cut in two: the meetings that went ahead, and the ones that
// were called off again. Somebody whose bar is mostly red is filling other
// people's calendars with meetings that never happen, and that is a thing
// worth seeing next to the count.
//
// The organization account gets a line of its own. It is not an employee, but
// it does schedule meetings, so leaving it out would lose them.
export function MeetingOrganizerChart(props: { meetings: Meeting[] }) {
  const organizers = buildOrganizerLoad(props.meetings);

  const bars: OrganizerBar[] = organizers.map((row) => ({
    ...row,
    held: row.meetings - row.cancelled,
  }));

  // How many of all the meetings on the chart were called off, for the one
  // sentence under it.
  let totalMeetings = 0;
  let totalCancelled = 0;

  bars.forEach((row) => {
    totalMeetings += row.meetings;
    totalCancelled += row.cancelled;
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-violet-500/15" />

      <TileHeader
        title="Who calls the meetings"
        subtitle="The meetings each organizer scheduled, and how many they called off."
      />

      {bars.length === 0 ? (
        <TileEmpty>No meeting has been scheduled yet.</TileEmpty>
      ) : (
        <>
          <div className="relative mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: HELD_COLOR }}
              />
              Went ahead
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: CALLED_OFF_COLOR }}
              />
              Called off
            </span>
          </div>

          <div
            className="relative w-full"
            style={{ height: bars.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
              >
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
                  dataKey="shortName"
                  width={96}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  content={<OrganizerTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* The same stackId is what puts the two pieces inside one
                    bar instead of next to each other. */}
                <Bar
                  dataKey="held"
                  name="Went ahead"
                  stackId="organizer"
                  fill={HELD_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={20}
                  radius={[0, 4, 4, 0]}
                />
                <Bar
                  dataKey="cancelled"
                  name="Called off"
                  stackId="organizer"
                  fill={CALLED_OFF_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={20}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="relative mt-3 text-sm text-muted-foreground">
            {bars.length === 1 ? "1 person schedules" : bars.length + " people schedule"}{" "}
            the meetings of this workspace, and{" "}
            <span className="font-semibold text-foreground">
              {percentOf(totalCancelled, totalMeetings)}%
            </span>{" "}
            of what they book gets called off again.
          </p>
        </>
      )}
    </div>
  );
}
