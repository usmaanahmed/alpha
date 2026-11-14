import { Link } from "react-router-dom";
import { Building2, Network, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAverage } from "./departmentAnalytics";
import type { DepartmentHeadline } from "./departmentAnalytics";

// The banner at the top of the department dashboard.
//
// It answers the question somebody opening this page actually has — "how is
// the company cut up, and is any piece of it in trouble?" — before a single
// chart is read. The biggest department gets its own glassy card, because on
// most workspaces that one team is where the story is.
export function DepartmentAnalyticsHero(props: {
  headline: DepartmentHeadline;
  departmentsPath: string;
}) {
  const head = props.headline;

  // The one thing that needs somebody today. We only ever write one line, so
  // the loudest problem wins: late work first, then unanswered leaves.
  let alert = "";

  if (head.overdueTasks > 0) {
    alert =
      head.overdueTasks +
      (head.overdueTasks === 1 ? " task is late" : " tasks are late") +
      " across the departments";
  } else if (head.pendingLeaves > 0) {
    alert =
      head.pendingLeaves +
      (head.pendingLeaves === 1
        ? " leave request is"
        : " leave requests are") +
      " waiting for an answer";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-sky-600 p-5 text-white shadow-xl shadow-indigo-500/20 sm:rounded-3xl sm:p-6 lg:p-8">
      {/* Two soft light orbs and a faint grid, drawn with plain css so the
          banner needs no image file. The grid is a nod to an org chart. */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6 lg:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Network className="h-3.5 w-3.5" />
            {head.departments}{" "}
            {head.departments === 1 ? "department" : "departments"} ·{" "}
            {head.activeDepartments} active
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Department analytics
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            How your workspace is cut up: who sits where, how the work is
            shared out between the departments, and which of them needs
            somebody to look at it today.
          </p>

          {/* The biggest department, in a glassy card of its own. */}
          {head.biggest ? (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100">
                  <Building2 className="h-3.5 w-3.5" />
                  Biggest department
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                  {head.people === 0
                    ? "0%"
                    : Math.round((head.biggest.people / head.people) * 100) +
                      "% of the team"}
                </span>
              </div>

              <p className="mt-2 truncate text-lg font-semibold">
                {head.biggest.name}
              </p>

              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-100">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {head.biggest.people}{" "}
                  {head.biggest.people === 1 ? "person" : "people"}
                </span>
                <span>
                  {head.biggest.teams}{" "}
                  {head.biggest.teams === 1 ? "team" : "teams"}
                </span>
                <span>{head.biggest.open} open tasks</span>
                <span>{head.biggest.doneRate}% of its work done</span>
              </p>
            </div>
          ) : (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 text-sm text-indigo-100 backdrop-blur-sm">
              No department has anybody in it yet.
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
              <Link to={props.departmentsPath}>Open the departments</Link>
            </Button>
          </div>
        </div>

        {/* The headline figures. On a phone they share the whole width of the
            banner instead of leaving a ragged edge. */}
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Figure
            label="People placed"
            value={String(head.people)}
            hint={
              head.withoutDepartment > 0
                ? head.withoutDepartment + " sit in no department"
                : "everybody has a department"
            }
          />
          <Figure
            label="Average size"
            value={formatAverage(head.averageSize)}
            hint={
              head.emptyDepartments > 0
                ? head.emptyDepartments + " department(s) still empty"
                : "people per department"
            }
          />
          <Figure
            label="Teams"
            value={String(head.teams)}
            hint="inside the departments"
          />
          <Figure
            label="Open work"
            value={String(head.openTasks)}
            hint={
              head.overdueTasks > 0
                ? head.overdueTasks + " of them late"
                : "nothing is late"
            }
          />
          <Figure
            label="Away today"
            value={String(head.awayToday)}
            hint="on leave or absent"
          />
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
