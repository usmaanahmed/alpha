import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
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
} from "./DepartmentTile";
import { formatAverage } from "./departmentAnalytics";
import type { DepartmentRow } from "./departmentAnalytics";

const ROW_HEIGHT = 38;
const CHART_PADDING = 44;

function LeaveTooltip(props: {
  active?: boolean;
  payload?: { payload: DepartmentRow }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const row = props.payload[0].payload;

  const perPerson = row.people === 0 ? 0 : row.leaveDays / row.people;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 flex items-center gap-2 font-semibold">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
        />
        {row.name}
      </p>

      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Approved days</span>
        <span className="font-semibold tabular-nums">{row.leaveDays}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Per person</span>
        <span className="font-semibold tabular-nums">
          {formatAverage(perPerson)}
        </span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Waiting for an answer</span>
        <span className="font-semibold tabular-nums">{row.pendingLeaves}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Away today</span>
        <span className="font-semibold tabular-nums">{row.on_leave}</span>
      </p>
    </div>
  );
}

// How much time off each department has taken this year.
//
// Only the APPROVED days are drawn, and only the ones of this year: a request
// that was refused cost the department nothing, and a request still waiting is
// not time off yet — it is a decision somebody owes an answer to, which is why
// it is counted apart, next to the bar.
//
// The bar is the raw number of days, because that is what the department
// really spent. The fair comparison — days per person — is written in the
// tooltip and next to every name, since a department of ten people is always
// going to take more days than a department of two.
export function DepartmentLeaveChart(props: { rows: DepartmentRow[] }) {
  // A department that has taken nothing and has nothing waiting has no story
  // on this tile.
  const rows = props.rows.filter(
    (row) => row.leaveDays > 0 || row.pendingLeaves > 0
  );

  const sorted = [...rows].sort((left, right) => {
    if (right.leaveDays !== left.leaveDays) {
      return right.leaveDays - left.leaveDays;
    }
    return left.name.localeCompare(right.name);
  });

  let days = 0;
  let pending = 0;
  let people = 0;

  sorted.forEach((row) => {
    days += row.leaveDays;
    pending += row.pendingLeaves;
    people += row.people;
  });

  const thisYear = new Date().getFullYear();

  return (
    <div className={TILE}>
      <TileGlow className="bg-violet-500/15" />

      <TileHeader
        title="Time off by department"
        subtitle={"Approved leave days taken in " + thisYear + "."}
      />

      {sorted.length === 0 ? (
        <TileEmpty>No leave has been approved this year.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(days)} label="days taken this year" />
            <TileFigure
              value={formatAverage(people === 0 ? 0 : days / people)}
              label="days per person"
              tone="small"
            />
            <TileFigure
              value={String(pending)}
              label="still waiting for an answer"
              tone="small"
            />
          </TileFigures>

          <div
            className="relative w-full"
            style={{ height: sorted.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sorted}
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
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  content={<LeaveTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* One bar per department, each one in the colour that
                    department carries everywhere else on this page. */}
                <Bar dataKey="leaveDays" name="Approved days" maxBarSize={22} radius={[0, 4, 4, 0]}>
                  {sorted.map((row) => (
                    <Cell key={row.id} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* The fair comparison, and what is still owed an answer. */}
          <div className="mt-3 grid gap-x-6 gap-y-1.5 border-t border-border/60 pt-3 sm:grid-cols-2">
            {sorted.map((row) => (
              <div key={row.id} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {row.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatAverage(row.people === 0 ? 0 : row.leaveDays / row.people)}{" "}
                  d/person
                </span>
                {row.pendingLeaves > 0 ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    {row.pendingLeaves} waiting
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
