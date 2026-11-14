import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Building2, CalendarDays, Crown, Plane, UserRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/common/Avatar";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  LegendRow,
} from "./TeamTile";
import { TASK_STATUS_COLORS } from "@/components/dashboard/taskStatusColors";
import {
  CHART_TOOLTIP_STYLE,
  formatAverage,
  formatMonths,
  percentOf,
  presenceColor,
  presenceLabel,
} from "./teamAnalytics";
import type { TeamPersonRow, TeamRow } from "./teamAnalytics";

// One team, on its own.
//
// Everything above this tile compares the teams with each other. Here the
// reader picks ONE of them and gets the room itself: who leads it, who is in
// it, what each of those people is carrying, and where its work stands. It is
// the tile that turns a bar back into people.
//
// The picker holds the team id and not the whole row, because the rows are
// rebuilt on every socket update: an id still finds its team after somebody
// else has renamed one, a copy of the old row would not.
export function TeamFocusPanel(props: {
  rows: TeamRow[];
  // False when this person's role does not open the tasks of the whole
  // organization, or the attendance of everybody. The list then arrives empty,
  // and drawing it would tell the reader that the team has no work, which is
  // not the same thing as "you are not allowed to see its work".
  canReadTasks: boolean;
  canReadAttendance: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const row = props.rows.find((item) => item.id === props.selectedId);

  // The five statuses of this team's work, for the ring.
  const slices = row
    ? TASK_STATUS_COLORS.map((status) => ({
        name: status.label,
        value: row[status.status],
        color: status.color,
      }))
    : [];

  const drawnSlices = slices.filter((slice) => slice.value > 0);

  return (
    <div className={TILE}>
      <TileGlow className="bg-teal-500/15" />

      <TileHeader
        title="One team in full"
        subtitle="Pick a team and read the room: its lead, its people, and what each of them is carrying."
        right={
          <Select value={props.selectedId} onValueChange={props.onSelect}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Choose a team" />
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
        <TileEmpty>There is no team to look at yet.</TileEmpty>
      ) : (
        <>
          {/* Who answers for this team. A team without a lead is the loudest
              thing this page can say about it, so it is said first and in
              red. */}
          <div className="relative mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
            {row.lead ? (
              <>
                <Avatar
                  name={row.lead.name}
                  photo={row.lead.photo}
                  size="md"
                  className="border-2"
                />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-semibold">
                    <Crown className="h-4 w-4 shrink-0 text-amber-500" />
                    {row.lead.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Team lead
                    {row.lead.designation ? " · " + row.lead.designation : ""}
                    {row.lead.hasJoiningDate
                      ? " · " + formatMonths(row.lead.months) + " in the company"
                      : ""}
                  </p>
                </div>

                {props.canReadTasks ? (
                  <span className="shrink-0 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">
                      {row.lead.open}
                    </span>{" "}
                    open
                    {row.lead.overdue > 0 ? (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                        {row.lead.overdue} late
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-400">
                <UserRound className="h-4 w-4 shrink-0" />
                This team has nobody leading it.
              </p>
            )}
          </div>

          <TileFigures>
            <TileFigure
              value={String(row.size)}
              label={row.size === 1 ? "person" : "people"}
            />

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
              value={formatMonths(row.averageTenure)}
              label="average time in the company"
              tone="small"
            />
            <TileFigure
              value={formatMonths(row.ageMonths)}
              label="since the team was made"
              tone="small"
            />
          </TileFigures>

          <div className="relative grid gap-6 lg:grid-cols-2">
            {/* Where the work of this team stands. */}
            <div>
              <p className="mb-2 text-sm font-medium">Its work</p>

              {!props.canReadTasks ? (
                <TileEmpty>
                  Your role does not open the tasks of the whole organization.
                </TileEmpty>
              ) : row.tasks === 0 ? (
                <TileEmpty>Nobody in this team has a task yet.</TileEmpty>
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

            {/* The room itself, person by person. */}
            <div>
              <p className="mb-2 text-sm font-medium">
                Its people
                <span className="font-normal text-muted-foreground">
                  {" "}
                  — {row.size} in the room
                  {row.leftPeople > 0
                    ? ", " + row.leftPeople + " of them gone from the company"
                    : ""}
                </span>
              </p>

              {row.people.length === 0 ? (
                <TileEmpty>Nobody is in this team yet.</TileEmpty>
              ) : (
                <div className="flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                  {row.people.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      team={row}
                      canReadTasks={props.canReadTasks}
                      canReadAttendance={props.canReadAttendance}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* The last line: where this team lives, and what it owes somebody
              outside of its work. */}
          <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 pt-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {row.departmentName || "No department"}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Made {new Date(row.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>

            <span className="inline-flex items-center gap-1.5">
              <Plane className="h-4 w-4" />
              {row.leaveDays} leave{" "}
              {row.leaveDays === 1 ? "day" : "days"} taken this year
              {row.pendingLeaves > 0
                ? " · " + row.pendingLeaves + " waiting for an answer"
                : ""}
            </span>

            {row.description ? (
              <span className="min-w-0 flex-1 truncate">{row.description}</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// One person of the room: the face, the name, what they are carrying, and how
// big a part of the team's open work sits on them.
function PersonRow(props: {
  person: TeamPersonRow;
  team: TeamRow;
  canReadTasks: boolean;
  canReadAttendance: boolean;
}) {
  const person = props.person;

  // The share of the team's open work this person is holding. It is the same
  // number the load chart draws as a block, only written out.
  const share = percentOf(person.open, props.team.open);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-2.5">
      <div className="relative shrink-0">
        <Avatar name={person.name} photo={person.photo} size="md" />

        {/* Where this person stands today, as a dot on their picture. The
            same colour the presence chart uses. */}
        {props.canReadAttendance && person.isActive ? (
          <span
            title={presenceLabel(person.presence)}
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card"
            style={{ backgroundColor: presenceColor(person.presence) }}
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          {person.name}

          {person.isLead ? (
            <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          ) : null}

          {!person.isActive ? (
            <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
              left
            </span>
          ) : null}

          {person.isOutsideDepartment ? (
            <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
              {person.departmentName}
            </span>
          ) : null}
        </p>

        <p className="truncate text-xs text-muted-foreground">
          {person.designation || "No job title"}
          {props.canReadAttendance && person.isActive
            ? " · " + presenceLabel(person.presence).toLowerCase()
            : ""}
        </p>

        {/* The share of the team's open work, as a thin bar in the colour of
            the team. */}
        {props.canReadTasks && props.team.open > 0 ? (
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: share + "%",
                backgroundColor: props.team.color,
              }}
            />
          </div>
        ) : null}
      </div>

      {props.canReadTasks ? (
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums">
            {person.open}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              open
            </span>
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {person.overdue > 0 ? (
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {person.overdue} late ·{" "}
              </span>
            ) : null}
            {person.completed} done
          </p>
        </div>
      ) : null}
    </div>
  );
}
