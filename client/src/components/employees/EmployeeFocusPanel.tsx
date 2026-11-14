import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CalendarDays,
  Cake,
  Mail,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  LegendRow,
  Meter,
} from "./EmployeeTile";
import { TASK_STATUS_COLORS } from "@/components/dashboard/taskStatusColors";
import {
  CHART_TOOLTIP_STYLE,
  employmentTypeLabel,
  formatMonths,
  formatShortDay,
  percentOf,
  presenceColor,
  presenceLabel,
} from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

// One person, on their own.
//
// Everything above this tile compares people with each other. Here the reader
// picks ONE of them and the tile answers the questions somebody actually has
// about a single person: who they are, what they are carrying, where they
// stand today, and who is around them.
//
// The picker holds the employee id and not the whole row, because the rows are
// rebuilt on every socket update: an id still finds its person after somebody
// else has edited them, a copy of the old row would not.
export function EmployeeFocusPanel(props: {
  rows: EmployeeRow[];
  canReadTasks: boolean;
  canReadLeaves: boolean;
  canReadAttendance: boolean;
  canReadTeams: boolean;
  employeesPath: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const row = props.rows.find((item) => item.id === props.selectedId);

  // The five statuses of this person's work, for the ring.
  const slices = row
    ? TASK_STATUS_COLORS.map((status) => ({
        name: status.label,
        value: row[status.status],
        color: status.color,
      }))
    : [];

  const drawn = slices.filter((slice) => slice.value > 0);

  return (
    <div className={TILE}>
      <TileGlow className="bg-indigo-500/15" />

      <TileHeader
        title="One person in full"
        subtitle="Pick somebody and read them on their own: their work, their day, their place in the company."
        right={
          <Select value={props.selectedId} onValueChange={props.onSelect}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Choose an employee" />
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
        <TileEmpty>There is nobody to look at yet.</TileEmpty>
      ) : (
        <>
          {/* Who they are. */}
          <div className="relative mb-4 flex flex-wrap items-center gap-3">
            <Avatar name={row.name} photo={row.photo} size="lg" />

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
                {row.name}
                {row.status === "inactive" ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
                    Has left
                  </span>
                ) : null}
                {row.isTeamLead ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                    Team lead
                  </span>
                ) : null}
              </p>

              <p className="truncate text-sm text-muted-foreground">
                {row.designation || "No designation"} ·{" "}
                {employmentTypeLabel(row.employmentType)}
              </p>

              {props.canReadAttendance ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: presenceColor(row.presence) }}
                  />
                  {presenceLabel(row.presence)} today
                  {row.workedHours > 0 ? (
                    <span className="text-muted-foreground">
                      · {row.workedHours} h worked
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <Button asChild variant="outline" size="sm">
              <Link to={props.employeesPath + "/" + row.id}>
                Open their page
              </Link>
            </Button>
          </div>

          <TileFigures>
            <TileFigure
              value={formatMonths(row.tenureMonths)}
              label="here"
            />
            {props.canReadTasks ? (
              <>
                <TileFigure
                  value={String(row.open)}
                  label="open tasks"
                  tone="small"
                />
                <TileFigure
                  value={row.tasks === 0 ? "—" : row.doneRate + "%"}
                  label="of their work done"
                  tone="small"
                />
                <TileFigure
                  value={String(row.overdue)}
                  label="late"
                  tone="small"
                />
              </>
            ) : null}
            {props.canReadLeaves ? (
              <TileFigure
                value={String(row.leaveDays)}
                label="leave days this year"
                tone="small"
              />
            ) : null}
          </TileFigures>

          <div className="relative grid gap-6 lg:grid-cols-2">
            {/* Where their work stands. */}
            <div>
              <p className="mb-2 text-sm font-medium">Their work</p>

              {!props.canReadTasks ? (
                <TileEmpty>
                  Your role does not open the tasks of the whole organization.
                </TileEmpty>
              ) : row.tasks === 0 ? (
                <TileEmpty>This person has no task yet.</TileEmpty>
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative mx-auto h-40 w-40 shrink-0">
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
                            <Cell key={slice.name} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold tabular-nums leading-none">
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

              {props.canReadTasks && row.open > 0 ? (
                <div className="mt-3">
                  <Meter
                    label="Open work that is on time"
                    value={100 - row.lateRate + "%"}
                    percent={100 - row.lateRate}
                    color={row.lateRate > 0 ? "#d97706" : "#059669"}
                  />
                </div>
              ) : null}
            </div>

            {/* Where they sit in the company. */}
            <div>
              <p className="mb-2 text-sm font-medium">Their place</p>

              <div className="flex flex-col gap-2">
                <Fact
                  icon={<Mail className="h-4 w-4" />}
                  label="Email"
                  value={row.email}
                />
                <Fact
                  icon={<Network className="h-4 w-4" />}
                  label="Department"
                  value={row.departmentName || "None"}
                />
                <Fact
                  icon={<ShieldCheck className="h-4 w-4" />}
                  label="Role"
                  value={
                    (row.roleName || "None") + (row.roleIsOff ? " (off)" : "")
                  }
                />
                {props.canReadTeams ? (
                  <Fact
                    icon={<UsersRound className="h-4 w-4" />}
                    label="Team"
                    value={row.teamName || "In no team"}
                  />
                ) : null}
                <Fact
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Joined"
                  value={
                    row.joiningDate
                      ? formatShortDay(row.joiningDate) +
                        " " +
                        new Date(row.joiningDate).getUTCFullYear()
                      : "Not on file"
                  }
                />
                <Fact
                  icon={<Cake className="h-4 w-4" />}
                  label="Birthday"
                  value={
                    row.dateOfBirth
                      ? formatShortDay(row.dateOfBirth) +
                        " · " +
                        row.ageYears +
                        " years old"
                      : "Not on file"
                  }
                />
                {row.exitDate ? (
                  <Fact
                    icon={<CalendarDays className="h-4 w-4" />}
                    label="Left on"
                    value={
                      formatShortDay(row.exitDate) +
                      " " +
                      new Date(row.exitDate).getUTCFullYear()
                    }
                  />
                ) : null}
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  );
}

// One line of the "their place" list: an icon, what it is, and what it says.
function Fact(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 text-muted-foreground">{props.icon}</span>
      <span className="w-24 shrink-0 text-sm text-muted-foreground">
        {props.label}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {props.value}
      </span>
    </div>
  );
}
