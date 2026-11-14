import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ModuleStat } from "./moduleStats";

// The look of every chart tooltip. We read the theme colours, so the little
// box is white in the light theme and dark in the dark one without us
// writing the same colours twice.
const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
};

// The shared look of one tile of the grid.
const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The analytics of the whole workspace, drawn as one bento grid: a big ring
// that says how the records are shared out, a small gauge for every single
// module, and one wide chart that compares them all.
//
// There is no table here on purpose — every number on this page is a picture
// first, and the exact figure is written next to it.
export function ModuleAnalytics(props: {
  stats: ModuleStat[];
  isLoading: boolean;
}) {
  // Every record of the workspace together, written in the hole of the ring.
  let totalRecords = 0;
  let totalAttention = 0;

  props.stats.forEach((stat) => {
    totalRecords += stat.total;
    totalAttention += stat.attention;
  });

  if (props.isLoading) {
    return <LoadingGrid />;
  }

  return (
    <div className="grid auto-rows-auto gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* The hero tile: two columns wide and two rows tall. */}
      <WorkspaceRing
        stats={props.stats}
        totalRecords={totalRecords}
        totalAttention={totalAttention}
      />

      {/* One gauge per module. They flow into the free cells around and
          under the ring, which is what gives the grid its bento look. */}
      {props.stats.map((stat) => (
        <ModuleGauge key={stat.key} stat={stat} />
      ))}

      {/* The wide tile at the bottom: every module next to every other. */}
      <ModuleActivity stats={props.stats} />
    </div>
  );
}

// --- The hero ring ---------------------------------------------------------

