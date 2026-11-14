import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  StatusLegendRow,
} from "./DepartmentTile";
import { formatMonths, percentOf } from "./departmentAnalytics";
import type { DepartmentRow } from "./departmentAnalytics";

// The two pieces of every bar. A person is in one of them and never in both.
const IN_TEAM_COLOR = "#6366f1";
const NO_TEAM_COLOR = "#94a3b8";

// The height of one department row, and the air the chart needs around the
// rows for its axis. The chart grows with the number of departments, so a
// workspace with three of them does not get a tall empty box.
const ROW_HEIGHT = 42;
const CHART_PADDING = 44;

// The little box that follows the mouse. It says everything about the team of
// that department, not only the two pieces of the bar.
function StructureTooltip(props: {
  active?: boolean;
  payload?: { payload: DepartmentRow }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const row = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 flex items-baseline justify-between gap-4 font-semibold">
        {row.name}
        <span className="tabular-nums text-muted-foreground">
          {row.people} {row.people === 1 ? "person" : "people"}
        </span>
      </p>

      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: IN_TEAM_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">In a team</span>
        <span className="font-semibold tabular-nums">{row.inTeam}</span>
      </p>

      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: NO_TEAM_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">In no team</span>
        <span className="font-semibold tabular-nums">{row.notInTeam}</span>
      </p>

      {/* The three lines that are not pieces of the bar but belong to the
          same story: how the department is organised, and how it moves. */}
      <p className="mt-1.5 flex items-center gap-4 border-t border-border/60 pt-1.5 text-muted-foreground">
        <span>
          {row.teams} {row.teams === 1 ? "team" : "teams"}
        </span>
        <span>average {formatMonths(row.averageTenure)} here</span>
      </p>
      <p className="flex items-center gap-4 text-muted-foreground">
        <span>+{row.joinedLastYear} joined in a year</span>
        <span>−{row.leftLastYear} left</span>
      </p>
    </div>
  );
}

// Who sits where, and whether they sit in a team.
//
// The bars lie on their side, because a department name is a word and not a
// date: written under an upright bar it would have to be turned sideways to
// fit, and nobody reads a chart with their head tilted.
//
// Being in no team is not wrong on its own — a small department may not need
// one — which is why that piece is grey and not red. It is drawn all the same,
// because a department where nobody is in a team has no lead to answer for it.
export function DepartmentStructureChart(props: { rows: DepartmentRow[] }) {
  // Only the departments that have somebody in them. A row of pure zeros
  // would be an empty line under a name, and the ring above already says how
  // many departments hold nobody.
  const rows = props.rows.filter((row) => row.people > 0);

  let people = 0;
  let inTeam = 0;
  let teams = 0;

  rows.forEach((row) => {
    people += row.people;
    inTeam += row.inTeam;
    teams += row.teams;
  });

  return (
    <div className={TILE}>
      <TileGlow />

      <TileHeader
        title="People and team coverage"
        subtitle="How many of each department's people actually sit in one of its teams."
      />

      {rows.length === 0 ? (
        <TileEmpty>No department has anybody in it yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={percentOf(inTeam, people) + "%"}
              label="of the people are in a team"
            />
            <TileFigure
              value={String(people - inTeam)}
              label="are in none"
              tone="small"
            />
            <TileFigure
              value={String(teams)}
              label={teams === 1 ? "team in total" : "teams in total"}
              tone="small"
            />
          </TileFigures>

          <StatusLegendRow
            items={[
              { label: "In a team", color: IN_TEAM_COLOR },
              { label: "In no team", color: NO_TEAM_COLOR },
            ]}
          />

          <div
            className="relative w-full"
            style={{ height: rows.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                // "vertical" is what lays the bars on their side: the value
                // runs along the x axis and the names go down the y axis.
                layout="vertical"
                margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
              >
                {/* Only the lines up and down, because the bars run across: a
                    line has to cross a bar to help read it. */}
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
                  // Whole people only, never "2.5 people".
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  content={<StructureTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* The same stackId is what puts the two pieces inside one
                    bar, and the thin stroke in the colour of the card is the
                    gap that keeps the two colours apart. */}
                <Bar
                  dataKey="inTeam"
                  name="In a team"
                  stackId="people"
                  fill={IN_TEAM_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={26}
                />
                <Bar
                  dataKey="notInTeam"
                  name="In no team"
                  stackId="people"
                  fill={NO_TEAM_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={26}
                  // The bars lie down, so the rounded corners belong on the
                  // right: that is where a bar ends.
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
