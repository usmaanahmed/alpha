import { Clock, Crown, ListChecks, UsersRound } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { TILE, TileHeader, TileEmpty, Meter } from "./TeamTile";
import { formatAverage, formatMonths, percentOf } from "./teamAnalytics";
import type { TeamRow } from "./teamAnalytics";

// How many faces one card draws before it writes "+3" instead.
const MAX_FACES = 7;

// One card per team: the whole page again, team by team.
//
// The charts above compare the teams with each other. This tile does the
// opposite — it reads one team at a time, with the same readings on every
// card, so two cards can be put side by side and understood without a legend.
// It replaces the table this page does not have: the three meters are the
// picture, and the exact figure is written next to each one.
//
// Every card carries the faces of its people, because that is what a team is.
export function TeamScorecards(props: { rows: TeamRow[] }) {
  return (
    <div className={TILE}>
      <TileHeader
        title="Team by team"
        subtitle="The same readings for every team, so two of them can be compared at a glance."
      />

      {props.rows.length === 0 ? (
        <TileEmpty>There is no team yet.</TileEmpty>
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
function Scorecard(props: { row: TeamRow }) {
  const row = props.row;

  // Who of this team is actually at work today. A half day is still a day
  // somebody turned up for, so it counts as being in.
  const inToday = row.present + row.half_day;

  const faces = row.people.slice(0, MAX_FACES);
  const hiddenFaces = row.size - faces.length;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background/40 p-3.5">
      {/* The colour of the team, as a stripe down its left edge. It is the
          same colour it carries in every chart above. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: row.color }}
      />

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.departmentName || "No department"}
          </p>
        </div>

        {row.status === "inactive" ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
            Off
          </span>
        ) : null}
      </div>

      {/* Who leads the room. */}
      <p className="mt-2 flex items-center gap-1.5 truncate pl-2 text-xs">
        <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        {row.lead ? (
          <span className="truncate text-muted-foreground">
            Led by{" "}
            <span className="font-medium text-foreground">{row.lead.name}</span>
          </span>
        ) : (
          <span className="font-medium text-rose-600 dark:text-rose-400">
            No lead
          </span>
        )}
      </p>

      {/* The room itself. */}
      {faces.length > 0 ? (
        <div className="mt-2.5 flex items-center pl-2">
          {faces.map((person) => (
            <Avatar
              key={person.id}
              name={person.name}
              photo={person.photo}
              size="sm"
              className="-ml-1.5 border-2 border-card first:ml-0"
            />
          ))}

          {hiddenFaces > 0 ? (
            <span className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
              +{hiddenFaces}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-2.5 pl-2 text-xs text-muted-foreground">
          Nobody is in this team yet.
        </p>
      )}

      {/* The three counts, on one line. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-2 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold tabular-nums">{row.size}</span>
          <span className="text-muted-foreground">
            {row.size === 1 ? "person" : "people"}
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
            row.busiestName
              ? "On its busiest (" + row.busiestName + ")"
              : "On its busiest person"
          }
          value={row.open === 0 ? "nothing open" : row.loadShare + "%"}
          percent={row.loadShare}
          color={row.color}
        />
        <Meter
          label="In today"
          value={
            row.activeSize === 0
              ? "nobody"
              : inToday + " of " + row.activeSize
          }
          percent={percentOf(inToday, row.activeSize)}
          color="#0284c7"
        />
      </div>

      {/* The last line: what this team owes somebody. It is only drawn when
          there really is something. */}
      {row.overdue > 0 ||
      row.pendingLeaves > 0 ||
      row.openPerPerson > 5 ||
      row.leftPeople > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5 pl-2">
          {row.overdue > 0 ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
              {row.overdue} late
            </span>
          ) : null}

          {row.leftPeople > 0 ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
              {row.leftPeople} already gone
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
