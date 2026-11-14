import { Link } from "react-router-dom";
import { Crown, TriangleAlert, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/common/Avatar";
import { formatAverage } from "./teamAnalytics";
import type { TeamHeadline } from "./teamAnalytics";

// How many faces of the biggest team the banner draws before it stops and
// writes "+4" instead. Six is what fits on a phone without wrapping.
const MAX_FACES = 6;

// The banner at the top of the team dashboard.
//
// It answers the question somebody opening this page actually has — "who works
// with whom, and is any of those rooms in trouble?" — before a single chart is
// read. The biggest team gets its own glassy card with the faces of its
// people, because a team is people and not a bar: putting them on the banner
// is what makes this page feel like the team page it belongs to.
export function TeamAnalyticsHero(props: {
  headline: TeamHeadline;
  teamsPath: string;
}) {
  const head = props.headline;
  const biggest = head.biggest;

  const faces = biggest ? biggest.people.slice(0, MAX_FACES) : [];
  const hiddenFaces = biggest ? biggest.size - faces.length : 0;

  // The one thing that needs somebody today. We only ever write one line, so
  // the loudest problem wins: a team with nobody leading it first, then late
  // work, then unanswered leaves.
  let alert = "";

  if (head.teamsWithoutLead > 0) {
    alert =
      head.teamsWithoutLead +
      (head.teamsWithoutLead === 1 ? " team has" : " teams have") +
      " nobody leading it";
  } else if (head.overdueTasks > 0) {
    alert =
      head.overdueTasks +
      (head.overdueTasks === 1 ? " task is late" : " tasks are late") +
      " across the teams";
  } else if (head.pendingLeaves > 0) {
    alert =
      head.pendingLeaves +
      (head.pendingLeaves === 1
        ? " leave request is"
        : " leave requests are") +
      " waiting for an answer";
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 text-white shadow-xl shadow-teal-500/20 sm:rounded-3xl sm:p-6 lg:p-8">
      {/* Two soft light orbs and a field of faint dots, drawn with plain css
          so the banner needs no image file. The dots are a nod to a room full
          of people. */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(#fff 1.2px, transparent 1.2px)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6 lg:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <UsersRound className="h-3.5 w-3.5" />
            {head.teams} {head.teams === 1 ? "team" : "teams"} ·{" "}
            {head.activeTeams} active · {head.departments}{" "}
            {head.departments === 1 ? "department" : "departments"}
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Team analytics
          </h1>
          <p className="mt-2 max-w-xl text-sm text-emerald-50/90">
            Who works with whom, who leads them, how the work is shared inside
            each room, and which team needs somebody to look at it today.
          </p>

          {/* The biggest team, with the faces of its people. */}
          {biggest ? (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-50/90">
                  <UsersRound className="h-3.5 w-3.5" />
                  Biggest team
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                  {biggest.size} {biggest.size === 1 ? "person" : "people"}
                </span>
              </div>

              <p className="mt-2 truncate text-lg font-semibold">
                {biggest.name}
              </p>

              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-emerald-50/90">
                <Crown className="h-3.5 w-3.5 shrink-0" />
                {biggest.lead
                  ? "led by " + biggest.lead.name
                  : "nobody is leading it"}
                {biggest.departmentName ? " · " + biggest.departmentName : ""}
              </p>

              {/* The people themselves. A team is a room, and this is the
                  room. */}
              {faces.length > 0 ? (
                <div className="mt-3 flex items-center">
                  {faces.map((person) => (
                    <Avatar
                      key={person.id}
                      name={person.name}
                      photo={person.photo}
                      size="md"
                      // The faces overlap like a row of people standing
                      // shoulder to shoulder, each one ringed so it stays
                      // readable on the coloured banner.
                      className="-ml-2 border-2 border-white/60 first:ml-0"
                    />
                  ))}

                  {hiddenFaces > 0 ? (
                    <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/60 bg-white/25 text-xs font-semibold backdrop-blur-sm">
                      +{hiddenFaces}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-50/90">
                <span>{biggest.open} open tasks</span>
                <span>{biggest.doneRate}% of its work done</span>
                <span>
                  {biggest.present + biggest.half_day} in today
                </span>
              </p>
            </div>
          ) : (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 text-sm text-emerald-50/90 backdrop-blur-sm">
              No team has anybody in it yet.
            </div>
          )}

          {alert ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-500/30 px-3 py-1 text-xs font-medium">
              <TriangleAlert className="h-3.5 w-3.5" />
              {alert}
            </p>
          ) : null}

          <div className="mt-4">
            <Button
              asChild
              variant="secondary"
              className="bg-white text-teal-700 hover:bg-emerald-50"
            >
              <Link to={props.teamsPath}>Open the teams</Link>
            </Button>
          </div>
        </div>

        {/* The headline figures. On a phone they share the whole width of the
            banner instead of leaving a ragged edge. */}
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Figure
            label="People in a team"
            value={String(head.people)}
            hint={
              !head.knowsEveryone
                ? "across every team"
                : head.peopleWithoutTeam > 0
                  ? head.peopleWithoutTeam + " sit in none"
                  : "everybody has a team"
            }
          />
          <Figure
            label="Average size"
            value={formatAverage(head.averageSize)}
            hint={
              head.emptyTeams > 0
                ? head.emptyTeams + " team(s) still empty"
                : "people per team"
            }
          />
          <Figure
            label="Leads"
            value={String(head.teams - head.teamsWithoutLead)}
            hint={
              head.teamsWithoutLead > 0
                ? head.teamsWithoutLead + " team(s) without one"
                : "every team has one"
            }
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
            label="In today"
            value={String(head.inToday)}
            hint={head.awayToday + " away"}
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
      <p className="text-xs font-medium text-emerald-50/90">{props.label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{props.value}</p>
      <p className="mt-0.5 text-xs text-emerald-50/70">{props.hint}</p>
    </div>
  );
}
