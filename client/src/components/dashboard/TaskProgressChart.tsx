import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useTaskProgress } from "@/hooks/useDashboard";
import { usePeriodPicker, PeriodPickerButtons } from "./PeriodPicker";
import { TASK_STATUS_COLORS } from "./taskStatusColors";
import { StatusLegend } from "./StatusLegend";
import type { TaskProgressBucket } from "@/types/dashboard.types";

// The shared look of one tile of the dashboard.
const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The little box that follows the mouse: the stretch of time the bar covers,
// then every status of that bar with its colour and its count.
function BucketTooltip(props: {
  active?: boolean;
  payload?: { payload: TaskProgressBucket }[];
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
          {bucket.total} {bucket.total === 1 ? "task" : "tasks"}
        </span>
      </p>

      {bucket.total === 0 ? (
        <p className="text-muted-foreground">No task opened here.</p>
      ) : (
        TASK_STATUS_COLORS.map((bar) => (
          <p key={bar.status} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: bar.color }}
            />
            <span className="flex-1 text-muted-foreground">{bar.label}</span>
            <span className="font-semibold tabular-nums">
              {bucket[bar.status]}
            </span>
          </p>
        ))
      )}
    </div>
  );
}

// The task progress of the workspace, drawn as stacked bars.
//
// One bar per week, per month or per year — the three buttons at the top
// choose which — and every bar is cut into the five statuses of the task
// module, each in its own colour. So the height of a bar says how much work
// started in that stretch of time, and the colours inside it say where that
// work stands today.
//
// A task belongs to the bar it was created in, which is why a bar never
// changes height again once its week (or month, or year) is over — only the
// colours inside it move, as the tasks walk through the workflow.
//
// The numbers come from the server: GET /api/dashboard/task-progress counts
// them in the database, so this chart works the same on a workspace with
// twenty tasks and on one with twenty thousand.
export function TaskProgressChart() {
  const picker = usePeriodPicker();

  const progressQuery = useTaskProgress(
    picker.period,
    picker.year,
    picker.month
  );

  if (progressQuery.isLoading) {
    return <LoadingTile />;
  }

  const progress = progressQuery.data;
  const buckets = progress?.buckets || [];

  // The totals of everything on the screen right now.
  let totalTasks = 0;
  let completedTasks = 0;

  buckets.forEach((bucket) => {
    totalTasks += bucket.total;
    completedTasks += bucket.completed;
  });

  // How much of that work is finished, as a whole percent.
  const completedPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className={TILE}>
      {/* A soft glow behind the bars, for depth. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Task progress
          </h2>
          <p className="text-sm text-muted-foreground">
            The tasks opened in {progress?.rangeTitle || "this period"}, and
            where they stand today.
          </p>
        </div>

        <PeriodPickerButtons
          picker={picker}
          title={progress?.rangeTitle || ""}
        />
      </div>

      {/* The two figures of the period on the screen. */}
      <div className="relative mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <p className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums leading-none">
            {totalTasks}
          </span>
          <span className="text-sm text-muted-foreground">
            tasks opened in {progress?.rangeTitle || "this period"}
          </span>
        </p>
        <p className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tabular-nums leading-none">
            {completedPercent}%
          </span>
          <span className="text-sm text-muted-foreground">done</span>
        </p>
      </div>

      {totalTasks === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No task was opened in {progress?.rangeTitle || "this period"}.
        </p>
      ) : (
        <>
          <StatusLegend />

          <div className="relative h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={buckets}
                margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
              >
                {/* Only the lines across, and only faintly: the grid helps
                    to read a height, it must not fight with the bars. */}
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
                  // Whole tasks only, never "2.5 tasks".
                  allowDecimals={false}
                />
                <Tooltip
                  content={<BucketTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* One piece of the bar per status. The same stackId is what
                    puts them on top of each other instead of side by side.
                    The thin stroke in the colour of the card is the gap that
                    keeps two touching colours apart. */}
                {TASK_STATUS_COLORS.map((bar) => (
                  <Bar
                    key={bar.status}
                    dataKey={bar.status}
                    name={bar.label}
                    stackId="bucket"
                    fill={bar.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={48}
                    // Every piece is rounded on its own head. Rounding only
                    // the last one would look right just when a bar has a
                    // cancelled task, and flat on every other bar.
                    radius={[4, 4, 0, 0]}
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
  return <div className="h-112 animate-pulse rounded-2xl bg-muted/50" />;
}
