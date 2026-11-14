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
import { buildAgeBands, percentOf } from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

interface BandPoint {
  key: string;
  name: string;
  value: number;
  color: string;
}

function AgeTooltip(props: {
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
        {percentOf(point.value, props.total || 0)}% of the ones with a birth
        date
      </p>
    </div>
  );
}

// How old the people here are.
//
// It is the one reading on this page that says nothing about the work and
// everything about the company: a team packed into one band will all want the
// same things at the same time — the same training now, the same promotions in
// three years, the same retirements in twenty.
//
// The birth date is optional on the employee form, so the bars are drawn over
// the people who have one and the tile says out loud how many it could not
// place. That line matters more here than anywhere else on the page: an age
// chart over a third of the team is not an age chart.
export function EmployeeAgeChart(props: { rows: EmployeeRow[] }) {
  const result = buildAgeBands(props.rows);

  // The widest band, so the tile can name the shape instead of leaving the
  // reader to squint at six bars.
  const sorted = [...result.bands].sort((left, right) => right.value - left.value);
  const widest = sorted.length > 0 ? sorted[0] : null;

  return (
    <div className={TILE}>
      <TileGlow className="bg-teal-500/15" />

      <TileHeader
        title="How old the team is"
        subtitle="Age bands, read over the people who have a birth date on file."
      />

      {result.placed === 0 ? (
        <TileEmpty>
          Nobody has a birth date on file, so there is no age to read yet.
        </TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(result.averageAge)} label="years old on average" />
            <TileFigure
              value={String(result.placed)}
              label={
                "of " +
                props.rows.length +
                (props.rows.length === 1 ? " person counted" : " people counted")
              }
              tone="small"
            />
            {widest && widest.value > 0 ? (
              <TileFigure
                value={percentOf(widest.value, result.placed) + "%"}
                label={"are " + widest.name.toLowerCase()}
                tone="small"
              />
            ) : null}
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
                  content={<AgeTooltip total={result.placed} />}
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

          {result.missing > 0 ? (
            <TileNote>
              {result.missing}{" "}
              {result.missing === 1 ? "person has" : "people have"} no birth
              date on file and could not be placed in a band.
            </TileNote>
          ) : null}
        </>
      )}
    </div>
  );
}
