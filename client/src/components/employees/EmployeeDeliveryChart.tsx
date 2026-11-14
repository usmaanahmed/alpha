import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  ZAxis,
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
} from "./EmployeeTile";
import { colorForRank, percentOf } from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

// How many bubbles the chart draws, ranked by how much work the person has
// handled. Past this the bubbles start sitting on top of each other and the
// chart stops saying anything.
const MAX_PEOPLE = 16;

// One bubble.
interface DeliveryPoint {
  id: string;
  name: string;
  designation: string;
  departmentName: string;
  doneRate: number;
  lateRate: number;
  open: number;
  completed: number;
  overdue: number;
  handled: number;
  color: string;
}

function DeliveryTooltip(props: {
  active?: boolean;
  payload?: { payload: DeliveryPoint }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const point = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="flex items-center gap-2 font-semibold">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: point.color }}
        />
        {point.name}
      </p>
      <p className="mb-1.5 text-muted-foreground">
        {point.designation || "No designation"}
        {point.departmentName ? " · " + point.departmentName : ""}
      </p>

      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Work finished</span>
        <span className="font-semibold tabular-nums">{point.doneRate}%</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Open work that is late</span>
        <span className="font-semibold tabular-nums">{point.lateRate}%</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Still open</span>
        <span className="font-semibold tabular-nums">{point.open}</span>
      </p>

      <p className="mt-1.5 border-t border-border/60 pt-1.5 text-muted-foreground">
        {point.completed} done · {point.overdue} late · {point.handled} handled
        in all
      </p>
    </div>
  );
}

// Delivery: who finishes their work, and who falls behind.
//
// Every person is one bubble:
// - how far RIGHT they sit -> how much of their work is finished,
// - how far UP they sit    -> how much of their open work is already late,
// - how BIG the bubble is  -> how many tasks they are still holding.
//
// So the healthy corner is the bottom right (much done, nothing late) and the
// corner that needs somebody is the top left. A big bubble in the top left is
// the worst thing this page can show: a lot of work, late, and not moving.
//
// The two dashed lines are the company itself, so nobody is judged against a
// number somebody made up: they are judged against the room they work in. And
// a cancelled task is left out of "work finished" — it was never meant to be
// finished, and counting it would punish somebody for dropping work they were
// right to drop.
export function EmployeeDeliveryChart(props: { rows: EmployeeRow[] }) {
  // Somebody who was never given a task has no delivery to speak of: they
  // would sit at 0% / 0% and look like they are failing at nothing.
  const withWork = props.rows.filter((row) => row.tasks > 0);

  const ranked = [...withWork].sort((left, right) => {
    if (right.tasks !== left.tasks) {
      return right.tasks - left.tasks;
    }
    return left.name.localeCompare(right.name);
  });

  const points: DeliveryPoint[] = ranked.slice(0, MAX_PEOPLE).map((row, index) => ({
    id: row.id,
    name: row.name,
    designation: row.designation,
    departmentName: row.departmentName,
    doneRate: row.doneRate,
    lateRate: row.lateRate,
    // A bubble of zero would be invisible, and "nothing open" is exactly what
    // this chart wants to show as a small dot rather than as no dot at all.
    open: row.open,
    completed: row.completed,
    overdue: row.overdue,
    handled: row.tasks,
    color: colorForRank(index),
  }));

  let completed = 0;
  let realTasks = 0;
  let overdue = 0;
  let open = 0;

  withWork.forEach((row) => {
    completed += row.completed;
    realTasks += row.tasks - row.cancelled;
    overdue += row.overdue;
    open += row.open;
  });

  const companyDone = percentOf(completed, realTasks);
  const companyLate = percentOf(overdue, open);

  // The one who finishes the most, and the one furthest behind. They are read
  // off the people we drew, so the sentence and the chart always agree.
  const byDone = [...points].sort((left, right) => right.doneRate - left.doneRate);
  const byLate = [...points].sort((left, right) => right.lateRate - left.lateRate);

  const best = byDone[0];
  const worst = byLate[0];

  const hidden = ranked.length - points.length;

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="Who delivers, and who is falling behind"
        subtitle="Right is finished work, up is late work, and the bubble is how much is still open."
      />

      {points.length === 0 ? (
        <TileEmpty>Nobody has been given a task yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={companyDone + "%"} label="of all work is done" />
            <TileFigure
              value={companyLate + "%"}
              label="of the open work is late"
              tone="small"
            />
            <TileFigure
              value={String(points.length)}
              label="people compared"
              tone="small"
            />
          </TileFigures>

          <div className="relative h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />

                <XAxis
                  type="number"
                  dataKey="doneRate"
                  name="Work finished"
                  unit="%"
                  domain={[0, 100]}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  label={{
                    value: "Work finished",
                    position: "insideBottom",
                    offset: -10,
                    fill: "var(--muted-foreground)",
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="lateRate"
                  name="Open work that is late"
                  unit="%"
                  domain={[0, 100]}
                  width={44}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                {/* How big the bubble is drawn. The number behind it is the
                    open work, so the biggest bubble is the biggest queue. */}
                <ZAxis type="number" dataKey="open" range={[70, 620]} />

                {/* The two lines of the company itself. Somebody above the
                    flat line is later than the company average; somebody to
                    the right of the upright one finishes more than average. */}
                <ReferenceLine
                  y={companyLate}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  x={companyDone}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />

                <Tooltip
                  content={<DeliveryTooltip />}
                  cursor={{ strokeDasharray: "3 3" }}
                />

                <Scatter data={points} fillOpacity={0.75}>
                  {points.map((point) => (
                    <Cell
                      key={point.id}
                      fill={point.color}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* The bubbles carry no name on them — there would not be room — so
              the people are named here, with their two numbers written out.
              Nothing on this tile is read by colour alone. */}
          <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {points.map((point) => (
              <div key={point.id} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: point.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {point.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {point.doneRate}% done
                </span>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {point.overdue} late
                </span>
              </div>
            ))}
          </div>

          {best && worst ? (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{best.name}</span>{" "}
              finishes the most of their work ({best.doneRate}%)
              {worst.lateRate > 0 ? (
                <>
                  , while{" "}
                  <span className="font-semibold text-foreground">
                    {worst.name}
                  </span>{" "}
                  is the furthest behind, with {worst.lateRate}% of their open
                  work past its due date.
                </>
              ) : (
                <>, and nobody is late on anything right now.</>
              )}
            </p>
          ) : null}

          {hidden > 0 ? (
            <TileNote>
              {hidden} more {hidden === 1 ? "person is" : "people are"} holding
              work but not drawn here; the chart keeps the {MAX_PEOPLE} who
              have handled the most.
            </TileNote>
          ) : null}
        </>
      )}
    </div>
  );
}
