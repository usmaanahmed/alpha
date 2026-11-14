import { Clock, ListChecks, UsersRound } from "lucide-react";
import { TILE, TileHeader, TileEmpty, Meter } from "./DepartmentTile";
import { formatAverage, formatMonths, percentOf } from "./departmentAnalytics";
import type { DepartmentRow } from "./departmentAnalytics";

// One card per department: the whole page again, department by department.
//
// The charts above compare the departments with each other. This tile does the
// opposite — it reads one department at a time, with the same five numbers on
// every card, so two cards can be put side by side and understood without a
// legend. It replaces the table this page does not have: the three meters are
// the picture, and the exact figure is written next to each one.
export function DepartmentScorecards(props: { rows: DepartmentRow[] }) {
  return (
    <div className={TILE}>
      <TileHeader
        title="Department by department"
        subtitle="The same five readings for every department, so two of them can be compared at a glance."
      />

      {props.rows.length === 0 ? (
        <TileEmpty>There is no department yet.</TileEmpty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {props.rows.map((row) => (
            <Scorecard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}

// One card.
function Scorecard(props: { row: DepartmentRow }) {
  const row = props.row;

  // Who of this department is actually at work today. A half day is still a
  // day somebody turned up for, so it counts as being in.
  const inToday = row.present + row.half_day;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background/40 p-3.5">
      {/* The colour of the department, as a stripe down its left edge. It is
          the same colour it carries in every chart above. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: row.color }}
      />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.description || "No description"}
          </p>
        </div>

        {row.status === "inactive" ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
            Off
          </span>
        ) : null}
      </div>

      {/* The three counts, on one line. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold tabular-nums">{row.people}</span>
          <span className="text-muted-foreground">
            {row.people === 1 ? "person" : "people"}
          </span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold tabular-nums">{row.open}</span>
          <span className="text-muted-foreground">open</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold tabular-nums">
            {formatMonths(row.averageTenure)}
          </span>
          <span className="text-muted-foreground">here</span>
        </span>
      </div>

      {/* The three meters. Each one is a picture of a percent whose exact
          figure is written above it. */}
      <div className="mt-3 flex flex-col gap-2 pl-2">
        <Meter
          label="Work finished"
          value={row.tasks === 0 ? "no task" : row.doneRate + "%"}
          percent={row.doneRate}
          color="#059669"
        />
        <Meter
          label={
            row.teams === 0
              ? "In a team (no team yet)"
              : "In a team (" + row.teams + ")"
          }
          value={
            row.people === 0
              ? "nobody"
              : percentOf(row.inTeam, row.people) + "%"
          }
          percent={percentOf(row.inTeam, row.people)}
          color={row.color}
        />
        <Meter
          label="In today"
          value={
            row.people === 0
              ? "nobody"
              : inToday + " of " + row.people
          }
          percent={percentOf(inToday, row.people)}
          color="#0284c7"
        />
      </div>

      {/* The last line: what this department owes somebody. It is only drawn
          when there really is something. */}
      {row.overdue > 0 || row.pendingLeaves > 0 || row.openPerPerson > 5 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5 pl-2">
          {row.overdue > 0 ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
              {row.overdue} late
            </span>
          ) : null}

          {row.pendingLeaves > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              {row.pendingLeaves} leave to answer
            </span>
          ) : null}

          {row.openPerPerson > 5 ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
              {formatAverage(row.openPerPerson)} tasks per person
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
