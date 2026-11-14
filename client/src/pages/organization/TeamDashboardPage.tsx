import { useState } from "react";
import { Link } from "react-router-dom";
import { EyeOff, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamAnalyticsHero } from "@/components/teams/TeamAnalyticsHero";
import { TeamSizeRing } from "@/components/teams/TeamSizeRing";
import { TeamCoverageChart } from "@/components/teams/TeamCoverageChart";
import { TeamWorkloadChart } from "@/components/teams/TeamWorkloadChart";
import { TeamAttentionPanel } from "@/components/teams/TeamAttentionPanel";
import { TeamLoadSplitChart } from "@/components/teams/TeamLoadSplitChart";
import { TeamDeliveryChart } from "@/components/teams/TeamDeliveryChart";
import { TeamPresenceChart } from "@/components/teams/TeamPresenceChart";
import { TeamFocusPanel } from "@/components/teams/TeamFocusPanel";
import { TeamScorecards } from "@/components/teams/TeamScorecards";
import { TILE, TileSkeleton } from "@/components/teams/TeamTile";
import {
  buildTeamRows,
  buildTeamHeadline,
  buildCoverageRows,
  buildTeamAttentionItems,
} from "@/components/teams/teamAnalytics";
import { useAuth } from "@/context/AuthContext";
import { useTeams } from "@/hooks/useTeams";
import { useEmployees } from "@/hooks/useEmployees";
import { useTasks } from "@/hooks/useTasks";
import { useLeaveRequests } from "@/hooks/useLeaves";
import { useAttendanceOfDay } from "@/hooks/useAttendance";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { todayInputValue } from "@/lib/date";
import { getModuleBase } from "@/types/auth.types";
import { PERMISSIONS } from "@/lib/permissions";

