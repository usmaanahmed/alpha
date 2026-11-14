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
} from "./TeamTile";
import type { TeamRow } from "./teamAnalytics";

// How this chart is read.
//
// Every team is one bubble:
// - how far RIGHT it sits  -> how much of its work is finished,
// - how far UP it sits     -> how much of its open work is already late,
// - how BIG it is          -> how many open tasks it is still holding.
//
// So the healthy corner is the bottom right (much done, nothing late) and the
// corner that needs somebody is the top left. A big bubble in the top left is
// the worst thing this page can show: a team with a lot of work, late, and not
// moving.
function DeliveryTooltip(props: {
  active?: boolean;
  payload?: { payload: TeamRow }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const row = props.payload[0].payload;

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
        <span className="flex-1 text-muted-foreground">Work finished</span>
        <span className="font-semibold tabular-nums">{row.doneRate}%</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">
          Open work that is late
        </span>
        <span className="font-semibold tabular-nums">{row.lateRate}%</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Open tasks</span>
        <span className="font-semibold tabular-nums">{row.open}</span>
      </p>

      <p className="mt-1.5 border-t border-border/60 pt-1.5 text-muted-foreground">
        {row.size} {row.size === 1 ? "person" : "people"} · {row.completed} done
        · {row.overdue} late
        {row.lead ? " · led by " + row.lead.name : " · no lead"}
      </p>
    </div>
  );
}

// Delivery: which teams finish their work, and which ones fall behind.
//
// The two numbers are worked out per team and not for the workspace, so a team
// of two is judged on its own work and not drowned by a team of ten. A
// cancelled task is left out of "work finished": it was never meant to be
// finished, and counting it would punish a team for dropping work it was right
// to drop.
export function TeamDeliveryChart(props: { rows: TeamRow[] }) {
  // A team whose people hold no task at all has no delivery to speak of: it
  // would sit at 0% / 0% and pretend to be late when it simply has nothing.
  const rows = props.rows.filter((row) => row.tasks > 0);

  let completed = 0;
  let realTasks = 0;
  let overdue = 0;
  let open = 0;

  rows.forEach((row) => {
    completed += row.completed;
    realTasks += row.tasks - row.cancelled;
    overdue += row.overdue;
    open += row.open;
  });

  const allDone = realTasks === 0 ? 0 : Math.round((completed / realTasks) * 100);
  const allLate = open === 0 ? 0 : Math.round((overdue / open) * 100);

  // The best and the worst of the page, so the reader has one sentence to take
  // away without hunting through the bubbles.
  const byDone = [...rows].sort((left, right) => right.doneRate - left.doneRate);
  const byLate = [...rows].sort((left, right) => right.lateRate - left.lateRate);

  const best = byDone[0];
  const worst = byLate[0];

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="Delivery and lateness"
        subtitle="Right is finished work, up is late work, and the bubble is how much is still open."
      />

      {rows.length === 0 ? (
        <TileEmpty>No team has been given a task yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={allDone + "%"} label="of all team work is done" />
            <TileFigure
              value={allLate + "%"}
              label="of the open work is late"
              tone="small"
            />
            <TileFigure
              value={String(rows.length)}
              label={rows.length === 1 ? "team compared" : "teams compared"}
              tone="small"
            />
          </TileFigures>

          <div className="relative h-72 w-full">
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
                <ZAxis type="number" dataKey="open" range={[80, 700]} />

                {/* The two lines of the workspace itself. A team above the
                    flat line is later than the average, one to the right of
                    the upright line finishes more than average. */}
                <ReferenceLine
                  y={allLate}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  x={allDone}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                />

                <Tooltip
                  content={<DeliveryTooltip />}
                  cursor={{ strokeDasharray: "3 3" }}
                />

                <Scatter data={rows} fillOpacity={0.75}>
                  {rows.map((row) => (
                    <Cell
                      key={row.id}
                      fill={row.color}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* The bubbles carry no name on them — there would not be room — so
              the teams are named here, with the two numbers written out.
              Nothing on this tile is read by colour alone. */}
          <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {row.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {row.doneRate}% done
                </span>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {row.overdue} late
                </span>
              </div>
            ))}
          </div>

          {best && worst ? (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{best.name}</span>{" "}
              finishes the most of its work ({best.doneRate}%)
              {worst.lateRate > 0 ? (
                <>
                  , while{" "}
                  <span className="font-semibold text-foreground">
                    {worst.name}
                  </span>{" "}
                  is the latest, with {worst.lateRate}% of its open work past
                  its due date.
                </>
              ) : (
                <>, and no team is late on anything right now.</>
              )}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
