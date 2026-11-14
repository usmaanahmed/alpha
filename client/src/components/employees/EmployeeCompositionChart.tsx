import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  LegendRow,
  BarRow,
} from "./EmployeeTile";
import {
  CHART_TOOLTIP_STYLE,
  buildEmploymentSlices,
  buildGenderSlices,
  percentOf,
} from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

// What the workforce is made of.
//
// The ring is the kind of contract people are on, because that is the reading
// that changes what the company owes them: a team of ten where four are
// interns and two are on a contract is not a team of ten. The bars underneath
// are the gender split, kept apart from the ring on purpose — two rings side
// by side invite a comparison between two things that have nothing to do with
// each other.
//
// "Not given" is a slice of its own and not a gap. Half a workforce that never
// filled the field in is a fact about the records, and the panel that hides it
// makes the rest of the split look more certain than it is.
export function EmployeeCompositionChart(props: { rows: EmployeeRow[] }) {
  const employment = buildEmploymentSlices(props.rows);
  const genders = buildGenderSlices(props.rows);

  const total = props.rows.length;

  // A slice of zero would only put a colour in the ring that stands for
  // nobody, so it is left out of the drawing — and kept in the legend below,
  // where "Intern 0" is worth knowing.
  const drawn = employment.filter((slice) => slice.value > 0);

  const genderTotal = genders.reduce((sum, slice) => sum + slice.value, 0);
  const biggestGender = Math.max(...genders.map((slice) => slice.value), 1);

  // How many people the records could not place: the gender field left empty.
  const unknownGender =
    genders.find((slice) => slice.key === "unknown")?.value || 0;

  return (
    <div className={TILE}>
      <TileGlow className="bg-indigo-500/15" />

      <TileHeader
        title="What the workforce is made of"
        subtitle="The contract people are on, and how the team splits by gender."
      />

      {total === 0 ? (
        <TileEmpty>Nobody works here yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(total)} label="people on the books" />
            <TileFigure
              value={
                percentOf(
                  employment.find((slice) => slice.key === "full_time")
                    ?.value || 0,
                  total
                ) + "%"
              }
              label="are full time"
              tone="small"
            />
          </TileFigures>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={drawn}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="98%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {drawn.map((slice) => (
                      <Cell key={slice.key} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold tabular-nums leading-none">
                  {total}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {total === 1 ? "person" : "people"}
                </p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {employment.map((slice) => (
                <LegendRow
                  key={slice.key}
                  color={slice.color}
                  name={slice.name}
                  value={String(slice.value)}
                  percent={percentOf(slice.value, total) + "%"}
                />
              ))}
            </div>
          </div>

          {/* The gender split, as bars and not as a second ring. */}
          <div className="relative mt-5 border-t border-border/60 pt-4">
            <p className="mb-2.5 text-sm font-medium">
              By gender
              {unknownGender > 0 ? (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — {unknownGender} of {genderTotal} never filled the field in
                </span>
              ) : null}
            </p>

            <div className="flex flex-col gap-2.5">
              {genders.map((slice) => (
                <BarRow
                  key={slice.key}
                  name={slice.name}
                  value={slice.value}
                  percent={percentOf(slice.value, genderTotal)}
                  fill={percentOf(slice.value, biggestGender)}
                  color={slice.color}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
