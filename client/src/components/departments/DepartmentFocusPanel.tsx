import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { UserRound, UsersRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  LegendRow,
  StatusLegendRow,
} from "./DepartmentTile";
import { TASK_STATUS_COLORS } from "@/components/dashboard/taskStatusColors";
import {
  CHART_TOOLTIP_STYLE,
  buildDepartmentPeople,
  buildDepartmentTeams,
  formatAverage,
  formatMonths,
  percentOf,
} from "./departmentAnalytics";
import type { DepartmentRow, DepartmentPerson } from "./departmentAnalytics";
import type { Employee } from "@/types/employee.types";
import type { Task } from "@/types/task.types";
import type { Team } from "@/types/team.types";

// How many people the bar chart draws. A department of forty would otherwise
// turn this tile into a page of its own, and the people at the bottom of the
// list are the ones holding nothing anyway.
const MAX_PEOPLE = 8;

const ON_TIME_COLOR = "#0284c7";
const LATE_COLOR = "#dc2626";

// One bar of the people chart.
//
// onTime and late are the two pieces of the SAME open pile: a late task is
// still an open task, so it is taken out of onTime and drawn in red instead of
// being added on top. Otherwise the bar would count it twice.
interface PersonBar {
  id: string;
  name: string;
  onTime: number;
  late: number;
  open: number;
  completed: number;
}