// The team dashboard: the workspace read back one room at a time.
//
// A team on its own is a name, a lead and a list of people. It becomes
// something you can look at when the other modules are laid over it — the work
// its people are holding, the attendance of today, the leave they asked for,
// the department they were cut out of. So this page reads those lists and asks
// the same question of each one: "cut this by team".
//
// One thing has to be said out loud, because the whole page rests on it: a
// task is given to a PERSON, never to a team. "The work of a team" here means
// the work its people are holding right now. That is the only honest reading,
// and it is why moving somebody into another team moves their work with them.
//
// Ten tiles, and every one answers a different question:
//
//   the banner    — how many rooms there are, who is in the biggest one
//   the ring      — how the people are shared out over the teams
//   the coverage  — which departments the teams have reached, and which not
//   the workload  — where the work is, split by status
//   the panel     — what needs somebody today
//   the split     — how the work is shared INSIDE each team
//   the delivery  — which teams finish their work and which fall behind
//   the presence  — who is in today, team by team
//   the focus     — one team, on its own, in full
//   the cards     — the same readings for every team, with its faces
//
// Every number is worked out in the browser, in
// components/teams/teamAnalytics.ts, from lists the module pages already load.
// So this page adds no endpoint, and it can never disagree with the pages the
// numbers came from: they read the same queries.
export function TeamDashboardPage() {
  const { user, can } = useAuth();

  // The whole page listens to the socket: whoever changes something anywhere
  // in the workspace, the lists below are read again and the charts move on
  // their own. Nobody presses F5.
  useLiveUpdates();

  // What the person looking at this page is allowed to read.
  //
  // The page itself only asks for "teams.view", but a team is drawn from five
  // modules. Whatever this person may not read is simply not asked for, and
  // the tiles built on it are not drawn — an empty chart is a lie, and a chart
  // drawn from half a list is a worse one. The organization account carries
  // every permission, so it sees the whole page.
  const canViewEmployees = can(PERMISSIONS.EMPLOYEES_VIEW);
  const canViewTasks = can(PERMISSIONS.TASKS_VIEW_ALL);
  const canViewLeaves = can(PERMISSIONS.LEAVES_VIEW_ALL);
  const canViewAttendance = can(PERMISSIONS.ATTENDANCE_VIEW_ALL);

  const teamsQuery = useTeams();
  const employeesQuery = useEmployees(canViewEmployees);

  // The organization sees every task of the organization, so the "view" it
  // sends does not matter here.
  const tasksQuery = useTasks("assigned", canViewTasks);

  // For somebody with "leaves.view_all" the server ignores the view and sends
  // every request, so "mine" already returns the whole organization.
  const leavesQuery = useLeaveRequests(
    { view: "mine", status: "all" },
    canViewLeaves
  );

  const attendanceQuery = useAttendanceOfDay(
    todayInputValue(),
    canViewAttendance
  );

  const teams = teamsQuery.data || [];
  const employees = employeesQuery.data || [];
  const tasks = tasksQuery.data || [];
  const leaves = leavesQuery.data || [];
  const attendanceToday = attendanceQuery.data || [];

  // Everything about every team, worked out one time and then shared by every
  // tile. That is what keeps the ring, the bars, the bubbles and the cards
  // from telling three different stories about the same team.
  const rows = buildTeamRows({
    teams: teams,
    employees: employees,
    tasks: tasks,
    attendanceToday: attendanceToday,
    leaves: leaves,
  });

  const headline = buildTeamHeadline(rows, employees);
  const coverageRows = buildCoverageRows(teams, employees);
  const attentionItems = buildTeamAttentionItems(rows);

  // Which team the drill-down is looking at. We keep only the id, and fall
  // back on the first (biggest) team: the rows are rebuilt on every socket
  // update, so a team that was deleted somewhere else simply hands the panel
  // back to the top of the list instead of leaving it blank.
  const [focusId, setFocusId] = useState("");

  const isFocusStillThere = rows.some((row) => row.id === focusId);
  const selectedId = isFocusStillThere
    ? focusId
    : rows.length > 0
      ? rows[0].id
      : "";

  // The page is drawn as grey tiles until every list it asked for has arrived,
  // because one missing list would show a wrong zero.
  const isLoading =
    teamsQuery.isLoading ||
    employeesQuery.isLoading ||
    tasksQuery.isLoading ||
    leavesQuery.isLoading ||
    attendanceQuery.isLoading;

  // The same page lives under /organization and under /employee, so a link
  // inside it can never be written by hand.
  const teamsPath = getModuleBase(user?.role) + "/teams";

  // The modules this person may not read. They are named once, under the
  // banner, so a half-empty page is explained instead of looking broken.
  const hidden: string[] = [];

  if (!canViewEmployees) {
    hidden.push("people");
  }
  if (!canViewTasks) {
    hidden.push("tasks");
  }
  if (!canViewAttendance) {
    hidden.push("attendance");
  }
  if (!canViewLeaves) {
    hidden.push("leaves");
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <TeamAnalyticsHero headline={headline} teamsPath={teamsPath} />

      {hidden.length > 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4 shrink-0" />
          Your role does not open the {hidden.join(", ")} of the whole
          organization, so the tiles built on them are left out of this page.
        </p>
      ) : null}

      {isLoading ? (
        <LoadingTiles />
      ) : teams.length === 0 ? (
        <EmptyState teamsPath={teamsPath} />
      ) : (
        <>
          {/* How the people are grouped, and how far the teams reach. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <TeamSizeRing rows={rows} headline={headline} />
            {canViewEmployees ? (
              <TeamCoverageChart rows={coverageRows} />
            ) : null}
          </div>

          {/* Where the work sits, and what needs somebody today. */}
          <div className="grid gap-4 xl:grid-cols-3">
            {canViewTasks ? (
              <div className="xl:col-span-2">
                <TeamWorkloadChart rows={rows} />
              </div>
            ) : null}

            <div className={canViewTasks ? "" : "xl:col-span-3"}>
              <TeamAttentionPanel items={attentionItems} />
            </div>
          </div>

          {/* How that work is shared inside each room, and who delivers it. */}
          {canViewTasks ? (
            <>
              <TeamLoadSplitChart rows={rows} />
              <TeamDeliveryChart rows={rows} />
            </>
          ) : null}

          {/* Today. */}
          {canViewAttendance ? <TeamPresenceChart rows={rows} /> : null}

          {/* One team, read on its own. */}
          <TeamFocusPanel
            rows={rows}
            canReadTasks={canViewTasks}
            canReadAttendance={canViewAttendance}
            selectedId={selectedId}
            onSelect={setFocusId}
          />

          {/* And finally the same readings for every team. */}
          <TeamScorecards rows={rows} />
        </>
      )}
    </div>
  );
}

// Grey tiles in the shape of the real ones, so the page does not jump when the
// lists arrive from the server.
function LoadingTiles() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <TileSkeleton />
        <TileSkeleton />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <TileSkeleton className="h-96 xl:col-span-2" />
        <TileSkeleton className="h-96" />
      </div>
      <TileSkeleton className="h-80" />
    </div>
  );
}

// A workspace with no team at all would only see ten empty tiles, which says
// nothing. It gets one line and the way to start instead.
function EmptyState(props: { teamsPath: string }) {
  return (
    <div className={TILE}>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400">
          <UsersRound className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold tracking-tight">
          There is nothing to analyse yet
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          The charts on this page are built from your teams. Make the first one,
          give it a lead and put people in it, and this dashboard fills itself
          in.
        </p>
        <Button asChild className="mt-1">
          <Link to={props.teamsPath}>Open the teams</Link>
        </Button>
      </div>
    </div>
  );
}
