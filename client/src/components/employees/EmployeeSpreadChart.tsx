import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  TileNote,
  BarRow,
} from "./EmployeeTile";
import {
  buildDepartmentSlices,
  buildRoleSlices,
  formatAverage,
  percentOf,
} from "./employeeAnalytics";
import type { EmployeeRow, Slice } from "./employeeAnalytics";

// How many bars are drawn before the tile stops. A company with forty roles
// would otherwise turn this tile into a page of its own, and the bars at the
// bottom all stand for one person.
const MAX_BARS = 10;

// Where the people sit, read two ways.
//
// The department is the box somebody works in; the role is what the app lets
// them do. They are two different cuts of the same head count, and putting
// them behind one switch instead of into two tiles keeps the comparison
// honest: the totals under both are the same people.
//
// A role that a lot of people carry is worth a second look — a "Manager" role
// on half the company usually means somebody used it as a job title instead of
// as a set of permissions.
export function EmployeeSpreadChart(props: { rows: EmployeeRow[] }) {
  const [cut, setCut] = useState<"department" | "role">("department");

  const departments = buildDepartmentSlices(props.rows);
  const roles = buildRoleSlices(props.rows);

  const slices = cut === "department" ? departments : roles;

  const total = props.rows.length;
  const shown = slices.slice(0, MAX_BARS);
  const hidden = slices.slice(MAX_BARS);

  // How many people the bars that were left out stand for, so the tile can say
  // what it dropped instead of quietly cutting the list short.
  let hiddenPeople = 0;

  hidden.forEach((slice) => {
    hiddenPeople += slice.value;
  });

  // The longest bar of the ones we draw sets the length of the track: with a
  // department of 40 and one of 2, the small one would otherwise be a line
  // nobody can see.
  const biggest = shown.length > 0 ? shown[0].value : 1;

  const biggestShare = percentOf(biggest, total);

  return (
    <div className={TILE}>
      <TileGlow className="bg-sky-500/15" />

      <TileHeader
        title="Where the people sit"
        subtitle="The same head count cut by department, and by the role that says what they may do."
        right={
          <div className="flex rounded-lg border border-border/70 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={cut === "department" ? "secondary" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setCut("department")}
            >
              Department
            </Button>
            <Button
              type="button"
              size="sm"
              variant={cut === "role" ? "secondary" : "ghost"}
              className="h-7 px-3 text-xs"
              onClick={() => setCut("role")}
            >
              Role
            </Button>
          </div>
        }
      />

      {slices.length === 0 ? (
        <TileEmpty>Nobody works here yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={String(slices.length)}
              label={
                cut === "department"
                  ? slices.length === 1
                    ? "department in use"
                    : "departments in use"
                  : slices.length === 1
                    ? "role in use"
                    : "roles in use"
              }
            />
            <TileFigure
              value={formatAverage(total / slices.length)}
              label="people in each on average"
              tone="small"
            />
            <TileFigure
              value={biggestShare + "%"}
              label={"of the team is in " + shown[0].name}
              tone="small"
            />
          </TileFigures>

          <div className="relative flex flex-col gap-3">
            {shown.map((slice: Slice) => (
              <BarRow
                key={slice.key}
                name={slice.name}
                value={slice.value}
                percent={percentOf(slice.value, total)}
                fill={percentOf(slice.value, biggest)}
                color={slice.color}
              />
            ))}
          </div>

          {hidden.length > 0 ? (
            <TileNote>
              {hidden.length} smaller{" "}
              {cut === "department" ? "departments" : "roles"} are not drawn
              here; together they hold {hiddenPeople}{" "}
              {hiddenPeople === 1 ? "person" : "people"}.
            </TileNote>
          ) : null}
        </>
      )}
    </div>
  );
}
