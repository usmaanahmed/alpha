import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  TileNote,
  StatusLegendRow,
} from "./EmployeeTile";
import { formatAverage, percentOf } from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

// How many people the chart draws. A company of forty would otherwise turn
// this tile into a page of its own, and the people at the bottom of the list
// are the ones holding nothing anyway.
const MAX_PEOPLE = 12;

const ON_TIME_COLOR = "#0284c7";
const LATE_COLOR = "#dc2626";
const ROW_HEIGHT = 34;
const CHART_PADDING = 40;

// One bar.
//
// onTime and late are the two pieces of the SAME open pile: a late task is
// still an open task, so it is taken out of onTime and drawn in red instead of
// being added on top. Otherwise the bar would count it twice.
interface PersonBar {
  id: string;
  name: string;
  onTime: number;
  late: number;
  open: number;
  completed: number;
  designation: string;
  departmentName: string;
}

function WorkloadTooltip(props: {
  active?: boolean;
  payload?: { payload: PersonBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const person = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{person.name}</p>
      <p className="mb-1.5 text-muted-foreground">
        {person.designation || "No designation"}
        {person.departmentName ? " · " + person.departmentName : ""}
      </p>

      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Open tasks</span>
        <span className="font-semibold tabular-nums">{person.open}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Of them late</span>
        <span className="font-semibold tabular-nums">{person.late}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Finished so far</span>
        <span className="font-semibold tabular-nums">{person.completed}</span>
      </p>
    </div>
  );
}

// Who is carrying the work.
//
// This is the tile a lead opens the page for. The bars are the open tasks of
// each person, and the red part of a bar is the piece of that pile that is
// already past its due date. The dashed line is what one person would hold if
// the work were shared out evenly, so a bar that runs far past it is somebody
// to talk to today.
//
// Only the people who still work here are drawn: work sitting on somebody who
// has left is not a workload, it is the attention panel's problem.
export function EmployeeWorkloadChart(props: { rows: EmployeeRow[] }) {
  const withWork = props.rows.filter((row) => row.open > 0);

  const ranked = [...withWork].sort((left, right) => {
    if (right.open !== left.open) {
      return right.open - left.open;
    }
    return left.name.localeCompare(right.name);
  });

  const bars: PersonBar[] = ranked.slice(0, MAX_PEOPLE).map((row) => ({
    id: row.id,
    name: row.name,
    onTime: row.open - row.overdue,
    late: row.overdue,
    open: row.open,
    completed: row.completed,
    designation: row.designation,
    departmentName: row.departmentName,
  }));

  let openTotal = 0;
  let overdueTotal = 0;

  props.rows.forEach((row) => {
    openTotal += row.open;
    overdueTotal += row.overdue;
  });

  // Shared out evenly over everybody, not only over the people who happen to
  // hold something today — that is the whole point of the line.
  const average = props.rows.length === 0 ? 0 : openTotal / props.rows.length;

  // How much of the open work sits on the few people the chart draws.
  let shownOpen = 0;

  bars.forEach((bar) => {
    shownOpen += bar.open;
  });

  const hidden = ranked.length - bars.length;
  const idle = props.rows.length - withWork.length;

  return (
    <div className={TILE}>
      <TileGlow className="bg-sky-500/15" />

      <TileHeader
        title="Who is carrying the work"
        subtitle="Open tasks per person, with the late part of each pile in red."
      />

      {bars.length === 0 ? (
        <TileEmpty>Nobody is holding an open task right now.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(openTotal)} label="open tasks" />
            <TileFigure
              value={formatAverage(average)}
              label="per person on average"
              tone="small"
            />
            <TileFigure
              value={percentOf(shownOpen, openTotal) + "%"}
              label={"of it sits on these " + bars.length}
              tone="small"
            />
            <TileFigure
              value={String(overdueTotal)}
              label="of it is late"
              tone="small"
            />
          </TileFigures>

          <StatusLegendRow
            items={[
              { label: "Open", color: ON_TIME_COLOR },
              { label: "Late", color: LATE_COLOR },
              { label: "Even share", color: "#94a3b8" },
            ]}
          />

          <div
            className="relative w-full"
            style={{ height: bars.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
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
                  dataKey="name"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  content={<WorkloadTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* What one person would hold if the work were shared out
                    evenly over everybody. */}
                {average > 0 ? (
                  <ReferenceLine
                    x={average}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                  />
                ) : null}

                <Bar
                  dataKey="onTime"
                  name="Open"
                  stackId="work"
                  fill={ON_TIME_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="late"
                  name="Late"
                  stackId="work"
                  fill={LATE_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={20}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {hidden > 0 || idle > 0 ? (
            <TileNote>
              {hidden > 0
                ? hidden +
                  (hidden === 1 ? " more person is" : " more people are") +
                  " holding open work but not drawn here" +
                  (idle > 0 ? ", and " : ".")
                : ""}
              {idle > 0
                ? idle +
                  (idle === 1 ? " person has" : " people have") +
                  " nothing open at all."
                : ""}
            </TileNote>
          ) : null}
        </>
      )}
    </div>
  );
}
