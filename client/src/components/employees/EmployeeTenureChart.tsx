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
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  TileNote,
} from "./EmployeeTile";
import { buildTenureBands, formatMonths, percentOf } from "./employeeAnalytics";
import type { EmployeeHeadline, EmployeeRow } from "./employeeAnalytics";

interface BandPoint {
  key: string;
  name: string;
  value: number;
  color: string;
}

function TenureTooltip(props: {
  active?: boolean;
  payload?: { payload: BandPoint }[];
  total?: number;
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const point = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{point.name}</p>
      <p className="text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">
          {point.value}
        </span>{" "}
        {point.value === 1 ? "person" : "people"} ·{" "}
        {percentOf(point.value, props.total || 0)}% of the team
      </p>
    </div>
  );
}

// How long the people here have stayed.
//
// One average hides the shape completely: a company where everybody arrived
// last month and one where half the team has five years behind it can carry
// the very same number. The bands show which of the two you are looking at.
//
// The two bands on the left are the ones to read first. A tall "under three
// months" means a lot of people are still learning the job, and a tall "three
// to six" a year from now means they stayed.
export function EmployeeTenureChart(props: {
  rows: EmployeeRow[];
  headline: EmployeeHeadline;
}) {
  const result = buildTenureBands(props.rows);
  const head = props.headline;

  // Everybody who has been here for less than half a year. It is the number a
  // lead actually plans around: that is the part of the team that still needs
  // somebody looking over their shoulder.
  let fresh = 0;

  result.bands.forEach((band, index) => {
    if (index <= 1) {
      fresh += band.value;
    }
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-violet-500/15" />

      <TileHeader
        title="How long they have stayed"
        subtitle="The team cut into bands of time here, because one average hides the shape."
      />

      {result.placed === 0 ? (
        <TileEmpty>
          Nobody has a joining date on file, so there is no tenure to read yet.
        </TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={formatMonths(head.averageTenure)}
              label="on average"
            />
            <TileFigure
              value={formatMonths(head.medianTenure)}
              label="in the middle"
              tone="small"
            />
            <TileFigure
              value={percentOf(fresh, result.placed) + "%"}
              label="here under six months"
              tone="small"
            />
          </TileFigures>

          <div className="relative h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.bands}
                margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval={0}
                />
                <YAxis
                  width={32}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  content={<TenureTooltip total={result.placed} />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                <Bar dataKey="value" maxBarSize={56} radius={[6, 6, 0, 0]}>
                  {result.bands.map((band) => (
                    <Cell key={band.key} fill={band.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* The two ends of the list, named. The bars say how many, this line
              says who. */}
          {head.longest && head.newest ? (
            <p className="relative mt-3 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {head.longest.name}
              </span>{" "}
              has been here the longest ({formatMonths(head.longest.tenureMonths)}
              ), and{" "}
              <span className="font-semibold text-foreground">
                {head.newest.name}
              </span>{" "}
              is the newest ({formatMonths(head.newest.tenureMonths)}).
            </p>
          ) : null}

          {result.missing > 0 ? (
            <TileNote>
              {result.missing}{" "}
              {result.missing === 1 ? "person has" : "people have"} no joining
              date on file and could not be placed in a band.
            </TileNote>
          ) : null}
        </>
      )}
    </div>
  );
}
