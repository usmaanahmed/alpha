import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Network, UserMinus } from "lucide-react";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  LegendRow,
  LegendFootRow,
} from "./DepartmentTile";
import {
  CHART_TOOLTIP_STYLE,
  REST_COLOR,
  formatAverage,
  percentOf,
} from "./departmentAnalytics";
import type { DepartmentRow, DepartmentHeadline } from "./departmentAnalytics";

// A ring with more than a handful of slices is unreadable, so only the eight
// biggest departments get a slice of their own. The rows arrive ranked, so the
// eight biggest are simply the first eight.
const MAX_SLICES = 8;

// One drawn slice of the ring.
interface Slice {
  name: string;
  value: number;
  color: string;
}

// How the people of the workspace are shared out over the departments.
//
// Only the people who still work here are counted. Somebody who left does not
// sit in a department any more, and counting them would make a department look
// bigger than the team it really has today.
//
// The legend lists every department, including the ones with nobody in them:
// an empty department draws no slice, but "this department holds zero people"
// is an answer, and dropping the line would quietly hide it.
export function DepartmentSizeRing(props: {
  rows: DepartmentRow[];
  headline: DepartmentHeadline;
}) {
  const total = props.headline.people + props.headline.withoutDepartment;

  const slices: Slice[] = [];

  if (props.rows.length <= MAX_SLICES) {
    props.rows.forEach((row) => {
      slices.push({ name: row.name, value: row.people, color: row.color });
    });
  } else {
    // Too many departments: the seven biggest keep their own slice and
    // everything under them is added up into one last grey slice.
    const shown = props.rows.slice(0, MAX_SLICES - 1);
    const rest = props.rows.slice(MAX_SLICES - 1);

    shown.forEach((row) => {
      slices.push({ name: row.name, value: row.people, color: row.color });
    });

    let restTotal = 0;
    rest.forEach((row) => {
      restTotal += row.people;
    });

    slices.push({
      name: "Other departments (" + rest.length + ")",
      value: restTotal,
      color: REST_COLOR,
    });
  }

  // The people whose department was deleted. They are drawn in the same grey,
  // because they are not a department either.
  if (props.headline.withoutDepartment > 0) {
    slices.push({
      name: "No department",
      value: props.headline.withoutDepartment,
      color: REST_COLOR,
    });
  }

  // A department nobody works in yet would only be an invisible slice, so it
  // stays out of the ring while keeping its line in the legend.
  const drawnSlices = slices.filter((slice) => slice.value > 0);

  return (
    <div className={TILE}>
      <TileGlow />

      <TileHeader
        title="How the team is split"
        subtitle="Every department, and the share of the workspace it holds today."
      />

      {total === 0 ? (
        <TileEmpty>Nobody works here yet.</TileEmpty>
      ) : (
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* The ring, with the headcount written in its hole. */}
          <div className="relative mx-auto h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={drawnSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="98%"
                  // The small gap and the stroke in the card colour are what
                  // keep two slices apart even when their colours are close.
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {drawnSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">people</p>
            </div>
          </div>

          {/* Our own legend, so the number is written next to every colour and
              the ring is never read by colour alone. The list can get long, so
              it scrolls inside the tile. */}
          <div className="flex max-h-60 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {slices.map((slice) => (
              <LegendRow
                key={slice.name}
                color={slice.color}
                name={slice.name}
                value={String(slice.value)}
                percent={percentOf(slice.value, total) + "%"}
              />
            ))}

            <LegendFootRow
              icon={<Network className="h-4 w-4" />}
              name="Average department size"
              value={formatAverage(props.headline.averageSize)}
            />

            {props.headline.emptyDepartments > 0 ? (
              <LegendFootRow
                icon={<UserMinus className="h-4 w-4" />}
                name="Departments with nobody in them"
                value={String(props.headline.emptyDepartments)}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
