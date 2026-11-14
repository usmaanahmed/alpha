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
import { TASK_STATUS_COLORS } from "@/components/dashboard/taskStatusColors";
import { formatAverage } from "./departmentAnalytics";
import type { DepartmentRow } from "./departmentAnalytics";

const ROW_HEIGHT = 42;
const CHART_PADDING = 44;

// The little box that follows the mouse: the department, then every status of
// that department with its colour and its count.
function WorkloadTooltip(props: {
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
          {row.tasks} {row.tasks === 1 ? "task" : "tasks"}
        </span>
      </p>

      {row.tasks === 0 ? (
        <p className="text-muted-foreground">This department has no task.</p>
      ) : (
        <>
          {TASK_STATUS_COLORS.map((status) => (
            <p key={status.status} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />
              <span className="flex-1 text-muted-foreground">
                {status.label}
              </span>
              <span className="font-semibold tabular-nums">
                {row[status.status]}
              </span>
            </p>
          ))}

          <p className="mt-1.5 flex items-center gap-4 border-t border-border/60 pt-1.5 text-muted-foreground">
            <span>{formatAverage(row.openPerPerson)} open per person</span>
            <span>{row.overdue} late</span>
          </p>
        </>
      )}
    </div>
  );
}

// The whole task module, cut by department.
//
// This is the same five statuses in the same five colours as everywhere else
// in the app, so a colour keeps its meaning whichever chart it is drawn in.
// The busiest department is on top: the list is ranked by the work that is
// still open, because a department with forty finished tasks and none open is
// not the one somebody has to worry about.
export function DepartmentWorkloadChart(props: { rows: DepartmentRow[] }) {
  // Only the departments that were given work at all. A pure row of zeros is
  // an empty line under a name.
  const rows = props.rows.filter((row) => row.tasks > 0);

  // The open work first. Two departments with the same load stay in
  // alphabetical order, so the chart never shuffles itself between two reads.
  const sorted = [...rows].sort((left, right) => {
    if (right.open !== left.open) {
      return right.open - left.open;
    }
    return left.name.localeCompare(right.name);
  });

  let tasks = 0;
  let open = 0;
  let people = 0;

  sorted.forEach((row) => {
    tasks += row.tasks;
    open += row.open;
    people += row.people;
  });

  const busiest = sorted[0];

  return (
    <div className={TILE}>
      <TileGlow className="bg-sky-500/15" />

      <TileHeader
        title="Where the work sits"
        subtitle="Every task of the workspace, cut by the department it landed in."
      />

      {sorted.length === 0 ? (
        <TileEmpty>No department has been given a task yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(open)} label="tasks still open" />
            <TileFigure
              value={"of " + tasks}
              label="ever given out"
              tone="small"
            />
            <TileFigure
              value={formatAverage(people === 0 ? 0 : open / people)}
              label="open per person"
              tone="small"
            />
            {busiest ? (
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {busiest.name}
                </span>{" "}
                holds the most, with {busiest.open} of the {open} open tasks.
              </p>
            ) : null}
          </TileFigures>

          <StatusLegendRow
            items={TASK_STATUS_COLORS.map((status) => ({
              label: status.label,
              color: status.color,
            }))}
          />

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
                  content={<WorkloadTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* One piece of the bar per status, all in the same stack. */}
                {TASK_STATUS_COLORS.map((status, index) => (
                  <Bar
                    key={status.status}
                    dataKey={status.status}
                    name={status.label}
                    stackId="tasks"
                    fill={status.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={26}
                    radius={
                      index === TASK_STATUS_COLORS.length - 1
                        ? [0, 4, 4, 0]
                        : undefined
                    }
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
