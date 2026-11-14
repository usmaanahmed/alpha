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
import { buildPeopleLoad, formatHours } from "./meetingAnalytics";
import type { PersonLoad } from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

// The height of one person's row, and the air the chart needs around the rows
// for its axis. The chart grows with the number of people, so a workspace
// with three of them does not get a tall empty box.
const ROW_HEIGHT = 34;
const CHART_PADDING = 40;

// One row of the chart: a person, and the hours they owe to meetings.
interface PersonBar extends PersonLoad {
  hours: number;
}

// The little box that follows the mouse: the person, their hours, how many
// meetings that is, and how many invitations they still owe an answer to.
function PersonTooltip(props: {
  active?: boolean;
  payload?: { payload: PersonBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const person = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold">{person.name}</p>
      <p className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">In meetings</span>
        <span className="font-semibold tabular-nums">
          {formatHours(person.minutes)}
        </span>
      </p>
      <p className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Meetings</span>
        <span className="font-semibold tabular-nums">{person.meetings}</span>
      </p>
      <p className="flex items-center justify-between gap-4">
        <span className="text-muted-foreground">Not answered yet</span>
        <span className="font-semibold tabular-nums">{person.waiting}</span>
      </p>
    </div>
  );
}

// Who actually spends their day in meetings.
//
// Somebody who said no is not counted for that meeting: they told the
// organizer they will not be there, so it takes none of their day. Everybody
// else is counted with the full length of the meeting, because you cannot sit
// in half of one.
//
// Only the busiest few get a bar. A chart with forty rows is a table with
// decoration, and the point here is to see who is carrying the most.
export function MeetingPeopleChart(props: { meetings: Meeting[] }) {
  const load = buildPeopleLoad(props.meetings);

  // Recharts draws the first row at the top of a sideways chart, and the list
  // already arrives busiest first, so the busiest person lands on top.
  const bars: PersonBar[] = load.top.map((person) => ({
    ...person,
    hours: Math.round((person.minutes / 60) * 10) / 10,
  }));

  return (
    <div className={TILE}>
      <TileGlow className="bg-sky-500/15" />

      <TileHeader
        title="Who sits in the meetings"
        subtitle="The hours each person owes to meetings they did not turn down."
        right={
          load.peopleCount > bars.length ? (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              Top {bars.length} of {load.peopleCount}
            </span>
          ) : null
        }
      />

      {bars.length === 0 ? (
        <TileEmpty>Nobody has been invited to a meeting yet.</TileEmpty>
      ) : (
        <div
          className="relative w-full"
          style={{ height: bars.length * ROW_HEIGHT + CHART_PADDING }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bars}
              // "vertical" is what lays the bars on their side: a name is a
              // word, and nobody reads a chart with their head tilted.
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
                // The axis counts hours, so "1.5" is a real value here and
                // the decimals stay.
                unit="h"
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
                content={<PersonTooltip />}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              />

              <Bar
                dataKey="hours"
                name="Hours in meetings"
                fill="#0284c7"
                maxBarSize={20}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