function PeopleTooltip(props: {
  active?: boolean;
  payload?: { payload: PersonBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const person = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold">{person.name}</p>

      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Open tasks</span>
        <span className="font-semibold tabular-nums">{person.open}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Of them late</span>
        <span className="font-semibold tabular-nums">{person.late}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Finished</span>
        <span className="font-semibold tabular-nums">{person.completed}</span>
      </p>
    </div>
  );
}

// One department, on its own.
//
// Everything above this tile compares the departments with each other. Here
// the reader picks ONE of them and the tile answers the questions a lead
// actually has about their own department: where its work stands, who is
// carrying it, and which teams it is cut into.
//
// The picker holds the department id and not the whole row, because the rows
// are rebuilt on every socket update: an id still finds its department after
// somebody else has renamed one, a copy of the old row would not.
export function DepartmentFocusPanel(props: {
  rows: DepartmentRow[];
  employees: Employee[];
  tasks: Task[];
  teams: Team[];
  // False when this person's role does not open the tasks of the whole
  // organization. The task list then arrives empty, and drawing it would tell
  // the reader that the department has no work, which is not the same thing as
  // "you are not allowed to see its work".
  canReadTasks: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const row = props.rows.find((item) => item.id === props.selectedId);

  // The five statuses of this department's work, for the ring.
  const slices = row
    ? TASK_STATUS_COLORS.map((status) => ({
        name: status.label,
        value: row[status.status],
        color: status.color,
      }))
    : [];

  const drawnSlices = slices.filter((slice) => slice.value > 0);

  // The people of this department, the fullest hands first.
  const people: DepartmentPerson[] = row
    ? buildDepartmentPeople(row.id, props.employees, props.tasks)
    : [];

  const bars: PersonBar[] = people.slice(0, MAX_PEOPLE).map((person) => ({
    id: person.id,
    name: person.name,
    onTime: person.open - person.overdue,
    late: person.overdue,
    open: person.open,
    completed: person.completed,
  }));

  const teams = row ? buildDepartmentTeams(row.id, props.teams) : [];

  return (
    <div className={TILE}>
      <TileGlow className="bg-indigo-500/15" />

      <TileHeader
        title="One department in full"
        subtitle="Pick a department and read it on its own: its work, its people, its teams."
        right={
          <Select value={props.selectedId} onValueChange={props.onSelect}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choose a department" />
            </SelectTrigger>
            <SelectContent>
              {props.rows.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {!row ? (
        <TileEmpty>There is no department to look at yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(row.people)} label="people" />

            {props.canReadTasks ? (
              <>
                <TileFigure
                  value={String(row.open)}
                  label="open tasks"
                  tone="small"
                />
                <TileFigure
                  value={formatAverage(row.openPerPerson)}
                  label="open per person"
                  tone="small"
                />
                <TileFigure
                  value={row.tasks === 0 ? "—" : row.doneRate + "%"}
                  label="of its work done"
                  tone="small"
                />
              </>
            ) : null}

            <TileFigure
              value={String(row.teams)}
              label={row.teams === 1 ? "team" : "teams"}
              tone="small"
            />
            <TileFigure
              value={formatMonths(row.averageTenure)}
              label="average time here"
              tone="small"
            />
          </TileFigures>

          <div className="relative grid gap-6 lg:grid-cols-2">
            {/* Where the work of this department stands. */}
            <div>
              <p className="mb-2 text-sm font-medium">Its work</p>

              {!props.canReadTasks ? (
                <TileEmpty>
                  Your role does not open the tasks of the whole organization.
                </TileEmpty>
              ) : row.tasks === 0 ? (
                <TileEmpty>This department has no task yet.</TileEmpty>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative mx-auto h-44 w-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={drawnSlices}
                          dataKey="value"
                          nameKey="name"
                          innerRadius="62%"
                          outerRadius="98%"
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
                      <p className="text-3xl font-bold tabular-nums leading-none">
                        {row.tasks}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.tasks === 1 ? "task" : "tasks"}
                      </p>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {slices.map((slice) => (
                      <LegendRow
                        key={slice.name}
                        color={slice.color}
                        name={slice.name}
                        value={String(slice.value)}
                        percent={percentOf(slice.value, row.tasks) + "%"}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Who is carrying that work. */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Its people
                {props.canReadTasks && people.length > MAX_PEOPLE ? (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    — the {MAX_PEOPLE} fullest hands of {people.length}
                  </span>
                ) : (
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    — {people.length} in the department
                  </span>
                )}
              </p>

              {people.length === 0 ? (
                <TileEmpty>Nobody works in this department yet.</TileEmpty>
              ) : !props.canReadTasks ? (
                // Without the tasks there is nothing to draw a bar from, so
                // the people are simply named.
                <div className="flex flex-wrap gap-2">
                  {people.map((person) => (
                    <span
                      key={person.id}
                      className="rounded-lg border border-border/60 bg-background/40 px-2.5 py-1 text-sm"
                    >
                      {person.name}
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <StatusLegendRow
                    items={[
                      { label: "Open", color: ON_TIME_COLOR },
                      { label: "Late", color: LATE_COLOR },
                    ]}
                  />

                  <div
                    className="w-full"
                    style={{ height: bars.length * 34 + 30 }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={bars}
                        layout="vertical"
                        margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
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
                          tick={{
                            fill: "var(--muted-foreground)",
                            fontSize: 12,
                          }}
                          allowDecimals={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={110}
                          tickLine={false}
                          axisLine={false}
                          tick={{
                            fill: "var(--muted-foreground)",
                            fontSize: 12,
                          }}
                          interval={0}
                        />
                        <Tooltip
                          content={<PeopleTooltip />}
                          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        />

                        <Bar
                          dataKey="onTime"
                          name="Open"
                          stackId="work"
                          fill={ON_TIME_COLOR}
                          stroke="var(--card)"
                          strokeWidth={2}
                          maxBarSize={20}
                        />
                        <Bar
                          dataKey="late"
                          name="Late"
                          stackId="work"
                          fill={LATE_COLOR}
                          stroke="var(--card)"
                          strokeWidth={2}
                          maxBarSize={20}
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* The teams this department is cut into. */}
          <div className="relative mt-5 border-t border-border/60 pt-4">
            <p className="mb-2 text-sm font-medium">
              Its teams
              <span className="font-normal text-muted-foreground">
                {" "}
                — {row.inTeam} of its {row.people} people sit in one
              </span>
            </p>

            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This department has no team yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: row.color }}
                    >
                      <UsersRound className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {team.name}
                        {team.status === "inactive" ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            (off)
                          </span>
                        ) : null}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <UserRound className="h-3 w-3" />
                        {team.leadName || "no lead"} · {team.size}{" "}
                        {team.size === 1 ? "person" : "people"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
