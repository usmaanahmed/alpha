import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useDepartmentTasks } from "@/hooks/useDashboard";
import { usePeriodPicker, PeriodPickerButtons } from "./PeriodPicker";
import { TASK_STATUS_COLORS } from "./taskStatusColors";
import { StatusLegend } from "./StatusLegend";
import type { DepartmentTasksBar } from "@/types/dashboard.types";

// The shared look of one tile of the dashboard.
const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The height of one department row, and the air the chart needs around the
// rows for its axis. The chart grows with the number of departments, so a
// workspace with three of them does not get a tall empty box.
const ROW_HEIGHT = 42;
const CHART_PADDING = 40;

// The little box that follows the mouse: the department, then every status
// of that department with its colour and its count.
function DepartmentTooltip(props: {
  active?: boolean;
  payload?: { payload: DepartmentTasksBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const department = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 flex items-baseline justify-between gap-4 font-semibold">
        {department.name}
        <span className="tabular-nums text-muted-foreground">
          {department.total} {department.total === 1 ? "task" : "tasks"}
        </span>
      </p>

      {department.total === 0 ? (
        <p className="text-muted-foreground">No task in this period.</p>
      ) : (
        TASK_STATUS_COLORS.map((bar) => (
          <p key={bar.status} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: bar.color }}
            />
            <span className="flex-1 text-muted-foreground">{bar.label}</span>
            <span className="font-semibold tabular-nums">
              {department[bar.status]}
            </span>
          </p>
        ))
      )}
    </div>
  );
}

// The same tasks as the chart above, cut a different way: not by WHEN they
// were opened but by WHICH department they landed in.
//
// The bars lie on their side, because a department name is a word and not a
// date: written under an upright bar it would have to be turned sideways to
// fit, and nobody reads a chart with their head tilted. Lying down, the name
// simply sits in front of its bar.
//
// The busiest department is on top, and every bar is cut into the same five
// statuses in the same five colours as everywhere else on the dashboard.
//
// The numbers come from the server: GET /api/dashboard/department-tasks
// counts them in the database, so this chart never downloads the tasks.
export function DepartmentTasksChart() {
  const picker = usePeriodPicker();

  const departmentQuery = useDepartmentTasks(
    picker.period,
    picker.year,
    picker.month
  );

  if (departmentQuery.isLoading) {
    return <LoadingTile />;
  }

  const answer = departmentQuery.data;
  const departments = answer?.departments || [];

  // The totals of everything on the screen right now.
  let totalTasks = 0;

  departments.forEach((department) => {
    totalTasks += department.total;
  });

  // The department that carries the most work, so the reader has one
  // sentence to take away. The list already arrives busiest first.
  const busiest = departments[0];

  return (
    <div className={TILE}>
      {/* A soft glow behind the bars, for depth. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Tasks by department
          </h2>
          <p className="text-sm text-muted-foreground">
            Which department was given the work of{" "}
            {answer?.rangeTitle || "this period"}, and where it stands today.
          </p>
        </div>

        <PeriodPickerButtons
          picker={picker}
          title={answer?.rangeTitle || ""}
        />
      </div>

      {departments.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          There is no department yet.
        </p>
      ) : totalTasks === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No department was given a task in {answer?.rangeTitle || "this period"}.
        </p>
      ) : (
        <>
          {/* The one line that says what the chart says. */}
          <div className="relative mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums leading-none">
                {departments.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {departments.length === 1 ? "department" : "departments"}
              </span>
            </p>
            {busiest && busiest.total > 0 ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {busiest.name}
                </span>{" "}
                carries the most, with {busiest.total} of {totalTasks} tasks.
              </p>
            ) : null}
          </div>

          <StatusLegend />

          {/* The chart grows with the number of departments. */}
          <div
            className="relative w-full"
            style={{
              height: departments.length * ROW_HEIGHT + CHART_PADDING,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={departments}
                // "vertical" is what lays the bars on their side: the value
                // runs along the x axis and the names go down the y axis.
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
                  // Whole tasks only, never "2.5 tasks".
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
                  content={<DepartmentTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* One piece of the bar per status. The same stackId is what
                    puts them next to each other inside one bar, and the thin
                    stroke in the colour of the card is the gap that keeps two
                    touching colours apart. */}
                {TASK_STATUS_COLORS.map((bar) => (
                  <Bar
                    key={bar.status}
                    dataKey={bar.status}
                    name={bar.label}
                    stackId="department"
                    fill={bar.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={26}
                    // The bars lie down, so the rounded corners belong on the
                    // right: that is where a bar ends.
                    radius={[0, 4, 4, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// The same tile in grey, so the page does not jump when the numbers arrive.
function LoadingTile() {
  return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />;
}