function WorkspaceRing(props: {
  stats: ModuleStat[];
  totalRecords: number;
  totalAttention: number;
}) {
  // A module with nothing in it would only be an invisible slice, so we
  // leave it out of the ring.
  const slices = props.stats
    .filter((stat) => stat.total > 0)
    .map((stat) => ({
      name: stat.name,
      value: stat.total,
      color: stat.color,
    }));

  return (
    <div
      className={cn(
        TILE,
        "flex flex-col gap-4 md:col-span-2 lg:row-span-2"
      )}
    >
      {/* A soft indigo glow behind the ring, for depth. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative">
        <h2 className="text-lg font-semibold tracking-tight">Workspace</h2>
        <p className="text-sm text-muted-foreground">
          How your {props.totalRecords} records are shared out across the
          modules.
        </p>
      </div>

      {slices.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          Nothing to show yet.
        </p>
      ) : (
        <div className="relative flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          {/* The ring itself, with the total written in its hole. */}
          <div className="relative mx-auto h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="98%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {props.totalRecords}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">records</p>
              {props.totalAttention > 0 ? (
                <p className="mt-2 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  {props.totalAttention} need you
                </p>
              ) : (
                <p className="mt-2 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  All clear
                </p>
              )}
            </div>
          </div>

          {/* Our own legend: the module, how many records it holds, and how
              big a part of the workspace that is. */}
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
                  {Math.round((slice.value / props.totalRecords) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- One module ------------------------------------------------------------

// The tile of a single module: a round gauge filled to the progress of that
// module, the big number next to it, and the two words that matter.
//
// The whole tile is a link, so a click always lands on the module itself.
function ModuleGauge(props: { stat: ModuleStat }) {
  const stat = props.stat;
  const Icon = stat.icon;

  // The gauge draws one single value. PolarAngleAxis with a fixed 0..100
  // domain is what turns the bar into a real percentage ring instead of a
  // bar that always fills the whole circle.
  const gaugeData = [{ name: stat.name, value: stat.progress }];

  return (
    <Link
      to={stat.to}
      className={cn(
        TILE,
        "group flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/10"
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ backgroundColor: stat.color }}
      />

      <div className="relative flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: stat.color + "22", color: stat.color }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">
          {stat.name}
        </p>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>

      <div className="relative flex items-center gap-3">
        {/* The gauge. Its size is fixed, because a ring this small has no
            room to grow or shrink with the screen. */}
        <div className="relative h-20 w-20 shrink-0">
          <RadialBarChart
            width={80}
            height={80}
            data={gaugeData}
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              angleAxisId={0}
              cornerRadius={10}
              fill={stat.color}
              background={{ fill: "var(--muted)" }}
            />
          </RadialBarChart>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold tabular-nums">
              {stat.progress}%
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-3xl font-bold tabular-nums leading-none">
            {stat.total}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {stat.totalLabel}
          </p>

          <p className="mt-2 truncate text-xs">
            <span className="font-semibold">{stat.active}</span>{" "}
            <span className="text-muted-foreground">
              {stat.activeLabel.toLowerCase()}
            </span>
          </p>
        </div>
      </div>

      {/* The line that asks for something to be done. It stays grey and
          quiet when there is nothing to do. */}
      <div className="relative mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-xs">
        <span className="truncate text-muted-foreground">
          {stat.progressLabel}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 font-medium",
            stat.attention > 0
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {stat.attention} {stat.attentionLabel.toLowerCase()}
        </span>
      </div>
    </Link>
  );
}

// --- The wide comparison tile ----------------------------------------------

// Every module written as one split bar: the solid part is what is still
// open, the soft part is what is finished, and the grey tail is everything
// else (a cancelled task, a rejected leave, a day nobody marked).
//
// The bar is drawn with plain divs and not with a chart library on purpose.
// A bar this small has no room for axes and a legend, and painting it by
// hand is what lets every module keep its own colour and its own rounded
// segments.
function ModuleActivity(props: { stats: ModuleStat[] }) {
  return (
    <div className={cn(TILE, "md:col-span-2 lg:col-span-4")}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Module activity
          </h2>
          <p className="text-sm text-muted-foreground">
            What is still open, what is finished, and what is waiting for you.
          </p>
        </div>

        {/* The legend, as three small pills. */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-foreground/80" />
            Open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-foreground/30" />
            Finished
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-full bg-muted" />
            Rest
          </span>
        </div>
      </div>

      {/* Two columns on a wide screen, so eight modules stay short. */}
      <div className="grid gap-x-6 gap-y-1 md:grid-cols-2">
        {props.stats.map((stat) => (
          <ActivityRow key={stat.key} stat={stat} />
        ))}
      </div>
    </div>
  );
}

// One module of the wide tile.
function ActivityRow(props: { stat: ModuleStat }) {
  const stat = props.stat;
  const Icon = stat.icon;

  // Everything that is neither open nor finished: a cancelled task, a
  // rejected leave, a day nobody marked. It can never go below zero.
  const rest = Math.max(stat.total - stat.active - stat.closed, 0);

  // The width of each piece of the bar, in percent of the whole module.
  function share(value: number) {
    if (stat.total <= 0) {
      return 0;
    }
    return (value / stat.total) * 100;
  }

  return (
    <Link
      to={stat.to}
      className="group rounded-xl px-3 py-3 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: stat.color + "22", color: stat.color }}
        >
          <Icon className="h-4 w-4" />
        </span>

        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {stat.name}
        </p>

        {stat.attention > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            {stat.attention} {stat.attentionLabel.toLowerCase()}
          </span>
        ) : null}

        <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">
          {stat.total}
        </span>
      </div>

      {/* The bar. The three pieces sit next to each other with a small gap,
          so each one keeps its own rounded ends. */}
      <div className="mt-2.5 flex h-2.5 gap-1">
        {stat.total === 0 ? (
          <div className="h-full flex-1 rounded-full border border-dashed border-border" />
        ) : (
          <>
            <Segment
              width={share(stat.active)}
              color={stat.color}
              title={stat.active + " " + stat.activeLabel.toLowerCase()}
            />
            <Segment
              // The same colour, only much softer, so the finished part
              // still reads as this module and not as another one.
              width={share(stat.closed)}
              color={stat.color + "59"}
              title={stat.closed + " " + stat.closedLabel.toLowerCase()}
            />
            <Segment
              width={share(rest)}
              color="var(--muted)"
              title={rest + " other"}
            />
          </>
        )}
      </div>

      <p className="mt-2 truncate text-xs text-muted-foreground">
        {stat.total === 0
          ? "Nothing here yet"
          : stat.active +
            " " +
            stat.activeLabel.toLowerCase() +
            " · " +
            stat.closed +
            " " +
            stat.closedLabel.toLowerCase() +
            (rest > 0 ? " · " + rest + " other" : "")}
      </p>
    </Link>
  );
}

// One piece of a bar. A piece worth nothing is not drawn at all, so the gap
// next to it does not leave a hole in the bar.
function Segment(props: { width: number; color: string; title: string }) {
  if (props.width <= 0) {
    return null;
  }

  return (
    <div
      title={props.title}
      className="h-full rounded-full transition-[width] duration-500"
      style={{ width: props.width + "%", backgroundColor: props.color }}
    />
  );
}

// --- While the lists are still on their way --------------------------------

// The same bento shape in grey, so the page does not jump when the real
// numbers arrive.
function LoadingGrid() {
  return (
    <div className="grid auto-rows-auto gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="h-96 animate-pulse rounded-2xl bg-muted/50 md:col-span-2 lg:row-span-2" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-46 animate-pulse rounded-2xl bg-muted/50" />
      ))}
      <div className="h-96 animate-pulse rounded-2xl bg-muted/50 md:col-span-2 lg:col-span-4" />
    </div>
  );
}
