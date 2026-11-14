import { Link } from "react-router-dom";
import { ArrowUpRight, Repeat2 } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { Task } from "@/types/task.types";
import { getReassignmentCount } from "@/types/task.types";
import { TASK_STATUS_COLORS } from "./taskStatusColors";

// The look of the chart tooltip. We read the theme colours, so the little box
// is white in the light theme and dark in the dark one without us writing the
// same colours twice.
const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
};

// The shared look of one tile of the dashboard, the same one the module
// analytics grid uses, so this section sits in the same family.
const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The five statuses a task can really be in, in the order of the workflow,
// each with the words we show and its own colour.
//
// The list lives in its own file because the two task bar charts under this
// ring draw the same five statuses. One status therefore keeps one colour
// across the whole dashboard.
const STATUS_SLICES = TASK_STATUS_COLORS;

// The analytics of the task module: one ring that says where every task of
// the workspace stands right now.
//
// "Reassigned" is counted too, but it is written next to the ring and not
// drawn as a sixth slice. A reassigned task is still a "to do" or an "in
// progress" task, so putting it in the ring would count that same task two
// times and the percentages would stop adding up to 100.
export function TaskAnalytics(props: { tasks: Task[]; isLoading: boolean }) {
  if (props.isLoading) {
    return <LoadingTile />;
  }

  // How many tasks sit in each status, in the workflow order above.
  const slices = STATUS_SLICES.map((slice) => {
    const tasks = props.tasks.filter((task) => task.status === slice.status);

    return {
      name: slice.label,
      value: tasks.length,
      color: slice.color,
    };
  });

  const total = props.tasks.length;

  // Every task that already changed hands at least one time.
  const reassignedTasks = props.tasks.filter(
    (task) => getReassignmentCount(task) > 0
  );

  // A status nobody is in would only be an invisible slice, so it stays out
  // of the ring. It still keeps its line in the legend, so the reader sees
  // that the status exists and holds zero.
  const drawnSlices = slices.filter((slice) => slice.value > 0);

  // part of the whole as a whole percent. An empty board gives 0 instead of
  // a division by zero.
  function percent(part: number) {
    if (total <= 0) {
      return 0;
    }
    return Math.round((part / total) * 100);
  }

  return (
    <div className={TILE}>
      {/* A soft violet glow behind the ring, for depth. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Task analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Where every task of the workspace stands right now.
          </p>
        </div>

        <Link
          to="/organization/tasks"
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open tasks
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {total === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          No tasks yet.
        </p>
      ) : (
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* The ring itself, with the total written in its hole. */}
          <div className="relative mx-auto h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={drawnSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="98%"
                  // The small gap and the stroke in the card colour are what
                  // keep two slices apart even when their colours are close.
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {drawnSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">tasks</p>
            </div>
          </div>

          {/* Our own legend: the status, how many tasks are in it, and how big
              a part of the board that is. The number is written next to every
              colour, so the ring is never read by colour alone. */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {slices.map((slice) => (
              <div key={slice.name} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {slice.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {slice.value}
                </span>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {percent(slice.value)}%
                </span>
              </div>
            ))}

            {/* Reassigned tasks. They live under the line of the legend
                because they are not one more slice of the ring: a reassigned
                task is already counted in its own status above. */}
            <div className="mt-1 flex items-center gap-2.5 border-t border-border/60 pt-3">
              <Repeat2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                Reassigned at least once
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {reassignedTasks.length}
              </span>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {percent(reassignedTasks.length)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The same tile in grey, so the page does not jump when the tasks arrive.
function LoadingTile() {
  return <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />;
}
