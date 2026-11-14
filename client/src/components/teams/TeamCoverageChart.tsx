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
} from "./TeamTile";
import { percentOf } from "./teamAnalytics";
import type { CoverageRow } from "./teamAnalytics";

// The two pieces of every bar. A person is in one of them and never in both.
const IN_TEAM_COLOR = "#0d9488";
const NO_TEAM_COLOR = "#94a3b8";

// The height of one department row, and the air the chart needs around the
// rows for its axis. The chart grows with the number of departments, so a
// workspace with three of them does not get a tall empty box.
const ROW_HEIGHT = 42;
const CHART_PADDING = 44;

function CoverageTooltip(props: {
  active?: boolean;
  payload?: { payload: CoverageRow }[];
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

      <p className="mt-1.5 flex items-center gap-4 border-t border-border/60 pt-1.5 text-muted-foreground">
        <span>
          {row.teams} {row.teams === 1 ? "team" : "teams"} here
        </span>
        {row.teamsWithoutLead > 0 ? (
          <span>{row.teamsWithoutLead} without a lead</span>
        ) : null}
      </p>
    </div>
  );
}

// Which departments are cut into teams, and which ones are not.
//
// A team lives inside one department, so this is the chart that says where the
// teams have reached and where they have not. Being in no team is not wrong on
// its own — a department of two may not need one — which is why that piece is
// grey and not red. It is drawn all the same, because somebody who is in no
// team has no lead to hand them their work.
//
// The list of departments is not asked for from the server: a department is
// named either by a team that lives in it or by a person who works in it, and
// this page already holds both lists.
export function TeamCoverageChart(props: { rows: CoverageRow[] }) {
  // Only the departments that have somebody in them. A row of pure zeros
  // would be an empty line under a name.
  const rows = props.rows.filter((row) => row.people > 0);

  let people = 0;
  let inTeam = 0;
  let departmentsWithoutTeam = 0;

  rows.forEach((row) => {
    people += row.people;
    inTeam += row.inTeam;

    if (row.teams === 0) {
      departmentsWithoutTeam += 1;
    }
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="Where the teams reach"
        subtitle="Department by department: who already sits in a team and who does not."
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
              value={String(departmentsWithoutTeam)}
              label={
                departmentsWithoutTeam === 1
                  ? "department has no team at all"
                  : "departments have no team at all"
              }
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
                  content={<CoverageTooltip />}
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
