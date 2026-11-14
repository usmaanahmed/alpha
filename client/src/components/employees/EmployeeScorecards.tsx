import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  TILE,
  TileHeader,
  TileEmpty,
  TileNote,
  Meter,
} from "./EmployeeTile";
import { Avatar } from "@/components/common/Avatar";
import {
  formatMonths,
  percentOf,
  presenceColor,
  presenceLabel,
} from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

// How many cards are drawn at once. Twelve fills three rows on a wide screen,
// which is as much as anybody reads before scrolling past it — and the button
// under them opens the rest.
const PAGE_SIZE = 12;

type Order = "load" | "late" | "new" | "name";

// One card per person: the whole page again, one person at a time.
//
// The charts above compare people with each other. This tile does the opposite
// — it reads one person at a time, with the same three meters on every card,
// so two cards can be put side by side and understood without a legend. It
// replaces the table this page does not have: the meters are the picture, and
// the exact figure is written next to each one.
export function EmployeeScorecards(props: {
  rows: EmployeeRow[];
  canReadTasks: boolean;
  canReadAttendance: boolean;
  employeesPath: string;
  // The open tasks of the whole team, so a card can say what share of the work
  // that one person is holding.
  totalOpen: number;
}) {
  const [order, setOrder] = useState<Order>("load");
  const [shownCount, setShownCount] = useState(PAGE_SIZE);

  // Without the task list "the fullest hands first" would rank everybody at
  // zero, so the cards start from the newest person instead.
  const effectiveOrder: Order =
    !props.canReadTasks && (order === "load" || order === "late")
      ? "new"
      : order;

  const sorted = [...props.rows].sort((left, right) => {
    if (effectiveOrder === "load" && right.open !== left.open) {
      return right.open - left.open;
    }
    if (effectiveOrder === "late" && right.overdue !== left.overdue) {
      return right.overdue - left.overdue;
    }
    if (effectiveOrder === "new" && right.tenureMonths !== left.tenureMonths) {
      return left.tenureMonths - right.tenureMonths;
    }
    return left.name.localeCompare(right.name);
  });

  const shown = sorted.slice(0, shownCount);

  return (
    <div className={TILE}>
      <TileHeader
        title="Person by person"
        subtitle="The same readings for everybody, so two people can be compared at a glance."
        right={
          <div className="flex flex-wrap rounded-lg border border-border/70 p-0.5">
            {props.canReadTasks ? (
              <>
                <OrderButton
                  label="Busiest"
                  active={effectiveOrder === "load"}
                  onClick={() => setOrder("load")}
                />
                <OrderButton
                  label="Most late"
                  active={effectiveOrder === "late"}
                  onClick={() => setOrder("late")}
                />
              </>
            ) : null}
            <OrderButton
              label="Newest"
              active={effectiveOrder === "new"}
              onClick={() => setOrder("new")}
            />
            <OrderButton
              label="A to Z"
              active={effectiveOrder === "name"}
              onClick={() => setOrder("name")}
            />
          </div>
        }
      />

      {props.rows.length === 0 ? (
        <TileEmpty>Nobody works here yet.</TileEmpty>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((row) => (
              <Scorecard
                key={row.id}
                row={row}
                canReadTasks={props.canReadTasks}
                canReadAttendance={props.canReadAttendance}
                employeesPath={props.employeesPath}
                totalOpen={props.totalOpen}
              />
            ))}
          </div>

          {sorted.length > shown.length ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShownCount(shownCount + PAGE_SIZE)}
              >
                Show {Math.min(PAGE_SIZE, sorted.length - shown.length)} more of{" "}
                {sorted.length - shown.length}
              </Button>
            </div>
          ) : (
            <TileNote>
              All {sorted.length} {sorted.length === 1 ? "person" : "people"}{" "}
              are on this page.
            </TileNote>
          )}
        </>
      )}
    </div>
  );
}

// One card.
function Scorecard(props: {
  row: EmployeeRow;
  canReadTasks: boolean;
  canReadAttendance: boolean;
  employeesPath: string;
  totalOpen: number;
}) {
  const row = props.row;

  // How much of the whole team's open work sits on this one person. It is the
  // reading that turns "7 open tasks" into something you can judge.
  const shareOfWork = percentOf(row.open, props.totalOpen);

  return (
    <Link
      to={props.employeesPath + "/" + row.id}
      className="relative block overflow-hidden rounded-xl border border-border/60 bg-background/40 p-3.5 transition-colors hover:bg-muted/50"
    >
      {/* The colour of where this person stands today, as a stripe down the
          left edge of their card. */}
      {props.canReadAttendance ? (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: presenceColor(row.presence) }}
        />
      ) : null}

      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={row.name} photo={row.photo} />

          <div className="min-w-0">
            <p className="truncate font-semibold leading-tight">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.designation || "No designation"}
              {row.departmentName ? " · " + row.departmentName : ""}
            </p>
          </div>
        </div>

        {row.status === "inactive" ? (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-500/15 dark:text-slate-300">
            Left
          </span>
        ) : props.canReadAttendance ? (
          <span
            className="shrink-0 text-xs font-medium"
            style={{ color: presenceColor(row.presence) }}
          >
            {presenceLabel(row.presence)}
          </span>
        ) : null}
      </div>

      {/* The three counts, on one line. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 pl-2 text-xs text-muted-foreground">
        <span>{formatMonths(row.tenureMonths)} here</span>
        {props.canReadTasks ? <span>{row.open} open</span> : null}
        {props.canReadTasks ? <span>{row.completed} done</span> : null}
      </div>

      {/* The meters. Each one is a picture of a percent whose exact figure is
          written above it. */}
      <div className="mt-3 flex flex-col gap-2 pl-2">
        {props.canReadTasks ? (
          <>
            <Meter
              label="Work finished"
              value={row.tasks === 0 ? "no task" : row.doneRate + "%"}
              percent={row.doneRate}
              color="#059669"
            />
            <Meter
              label="Open work on time"
              value={row.open === 0 ? "nothing open" : 100 - row.lateRate + "%"}
              percent={row.open === 0 ? 100 : 100 - row.lateRate}
              color={row.overdue > 0 ? "#d97706" : "#0284c7"}
            />
            <Meter
              label="Share of the team's open work"
              value={shareOfWork + "%"}
              percent={shareOfWork}
              color="#6366f1"
            />
          </>
        ) : (
          <Meter
            label="Time here, against five years"
            value={formatMonths(row.tenureMonths)}
            percent={percentOf(row.tenureMonths, 60)}
            color="#6366f1"
          />
        )}
      </div>

      {/* The last line: what this person owes somebody, or what somebody owes
          them. It is only drawn when there really is something. */}
      {row.overdue > 0 || row.pendingLeaves > 0 || row.roleIsOff ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pl-2 pt-2.5">
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

          {row.roleIsOff ? (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
              role switched off
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}

// One of the little sort buttons in the corner of the tile.
function OrderButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={props.active ? "secondary" : "ghost"}
      className="h-7 px-2.5 text-xs"
      onClick={props.onClick}
    >
      {props.label}
    </Button>
  );
}
