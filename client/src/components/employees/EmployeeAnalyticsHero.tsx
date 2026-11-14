import { Link } from "react-router-dom";
import { TriangleAlert, TrendingUp, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import { formatAverage, formatMonths } from "./employeeAnalytics";
import type { EmployeeHeadline } from "./employeeAnalytics";

// The banner at the top of the employee dashboard.
//
// It answers the question somebody opening this page actually has — "who works
// here, how long have they stayed, and is anybody in trouble today?" — before
// a single chart is read. The person carrying the most open work gets their
// own glassy card, because on most workspaces that one person is where the
// story is.
export function EmployeeAnalyticsHero(props: {
  headline: EmployeeHeadline;
  employeesPath: string;
  // False when this person's role does not open the tasks of the whole
  // organization: the work figures are then left off the banner instead of
  // showing a zero that only means "you may not read this".
  canReadTasks: boolean;
  canReadAttendance: boolean;
}) {
  const head = props.headline;

  // The one thing that needs somebody today. We only ever write one line, so
  // the loudest problem wins: late work first, then unanswered leaves.
  let alert = "";

  if (props.canReadTasks && head.overdueTasks > 0) {
    alert =
      head.overdueTasks +
      (head.overdueTasks === 1 ? " task is late" : " tasks are late") +
      " across your people";
  } else if (head.pendingLeaves > 0) {
    alert =
      head.pendingLeaves +
      (head.pendingLeaves === 1
        ? " leave request is"
        : " leave requests are") +
      " waiting for an answer";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-violet-600 via-indigo-600 to-cyan-600 p-5 text-white shadow-xl shadow-indigo-500/20 sm:rounded-3xl sm:p-6 lg:p-8">
      {/* Two soft light orbs and a faint set of dots, drawn with plain css so
          the banner needs no image file. */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6 lg:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Users className="h-3.5 w-3.5" />
            {head.active} {head.active === 1 ? "person" : "people"} ·{" "}
            {head.departments}{" "}
            {head.departments === 1 ? "department" : "departments"} ·{" "}
            {head.roles} {head.roles === 1 ? "role" : "roles"}
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Employee analytics
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            Your whole workforce read from every module at once: who they are,
            how long they have stayed, what they are carrying, where they stand
            today, and who needs somebody to look at them.
          </p>

          {/* The person carrying the most open work, in a glassy card of its
              own. Without the task list there is nothing to rank, so the card
              shows the newest joiner instead. */}
          {props.canReadTasks && head.busiest ? (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Carrying the most work
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                  {head.openTasks === 0
                    ? "0%"
                    : Math.round((head.busiest.open / head.openTasks) * 100) +
                      "% of the open work"}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-2.5">
                <Avatar
                  name={head.busiest.name}
                  photo={head.busiest.photo}
                  className="border-white/40"
                />

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight">
                    {head.busiest.name}
                  </p>
                  <p className="truncate text-xs text-indigo-100">
                    {head.busiest.designation || "No designation"}
                    {head.busiest.departmentName
                      ? " · " + head.busiest.departmentName
                      : ""}
                  </p>
                </div>
              </div>

              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-100">
                <span>{head.busiest.open} open tasks</span>
                <span>{head.busiest.overdue} late</span>
                <span>{head.busiest.doneRate}% of their work done</span>
                <span>{formatMonths(head.busiest.tenureMonths)} here</span>
              </p>
            </div>
          ) : head.newest ? (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100">
                <UserRound className="h-3.5 w-3.5" />
                Newest joiner
              </span>

              <div className="mt-2 flex items-center gap-2.5">
                <Avatar
                  name={head.newest.name}
                  photo={head.newest.photo}
                  className="border-white/40"
                />

                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold leading-tight">
                    {head.newest.name}
                  </p>
                  <p className="truncate text-xs text-indigo-100">
                    {formatMonths(head.newest.tenureMonths)} here ·{" "}
                    {head.newest.departmentName || "no department"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 text-sm text-indigo-100 backdrop-blur-sm">
              Nobody works here yet.
            </div>
          )}

          {alert ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1 text-xs font-medium">
              <TriangleAlert className="h-3.5 w-3.5" />
              {alert}
            </p>
          ) : null}

          <div className="mt-4">
            <Button
              asChild
              variant="secondary"
              className="bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <Link to={props.employeesPath}>Open the employees</Link>
            </Button>
          </div>
        </div>

        {/* The headline figures. On a phone they share the whole width of the
            banner instead of leaving a ragged edge. */}
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Figure
            label="On the books"
            value={String(head.active)}
            hint={
              head.left > 0
                ? head.left + " more have left"
                : "nobody has left yet"
            }
          />
          <Figure
            label="Average time here"
            value={formatMonths(head.averageTenure)}
            hint={"half of them past " + formatMonths(head.medianTenure)}
          />
          <Figure
            label="Joined this year"
            value={String(head.joinedLastYear)}
            hint={head.leftLastYear + " walked out"}
          />
          <Figure
            label="Turnover"
            value={head.attritionRate + "%"}
            hint="of the team over 12 months"
          />

          {props.canReadTasks ? (
            <Figure
              label="Open work"
              value={String(head.openTasks)}
              hint={
                formatAverage(head.openPerPerson) + " per person on average"
              }
            />
          ) : null}

          {props.canReadAttendance ? (
            <Figure
              label="In today"
              value={String(head.inToday)}
              hint={
                head.notMarked > 0
                  ? head.notMarked + " not marked yet"
                  : head.awayToday + " away"
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// One glassy figure of the banner.
function Figure(props: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-32 flex-1 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm sm:flex-none">
      <p className="text-xs font-medium text-indigo-100">{props.label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{props.value}</p>
      <p className="mt-0.5 text-xs text-indigo-100/80">{props.hint}</p>
    </div>
  );
}
