import { Link } from "react-router-dom";
import { ArrowUpRight, Network } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { Employee } from "@/types/employee.types";
import type { Department } from "@/types/department.types";

// The look of the chart tooltip. We read the theme colours, so the little box
// is white in the light theme and dark in the dark one without us writing the
// same colours twice.
const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
};

// The shared look of one tile of the dashboard, the same one the module
// analytics grid uses, so this section sits in the same family.
const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The colours of the slices, always handed out in this order: the biggest
// department gets the first colour, the second biggest the second one, and so
// on. They are never shuffled, so a department keeps its colour as long as it
// keeps its place in the list.
//
// The eight hexes were run through a colour-blind safety check together, in
// exactly this order, so two slices that touch each other in the ring stay
// apart for a reader who cannot tell red from green. The same eight work on
// the light and on the dark theme, which is why there is only one list.
const SLICE_COLORS = [
  "#6366f1",
  "#d97706",
  "#0284c7",
  "#dc2626",
  "#059669",
  "#d946ef",
  "#0d9488",
  "#7c3aed",
];

// The grey of the two rows that are not one single department: the "Other
// departments" bundle and the people with no department at all.
const REST_COLOR = "#94a3b8";

// A ring with more than a handful of slices is unreadable, so only the eight
// biggest departments get a slice of their own.
const MAX_SLICES = 8;

// One line of the chart: a department (or a bundle of them) and its headcount.
interface Slice {
  name: string;
  value: number;
  color: string;
}

// How the people of the workspace are shared out over the departments.
//
// Only the people who still work here are counted. Someone who left does not
// sit in a department any more, and counting them would make a department look
// bigger than the team it really has today.
export function DepartmentDistribution(props: {
  employees: Employee[];
  departments: Department[];
  isLoading: boolean;
}) {
  if (props.isLoading) {
    return <LoadingTile />;
  }

  const activeEmployees = props.employees.filter(
    (employee) => employee.status === "active"
  );

  // How many active people sit in every department, biggest first.
  const counted = props.departments.map((department) => {
    const people = activeEmployees.filter(
      (employee) => employee.department?._id === department._id
    );

    return { name: department.name, value: people.length };
  });

  counted.sort((left, right) => right.value - left.value);

  // The rows of the chart, in the order they are drawn and listed.
  const slices: Slice[] = [];

  if (counted.length <= MAX_SLICES) {
    // Few enough departments: every one of them gets its own slice.
    counted.forEach((row, index) => {
      slices.push({
        name: row.name,
        value: row.value,
        color: SLICE_COLORS[index],
      });
    });
  } else {
    // Too many: the seven biggest keep their own slice and everything under
    // them is added up into one last "Other departments" slice.
    const shown = counted.slice(0, MAX_SLICES - 1);
    const rest = counted.slice(MAX_SLICES - 1);

    shown.forEach((row, index) => {
      slices.push({
        name: row.name,
        value: row.value,
        color: SLICE_COLORS[index],
      });
    });

    let restTotal = 0;
    rest.forEach((row) => {
      restTotal += row.value;
    });

    slices.push({
      name: "Other departments (" + rest.length + ")",
      value: restTotal,
      color: REST_COLOR,
    });
  }

  // Somebody whose department was deleted is in nobody's count above, so we
  // look for the people the departments did not claim. The row is only added
  // when there really is such a person.
  let countedPeople = 0;
  slices.forEach((slice) => {
    countedPeople += slice.value;
  });

  const withoutDepartment = activeEmployees.length - countedPeople;

  if (withoutDepartment > 0) {
    slices.push({
      name: "No department",
      value: withoutDepartment,
      color: REST_COLOR,
    });
  }

  const total = activeEmployees.length;

  // A department nobody works in yet would only be an invisible slice, so it
  // stays out of the ring. It still keeps its line in the legend, so the
  // reader sees that the department exists and holds zero.
  const drawnSlices = slices.filter((slice) => slice.value > 0);

  // part of the whole as a whole percent. An empty workspace gives 0 instead
  // of a division by zero.
  function percent(part: number) {
    if (total <= 0) {
      return 0;
    }
    return Math.round((part / total) * 100);
  }

  return (
    <div className={TILE}>
      {/* A soft indigo glow behind the ring, for depth. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Department distribution
          </h2>
          <p className="text-sm text-muted-foreground">
            How many people work in each department right now.
          </p>
        </div>

        <Link
          to="/organization/departments"
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open departments
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {total === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          Nobody works here yet.
        </p>
      ) : (
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* The ring itself, with the headcount written in its hole. */}
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
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {total}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">people</p>
            </div>
          </div>

          {/* Our own legend: the department, how many people are in it, and
              how big a part of the team that is. The number is written next
              to every colour, so the ring is never read by colour alone.
              The list can get long, so it scrolls inside the tile. */}
          <div className="flex max-h-56 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {slices.map((slice) => (
              <div key={slice.name} className="flex items-center gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {slice.name}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {slice.value}
                </span>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {percent(slice.value)}%
                </span>
              </div>
            ))}

            {/* How many departments the ring is made of, under the line of
                the legend. */}
            <div className="mt-1 flex items-center gap-2.5 border-t border-border/60 pt-3">
              <Network className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                Departments in the workspace
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {props.departments.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// The same tile in grey, so the page does not jump when the lists arrive.
function LoadingTile() {
  return <div className="h-80 animate-pulse rounded-2xl bg-muted/50" />;
}
