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
} from "./TeamTile";
import { PRESENCE_COLORS, percentOf } from "./teamAnalytics";
import type { TeamRow } from "./teamAnalytics";

const ROW_HEIGHT = 40;
const CHART_PADDING = 44;

// Today written the long way, for example "Friday, 31 July 2026".
function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PresenceTooltip(props: {
  active?: boolean;
  payload?: { payload: TeamRow }[];
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
          {row.activeSize} {row.activeSize === 1 ? "person" : "people"}
        </span>
      </p>

      {PRESENCE_COLORS.map((status) => (
        <p key={status.key} className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="flex-1 text-muted-foreground">{status.label}</span>
          <span className="font-semibold tabular-nums">{row[status.key]}</span>
        </p>
      ))}
    </div>
  );
}

// Who of each team is in today.
//
// This is the tile a lead opens in the morning: it says which rooms are full
// and which one is missing half of its people before the day even starts.
//
// The last piece of every bar is grey and says "not marked". A day nobody
// answered for is not an absence, it is a day that is still open, and turning
// it into an absence would accuse people of something they did not do.
export function TeamPresenceChart(props: { rows: TeamRow[] }) {
  const rows = props.rows.filter((row) => row.activeSize > 0);

  let people = 0;
  let inToday = 0;
  let away = 0;
  let notMarked = 0;

  rows.forEach((row) => {
    people += row.activeSize;
    inToday += row.present + row.half_day;
    away += row.on_leave + row.absent;
    notMarked += row.not_marked;
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-amber-500/15" />

      <TileHeader
        title="Who is in today"
        subtitle={"The attendance of " + todayLabel() + ", team by team."}
      />

      {rows.length === 0 ? (
        <TileEmpty>No team has anybody in it yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={percentOf(inToday, people) + "%"}
              label="of the teams are in"
            />
            <TileFigure value={String(away)} label="away" tone="small" />
            <TileFigure
              value={String(notMarked)}
              label="still not marked"
              tone="small"
            />
          </TileFigures>

          <StatusLegendRow
            items={PRESENCE_COLORS.map((status) => ({
              label: status.label,
              color: status.color,
            }))}
          />

          <div
            className="relative w-full"
            style={{ height: rows.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
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
                  content={<PresenceTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {PRESENCE_COLORS.map((status, index) => (
                  <Bar
                    key={status.key}
                    dataKey={status.key}
                    name={status.label}
                    stackId="today"
                    fill={status.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                    maxBarSize={24}
                    radius={
                      index === PRESENCE_COLORS.length - 1
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
