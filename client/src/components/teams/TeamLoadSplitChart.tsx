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
import { Scale } from "lucide-react";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
} from "./TeamTile";
import {
  buildLoadRows,
  countLoadSegments,
  percentOf,
  segmentOpacity,
} from "./teamAnalytics";
import type { LoadRow, TeamRow } from "./teamAnalytics";

const ROW_HEIGHT = 44;
const CHART_PADDING = 44;

// The little box that follows the mouse: the team, and then every person of it
// with the open work sitting on them.
//
// The blocks of a bar are shades of one colour, so this box is the only place
// that says who is who. That is on purpose: writing eight names along a bar
// would be unreadable, and a colour per person would need a legend longer than
// the chart.
function LoadTooltip(props: {
  active?: boolean;
  payload?: { payload: LoadRow }[];
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
          {row.open} open
        </span>
      </p>

      {row.segments.map((segment, index) => (
        <p key={segment.name} className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: row.color,
              opacity: segmentOpacity(index),
            }}
          />
          <span className="flex-1 text-muted-foreground">{segment.name}</span>
          <span className="font-semibold tabular-nums">{segment.open}</span>
          <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
            {percentOf(segment.open, row.open)}%
          </span>
        </p>
      ))}

      <p className="mt-1.5 border-t border-border/60 pt-1.5 text-muted-foreground">
        An even share between {row.size}{" "}
        {row.size === 1 ? "person" : "people"} would be {row.evenShare}% each.
      </p>
    </div>
  );
}

// How the open work is split INSIDE each team.
//
// Every other chart on this page reads a team as one lump. This one opens it:
// each bar is cut into one block per person, the fullest hands on the left, so
// the shape of the bar is the shape of the team.
//
//   many blocks of the same width -> the work is shared
//   one long block and a few slivers -> one person is carrying the team
//
// The blocks are shades of the team's own colour, from full to pale, because
// they are pieces of one thing and not five different things. Who is who is
// written in the tooltip and in the line under the chart, so nothing here has
// to be read by colour alone.
export function TeamLoadSplitChart(props: { rows: TeamRow[] }) {
  const loadRows = buildLoadRows(props.rows);
  const segmentCount = countLoadSegments(loadRows);

  // The block keys the chart has to draw: m0, m1, m2... as many as the widest
  // team has. A smaller team simply has nothing under the last keys, and
  // recharts draws nothing for them.
  const blocks: number[] = [];

  for (let index = 0; index < segmentCount; index += 1) {
    blocks.push(index);
  }

  // The team where the work sits on the fewest shoulders, and the one where it
  // is shared the most evenly. Only teams of more than one person can be
  // "shared", so a team of one is left out of the comparison.
  const shareable = loadRows.filter((row) => row.size > 1);

  const byShare = [...shareable].sort(
    (left, right) => right.loadShare - left.loadShare
  );

  const mostCarried = byShare[0];
  const mostShared = byShare[byShare.length - 1];

  let open = 0;
  let onTheBusiest = 0;

  loadRows.forEach((row) => {
    open += row.open;

    if (row.segments.length > 0) {
      onTheBusiest += row.segments[0].open;
    }
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-violet-500/15" />

      <TileHeader
        title="How the work is shared inside each team"
        subtitle="One block per person, the fullest hands first. A long first block is a team leaning on one person."
      />

      {loadRows.length === 0 ? (
        <TileEmpty>No team is holding open work right now.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={percentOf(onTheBusiest, open) + "%"}
              label="of the open work sits on one person per team"
            />
            <TileFigure
              value={String(loadRows.length)}
              label={loadRows.length === 1 ? "team at work" : "teams at work"}
              tone="small"
            />
          </TileFigures>

          <p className="relative mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Scale className="h-3.5 w-3.5 shrink-0" />
            Each block is one person of that team, drawn from the full colour
            (the busiest) to the palest (the freest).
          </p>

          <div
            className="relative w-full"
            style={{ height: loadRows.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={loadRows}
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
                  content={<LoadTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* One piece of the bar per person. Every piece is the colour
                    of its own team, so a row never borrows the colour of the
                    row above it: that is why the fill is set per cell and not
                    on the bar. */}
                {blocks.map((index) => (
                  <Bar
                    key={index}
                    dataKey={"m" + index}
                    stackId="load"
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={26}
                  >
                    {loadRows.map((row) => (
                      <Cell
                        key={row.id}
                        fill={row.color}
                        fillOpacity={segmentOpacity(index)}
                      />
                    ))}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* The bars carry no name on them — there would not be room — so the
              busiest person of every team is written out here, with the share
              they are holding. */}
          <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {loadRows.map((row) => (
              <div key={row.id} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {row.segments.length > 0 ? row.segments[0].name : row.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {row.loadShare}%
                </span>
                <span className="w-24 shrink-0 truncate text-right text-xs text-muted-foreground">
                  of {row.name}
                </span>
              </div>
            ))}
          </div>

          {mostCarried && mostShared && mostCarried.id !== mostShared.id ? (
            <p className="mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {mostCarried.name}
              </span>{" "}
              leans on one person the most ({mostCarried.loadShare}% of its open
              work on {mostCarried.segments[0].name}), while{" "}
              <span className="font-semibold text-foreground">
                {mostShared.name}
              </span>{" "}
              shares it the most evenly ({mostShared.loadShare}% on its busiest,
              against {mostShared.evenShare}% for an even split).
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
