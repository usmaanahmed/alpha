import { useState } from "react";
import { Link } from "react-router-dom";
import { EyeOff, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DepartmentAnalyticsHero } from "@/components/departments/DepartmentAnalyticsHero";
import { DepartmentSizeRing } from "@/components/departments/DepartmentSizeRing";
import { DepartmentStructureChart } from "@/components/departments/DepartmentStructureChart";
import { DepartmentWorkloadChart } from "@/components/departments/DepartmentWorkloadChart";
import { DepartmentDeliveryChart } from "@/components/departments/DepartmentDeliveryChart";
import { DepartmentPresenceChart } from "@/components/departments/DepartmentPresenceChart";
import { DepartmentLeaveChart } from "@/components/departments/DepartmentLeaveChart";
import { DepartmentGrowthChart } from "@/components/departments/DepartmentGrowthChart";
import { DepartmentAttentionPanel } from "@/components/departments/DepartmentAttentionPanel";
import { DepartmentScorecards } from "@/components/departments/DepartmentScorecards";
import { DepartmentFocusPanel } from "@/components/departments/DepartmentFocusPanel";
import { TILE, TileSkeleton } from "@/components/departments/DepartmentTile";
import {
  buildDepartmentRows,
  buildHeadline,
  buildAttentionItems,
} from "@/components/departments/departmentAnalytics";
import { useAuth } from "@/context/AuthContext";
import { useDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";
import { useTasks } from "@/hooks/useTasks";
import { useLeaveRequests } from "@/hooks/useLeaves";
import { useAttendanceOfDay } from "@/hooks/useAttendance";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { todayInputValue } from "@/lib/date";
import { getModuleBase } from "@/types/auth.types";
import { PERMISSIONS } from "@/lib/permissions";

// The department dashboard: the whole workspace read back one department at a
// time.
//
// A department on its own is only a name. It becomes something you can look at
// when the other modules are laid over it — the people who sit in it, the
// teams it is cut into, the work it was given, the attendance of today, the
// leave it has taken. So this page reads those lists and asks the same
// question of each one: "cut this by department".
//
// Ten tiles, and every one answers a different question:
//
//   the banner    — how the company is cut up, and is any piece in trouble
//   the ring      — how the people are shared out
//   the coverage  — who actually sits in a team
//   the workload  — where the work is, split by status
//   the panel     — what needs somebody today
//   the delivery  — who finishes their work and who falls behind
//   the presence  — who is in today, department by department
//   the time off  — what each department has taken this year
//   the growth    — who came in and who walked out over a year
//   the focus     — one department, on its own, in full
//   the cards     — the same five readings for every department
//
// Every number is worked out in the browser, in
// components/departments/departmentAnalytics.ts, from lists the module pages
// already load. So this page adds no endpoint, and it can never disagree with
// the pages the numbers came from: they read the same queries.
export function DepartmentDashboardPage() {
  const { user, can } = useAuth();

  // The whole page listens to the socket: whoever changes something anywhere
  // in the workspace, the lists below are read again and the charts move on
  // their own. Nobody presses F5.
  useLiveUpdates();

  // What the person looking at this page is allowed to read.
  //
  // The page itself only asks for "departments.view", but a department is
  // drawn from six modules. Whatever this person may not read is simply not
  // asked for, and the tiles built on it are not drawn — an empty chart is a
  // lie, and a chart drawn from half a list is a worse one. The organization
  // account carries every permission, so it sees the whole page.
  const canViewEmployees = can(PERMISSIONS.EMPLOYEES_VIEW);
  const canViewTeams = can(PERMISSIONS.TEAMS_VIEW);
  const canViewTasks = can(PERMISSIONS.TASKS_VIEW_ALL);
  const canViewLeaves = can(PERMISSIONS.LEAVES_VIEW_ALL);
  const canViewAttendance = can(PERMISSIONS.ATTENDANCE_VIEW_ALL);

  const departmentsQuery = useDepartments();
  const employeesQuery = useEmployees(canViewEmployees);
  const teamsQuery = useTeams(canViewTeams);

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

  const departments = departmentsQuery.data || [];
  const employees = employeesQuery.data || [];
  const teams = teamsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const leaves = leavesQuery.data || [];
  const attendanceToday = attendanceQuery.data || [];

  // Everything about every department, worked out one time and then shared by
  // every tile. That is what keeps the ring, the bars, the panel and the cards
  // from telling three different stories about the same department.
  const rows = buildDepartmentRows({
    departments: departments,
    employees: employees,
    teams: teams,
    tasks: tasks,
    attendanceToday: attendanceToday,
    leaves: leaves,
  });

  const headline = buildHeadline(rows, employees);
  const attentionItems = buildAttentionItems(rows);

  // Which department the drill-down is looking at. We keep only the id, and
  // fall back on the first (biggest) department: the rows are rebuilt on every
  // socket update, so a department that was deleted somewhere else simply
  // hands the panel back to the top of the list instead of leaving it blank.
  const [focusId, setFocusId] = useState("");

  const isFocusStillThere = rows.some((row) => row.id === focusId);
  const selectedId = isFocusStillThere
    ? focusId
    : rows.length > 0
      ? rows[0].id
      : "";

  // The page is drawn as grey tiles until every list it asked for has
  // arrived, because one missing list would show a wrong zero.
  const isLoading =
    departmentsQuery.isLoading ||
    employeesQuery.isLoading ||
    teamsQuery.isLoading ||
    tasksQuery.isLoading ||
    leavesQuery.isLoading ||
    attendanceQuery.isLoading;

  // The same page lives under /organization and under /employee, so a link
  // inside it can never be written by hand.
  const departmentsPath = getModuleBase(user?.role) + "/departments";

  // The modules this person may not read. They are named once, under the
  // banner, so a half-empty page is explained instead of looking broken.
  const hidden: string[] = [];

  if (!canViewEmployees) {
    hidden.push("people");
  }
  if (!canViewTeams) {
    hidden.push("teams");
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
      <DepartmentAnalyticsHero
        headline={headline}
        departmentsPath={departmentsPath}
      />

      {hidden.length > 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          <EyeOff className="h-4 w-4 shrink-0" />
          Your role does not open the {hidden.join(", ")} of the whole
          organization, so the tiles built on them are left out of this page.
        </p>
      ) : null}

      {isLoading ? (
        <LoadingTiles />
      ) : departments.length === 0 ? (
        <EmptyState departmentsPath={departmentsPath} />
      ) : (
        <>
          {/* How the workspace is cut up, and whether the people in it sit
              in a team of their department. */}
          {canViewEmployees ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <DepartmentSizeRing rows={rows} headline={headline} />
              {canViewTeams ? <DepartmentStructureChart rows={rows} /> : null}
            </div>
          ) : null}

          {/* Where the work sits, and what needs somebody today. */}
          <div className="grid gap-4 xl:grid-cols-3">
            {canViewTasks ? (
              <div className="xl:col-span-2">
                <DepartmentWorkloadChart rows={rows} />
              </div>
            ) : null}

            <div className={canViewTasks ? "" : "xl:col-span-3"}>
              <DepartmentAttentionPanel items={attentionItems} />
            </div>
          </div>

          {/* Who finishes their work, and who falls behind. */}
          {canViewTasks ? <DepartmentDeliveryChart rows={rows} /> : null}

          {/* Today, and the year so far. */}
          {canViewAttendance || canViewLeaves ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {canViewAttendance && canViewEmployees ? (
                <DepartmentPresenceChart rows={rows} />
              ) : null}
              {canViewLeaves ? <DepartmentLeaveChart rows={rows} /> : null}
            </div>
          ) : null}

          {/* Who came in and who walked out over the last twelve months. */}
          {canViewEmployees ? <DepartmentGrowthChart rows={rows} /> : null}

          {/* One department, read on its own. */}
          <DepartmentFocusPanel
            rows={rows}
            employees={employees}
            tasks={tasks}
            teams={teams}
            canReadTasks={canViewTasks}
            selectedId={selectedId}
            onSelect={setFocusId}
          />

          {/* And finally the same five readings for every department. */}
          {canViewEmployees ? <DepartmentScorecards rows={rows} /> : null}
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

// A workspace with no department at all would only see ten empty tiles, which
// says nothing. It gets one line and the way to start instead.
function EmptyState(props: { departmentsPath: string }) {
  return (
    <div className={TILE}>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          <Network className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold tracking-tight">
          There is nothing to analyse yet
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          The charts on this page are built from your departments. Create the
          first one, put people in it, and this dashboard fills itself in.
        </p>
        <Button asChild className="mt-1">
          <Link to={props.departmentsPath}>Open the departments</Link>
        </Button>
      </div>
    </div>
  );
}
