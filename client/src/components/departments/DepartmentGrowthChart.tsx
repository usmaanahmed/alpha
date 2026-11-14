import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
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
  StatusLegendRow,
} from "./DepartmentTile";
import { formatMonths } from "./departmentAnalytics";
import type { DepartmentRow } from "./departmentAnalytics";

const JOINED_COLOR = "#059669";
const LEFT_COLOR = "#dc2626";

const ROW_HEIGHT = 40;
const CHART_PADDING = 44;

// One line of the chart: the department, and its year drawn as two bars that
// grow away from the middle.
//
// leftAsNegative is the same number as left, written as a minus. That is the
// whole trick of this chart: recharts draws a negative value to the LEFT of
// zero, so the people who walked out grow one way and the people who came in
// grow the other. The tooltip below always shows the real, positive number.
interface GrowthPoint {
  id: string;
  name: string;
  joined: number;
  left: number;
  leftAsNegative: number;
  net: number;
  people: number;
  averageTenure: number;
}

function GrowthTooltip(props: {
  active?: boolean;
  payload?: { payload: GrowthPoint }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const point = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 flex items-baseline justify-between gap-4 font-semibold">
        {point.name}
        <span className="tabular-nums text-muted-foreground">
          {point.people} {point.people === 1 ? "person" : "people"} today
        </span>
      </p>

      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: JOINED_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">Joined</span>
        <span className="font-semibold tabular-nums">{point.joined}</span>
      </p>
      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: LEFT_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">Left</span>
        <span className="font-semibold tabular-nums">{point.left}</span>
      </p>

      <p className="mt-1.5 flex items-center gap-4 border-t border-border/60 pt-1.5 text-muted-foreground">
        <span>
          net {point.net > 0 ? "+" : ""}
          {point.net}
        </span>
        <span>average {formatMonths(point.averageTenure)} here</span>
      </p>
    </div>
  );
}

// The last twelve months of every department: who came in, and who walked out.
//
// The two bars grow away from the middle line, so a department that is hiring
// leans right and one that is losing people leans left. A long bar on both
// sides is the interesting one: that department is not growing, it is
// churning — the same seat filled twice.
//
// "Left" counts the people whose exit date falls in the last twelve months, so
// somebody who left three years ago does not keep haunting this chart.
export function DepartmentGrowthChart(props: { rows: DepartmentRow[] }) {
  const points: GrowthPoint[] = props.rows
    .filter((row) => row.joinedLastYear > 0 || row.leftLastYear > 0)
    .map((row) => ({
      id: row.id,
      name: row.name,
      joined: row.joinedLastYear,
      left: row.leftLastYear,
      leftAsNegative: -row.leftLastYear,
      net: row.joinedLastYear - row.leftLastYear,
      people: row.people,
      averageTenure: row.averageTenure,
    }));

  // The department that grew the most sits on top.
  points.sort((left, right) => {
    if (right.net !== left.net) {
      return right.net - left.net;
    }
    return left.name.localeCompare(right.name);
  });

  let joined = 0;
  let left = 0;

  points.forEach((point) => {
    joined += point.joined;
    left += point.left;
  });

  // The average time the whole workspace has been here, counted over the
  // departments that have somebody in them.
  const staffed = props.rows.filter((row) => row.people > 0);

  let tenureTotal = 0;
  let tenurePeople = 0;

  staffed.forEach((row) => {
    tenureTotal += row.averageTenure * row.people;
    tenurePeople += row.people;
  });

  const averageTenure =
    tenurePeople === 0 ? 0 : Math.round(tenureTotal / tenurePeople);

  return (
    <div className={TILE}>
      <TileGlow className="bg-teal-500/15" />

      <TileHeader
        title="Who came and who left"
        subtitle="The last twelve months of every department, growing away from the middle."
      />

      {points.length === 0 ? (
        <TileEmpty>
          Nobody joined or left a department in the last twelve months.
        </TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={(joined - left > 0 ? "+" : "") + String(joined - left)}
              label="people over the year"
            />
            <TileFigure
              value={joined + " in / " + left + " out"}
              label="in total"
              tone="small"
            />
            <TileFigure
              value={formatMonths(averageTenure)}
              label="average time here"
              tone="small"
            />
          </TileFigures>

          <StatusLegendRow
            items={[
              { label: "Joined", color: JOINED_COLOR },
              { label: "Left", color: LEFT_COLOR },
            ]}
          />

          <div
            className="relative w-full"
            style={{ height: points.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={points}
                layout="vertical"
                stackOffset="sign"
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
                  // The left half of the axis holds negative numbers, but "−3
                  // people left" is not how anybody says it: the minus is the
                  // side of the chart, not part of the count.
                  tickFormatter={(value: number) => String(Math.abs(value))}
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
                  content={<GrowthTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* The middle line: nobody in, nobody out. */}
                <ReferenceLine x={0} stroke="var(--border)" />

                <Bar
                  dataKey="leftAsNegative"
                  name="Left"
                  stackId="year"
                  fill={LEFT_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={24}
                  radius={[4, 0, 0, 4]}
                />
                <Bar
                  dataKey="joined"
                  name="Joined"
                  stackId="year"
                  fill={JOINED_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={24}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
