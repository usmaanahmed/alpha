import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
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
} from "./EmployeeTile";
import { buildGrowthPoints } from "./employeeAnalytics";
import type { EmployeeRow, GrowthPoint } from "./employeeAnalytics";

const JOINED_COLOR = "#059669";
const LEFT_COLOR = "#dc2626";
const HEADCOUNT_COLOR = "#6366f1";

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
      <p className="mb-1.5 font-semibold">{point.label}</p>

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
      <p className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: HEADCOUNT_COLOR }}
        />
        <span className="flex-1 text-muted-foreground">On the books</span>
        <span className="font-semibold tabular-nums">{point.headcount}</span>
      </p>
    </div>
  );
}

// The last twelve months of the whole workforce.
//
// The bars grow away from the middle line — up is somebody who joined, down is
// somebody who walked out — and the line on top is how many people were on the
// books when each month closed.
//
// The line is what makes this tile worth reading. Bars on both sides of the
// middle with a flat line is the shape nobody wants: the same seats being
// filled twice, month after month, while the company never actually grows.
//
// Somebody whose joining date was never filled in is counted as having always
// been here, so the line agrees with the head count the rest of the page uses.
export function EmployeeGrowthChart(props: { rows: EmployeeRow[] }) {
  const points = buildGrowthPoints(props.rows);

  let joined = 0;
  let left = 0;

  points.forEach((point) => {
    joined += point.joined;
    left += point.left;
  });

  const first = points[0];
  const last = points[points.length - 1];

  // How the head count moved over the year. It is not the same as "joined
  // minus left": somebody with no joining date on file is in the line from the
  // first month, and never in a bar.
  const change = last.headcount - first.headcount;

  const busiest = [...points].sort(
    (a, b) => b.joined + b.left - (a.joined + a.left)
  )[0];

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="The last twelve months"
        subtitle="Who came in, who walked out, and how big the team was at the end of every month."
      />

      {joined === 0 && left === 0 ? (
        <TileEmpty>
          Nobody joined or left in the last twelve months, so there is no
          movement to draw.
        </TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={(change > 0 ? "+" : "") + String(change)}
              label="people over the year"
            />
            <TileFigure
              value={joined + " in / " + left + " out"}
              label="in total"
              tone="small"
            />
            <TileFigure
              value={String(last.headcount)}
              label="on the books today"
              tone="small"
            />
            {busiest && busiest.joined + busiest.left > 0 ? (
              <TileFigure
                value={busiest.label}
                label="was the busiest month"
                tone="small"
              />
            ) : null}
          </TileFigures>

          <StatusLegendRow
            items={[
              { label: "Joined", color: JOINED_COLOR },
              { label: "Left", color: LEFT_COLOR },
              { label: "On the books", color: HEADCOUNT_COLOR },
            ]}
          />

          <div className="relative h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={points}
                stackOffset="sign"
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval={0}
                />
                {/* The left axis counts the people who moved, the right one
                    the whole team. They are two different sizes, so they get
                    two different scales and each one is named by the colour of
                    its own ticks. */}
                <YAxis
                  yAxisId="movement"
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  tickFormatter={(value: number) => String(Math.abs(value))}
                />
                <YAxis
                  yAxisId="headcount"
                  orientation="right"
                  width={36}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: HEADCOUNT_COLOR, fontSize: 12 }}
                />
                <Tooltip
                  content={<GrowthTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {/* Nobody in, nobody out. */}
                <ReferenceLine yAxisId="movement" y={0} stroke="var(--border)" />

                <Bar
                  yAxisId="movement"
                  dataKey="joined"
                  name="Joined"
                  stackId="movement"
                  fill={JOINED_COLOR}
                  maxBarSize={26}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="movement"
                  dataKey="leftAsNegative"
                  name="Left"
                  stackId="movement"
                  fill={LEFT_COLOR}
                  maxBarSize={26}
                  radius={[0, 0, 4, 4]}
                />

                <Line
                  yAxisId="headcount"
                  type="monotone"
                  dataKey="headcount"
                  name="On the books"
                  stroke={HEADCOUNT_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: HEADCOUNT_COLOR, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="relative mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
            {change > 0 ? (
              <>
                The team grew by{" "}
                <span className="font-semibold text-foreground">{change}</span>{" "}
                over the year, with {joined} people in and {left} out.
              </>
            ) : change < 0 ? (
              <>
                The team shrank by{" "}
                <span className="font-semibold text-foreground">
                  {Math.abs(change)}
                </span>{" "}
                over the year: {left} people walked out and only {joined} came
                in.
              </>
            ) : (
              <>
                The team is the same size as a year ago — {joined} in, {left}{" "}
                out, the same seats filled again.
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
}
