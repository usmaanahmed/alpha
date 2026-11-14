import { useState } from "react";
import { Link } from "react-router-dom";
import { EyeOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeAnalyticsHero } from "@/components/employees/EmployeeAnalyticsHero";
import { EmployeeCompositionChart } from "@/components/employees/EmployeeCompositionChart";
import { EmployeeSpreadChart } from "@/components/employees/EmployeeSpreadChart";
import { EmployeeTenureChart } from "@/components/employees/EmployeeTenureChart";
import { EmployeeAgeChart } from "@/components/employees/EmployeeAgeChart";
import { EmployeeGrowthChart } from "@/components/employees/EmployeeGrowthChart";
import { EmployeeWorkloadChart } from "@/components/employees/EmployeeWorkloadChart";
import { EmployeeDeliveryChart } from "@/components/employees/EmployeeDeliveryChart";
import { EmployeePresenceChart } from "@/components/employees/EmployeePresenceChart";
import { EmployeeLeaveChart } from "@/components/employees/EmployeeLeaveChart";
import { EmployeeAttentionPanel } from "@/components/employees/EmployeeAttentionPanel";
import { EmployeeMomentsPanel } from "@/components/employees/EmployeeMomentsPanel";
import { EmployeeFocusPanel } from "@/components/employees/EmployeeFocusPanel";
import { EmployeeScorecards } from "@/components/employees/EmployeeScorecards";
import { TILE, TileSkeleton } from "@/components/employees/EmployeeTile";
import {
  activeRows,
  buildAttentionItems,
  buildEmployeeRows,
  buildHeadline,
} from "@/components/employees/employeeAnalytics";
import { useAuth } from "@/context/AuthContext";
import { useEmployees } from "@/hooks/useEmployees";
import { useTeams } from "@/hooks/useTeams";
import { useTasks } from "@/hooks/useTasks";
import { useLeaveRequests } from "@/hooks/useLeaves";
import { useAttendanceOfDay } from "@/hooks/useAttendance";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { todayInputValue } from "@/lib/date";
import { getModuleBase } from "@/types/auth.types";
import { PERMISSIONS } from "@/lib/permissions";

// The employee dashboard: the whole workspace read back one person at a time.
//
// The employee list on its own is a phone book. It becomes an analysis when
// the other modules are laid over it — the work each person holds, the day
// they are having, the leave they have taken, the team they sit in, the people
// who answer to them. So this page reads those lists and asks the same
// question of each one: "cut this by person".
//
// Fourteen tiles, and every one answers a different question:
//
//   the banner      — who works here, and is anybody in trouble today
//   the make-up     — what kind of contracts the team is on, and its split
//   the spread      — which departments and which roles hold the people
//   the tenure      — how long they have stayed
//   the age         — how old the team is
//   the year        — who came in, who walked out, and how the head count moved
//   the workload    — who is carrying the work, and whose pile is late
//   the panel       — who needs somebody today
//   the delivery    — who finishes their work and who falls behind
//   the presence    — where everybody is today
//   the time off    — what each person has taken this year
//   the lines       — who answers to whom, and who answers to nobody
//   the moments     — the birthdays, the years here, the new faces
//   the focus       — one person, on their own, in full
//   the cards       — the same readings for everybody
//
// Every number is worked out in the browser, in
// components/employees/employeeAnalytics.ts, from lists the module pages
// already load. So this page adds no endpoint, and it can never disagree with
// the pages the numbers came from: they read the same queries.
export function EmployeeAnalyticsPage() {
  const { user, can } = useAuth();

  // The whole page listens to the socket: whoever changes something anywhere
  // in the workspace, the lists below are read again and the charts move on
  // their own. Nobody presses F5.
  useLiveUpdates();

  // What the person looking at this page is allowed to read.
  //
  // The page itself only asks for "employees.view", but a person is drawn from
  // five modules. Whatever this person may not read is simply not asked for,
  // and the tiles built on it are not drawn — an empty chart is a lie, and a
  // chart drawn from half a list is a worse one. The organization account
  // carries every permission, so it sees the whole page.
  const canViewTeams = can(PERMISSIONS.TEAMS_VIEW);
  const canViewTasks = can(PERMISSIONS.TASKS_VIEW_ALL);
  const canViewLeaves = can(PERMISSIONS.LEAVES_VIEW_ALL);
  const canViewAttendance = can(PERMISSIONS.ATTENDANCE_VIEW_ALL);

  const employeesQuery = useEmployees();
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

  const employees = employeesQuery.data || [];
  const teams = teamsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const leaves = leavesQuery.data || [];
  const attendanceToday = attendanceQuery.data || [];

  // Everything about every person, worked out one time and then shared by
  // every tile. That is what keeps the rings, the bars, the panels and the
  // cards from telling three different stories about the same person.
  const rows = buildEmployeeRows({
    employees: employees,
    teams: teams,
    tasks: tasks,
    attendanceToday: attendanceToday,
    leaves: leaves,
  });

  // The whole page can be narrowed down to one department. It is the reading a
  // lead actually wants — "my people, not everybody's" — and it costs nothing,
  // because the rows are already built: they are only filtered.
  const [departmentId, setDepartmentId] = useState("all");

  const departmentOptions: { id: string; name: string }[] = [];

  rows.forEach((row) => {
    if (!row.departmentId) {
      return;
    }

    const alreadyThere = departmentOptions.some(
      (option) => option.id === row.departmentId
    );

    if (!alreadyThere) {
      departmentOptions.push({ id: row.departmentId, name: row.departmentName });
    }
  });

  departmentOptions.sort((left, right) => left.name.localeCompare(right.name));

  // A department that was deleted while the page was open would leave the
  // picker pointing at nothing, so it falls back on everybody.
  const isDepartmentStillThere = departmentOptions.some(
    (option) => option.id === departmentId
  );

  const selectedDepartment =
    departmentId === "all" || isDepartmentStillThere ? departmentId : "all";

  const visibleRows =
    selectedDepartment === "all"
      ? rows
      : rows.filter((row) => row.departmentId === selectedDepartment);

  // Almost every tile reads the people who still work here: somebody who left
  // is not part of today's workforce, and counting them would describe a
  // company that no longer exists. The attention panel is the one exception —
  // it is exactly where a leaver still holding work has to show up.
  const people = activeRows(visibleRows);

  const headline = buildHeadline(visibleRows);

  const attentionItems = buildAttentionItems(visibleRows, {
    canReadTasks: canViewTasks,
    canReadTeams: canViewTeams,
    canReadLeaves: canViewLeaves,
  });

  // Which person the drill-down is looking at. We keep only the id, and fall
  // back on the first one: the rows are rebuilt on every socket update, so
  // somebody who was deleted elsewhere simply hands the panel back to the top
  // of the list instead of leaving it blank.
  const [focusId, setFocusId] = useState("");

  const isFocusStillThere = people.some((row) => row.id === focusId);
  const selectedId = isFocusStillThere
    ? focusId
    : people.length > 0
      ? people[0].id
      : "";

  // The page is drawn as grey tiles until every list it asked for has arrived,
  // because one missing list would show a wrong zero.
  const isLoading =
    employeesQuery.isLoading ||
    teamsQuery.isLoading ||
    tasksQuery.isLoading ||
    leavesQuery.isLoading ||
    attendanceQuery.isLoading;

  // The same page lives under /organization and under /employee, so a link
  // inside it can never be written by hand.
  const employeesPath = getModuleBase(user?.role) + "/employees";
  const attendancePath = getModuleBase(user?.role) + "/attendance";

  // The modules this person may not read. They are named once, under the
  // banner, so a half-empty page is explained instead of looking broken.
  const hidden: string[] = [];

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
      <EmployeeAnalyticsHero
        headline={headline}
        employeesPath={employeesPath}
        canReadTasks={canViewTasks}
        canReadAttendance={canViewAttendance}
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
      ) : employees.length === 0 ? (
        <EmptyState employeesPath={employeesPath} />
      ) : (
        <>
          {/* Who the page is about. Everything under this line is drawn from
              the people it leaves in. */}
          {departmentOptions.length > 1 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3">
              <span className="text-sm font-medium">Reading</span>

              <Select
                value={selectedDepartment}
                onValueChange={setDepartmentId}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everybody</SelectItem>
                  {departmentOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-sm text-muted-foreground">
                {people.length} {people.length === 1 ? "person" : "people"} on
                the books
                {headline.left > 0
                  ? ", and " + headline.left + " who have left"
                  : ""}
                .
              </span>
            </div>
          ) : null}

          {/* What the workforce is made of, and where it sits. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <EmployeeCompositionChart rows={people} />
            <EmployeeSpreadChart rows={people} />
          </div>

          {/* How long they have stayed, and how old they are. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <EmployeeTenureChart rows={people} headline={headline} />
            <EmployeeAgeChart rows={people} />
          </div>

          {/* The year behind us. It reads the leavers too, so they are given
              the whole list and not only the people still here. */}
          <EmployeeGrowthChart rows={visibleRows} />

          {/* Where the work sits, and who needs somebody today. */}
          <div className="grid gap-4 xl:grid-cols-3">
            {canViewTasks ? (
              <div className="xl:col-span-2">
                <EmployeeWorkloadChart rows={people} />
              </div>
            ) : null}

            <div className={canViewTasks ? "" : "xl:col-span-3"}>
              <EmployeeAttentionPanel
                items={attentionItems}
                employeesPath={employeesPath}
              />
            </div>
          </div>

          {/* Who finishes their work, and who falls behind. */}
          {canViewTasks ? <EmployeeDeliveryChart rows={people} /> : null}

          {/* Today, and the year so far. */}
          {canViewAttendance || canViewLeaves ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {canViewAttendance ? (
                <EmployeePresenceChart
                  rows={people}
                  attendancePath={attendancePath}
                />
              ) : null}
              {canViewLeaves ? <EmployeeLeaveChart rows={people} /> : null}
            </div>
          ) : null}

          {/* The dates coming up. */}
          <EmployeeMomentsPanel rows={people} employeesPath={employeesPath} />

          {/* One person, read on their own. */}
          <EmployeeFocusPanel
            rows={people}
            canReadTasks={canViewTasks}
            canReadLeaves={canViewLeaves}
            canReadAttendance={canViewAttendance}
            canReadTeams={canViewTeams}
            employeesPath={employeesPath}
            selectedId={selectedId}
            onSelect={setFocusId}
          />

          {/* And finally the same readings for everybody. */}
          <EmployeeScorecards
            rows={people}
            canReadTasks={canViewTasks}
            canReadAttendance={canViewAttendance}
            employeesPath={employeesPath}
            totalOpen={headline.openTasks}
          />
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
        <TileSkeleton className="h-96" />
        <TileSkeleton className="h-96" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <TileSkeleton />
        <TileSkeleton />
      </div>
      <TileSkeleton className="h-96" />
      <div className="grid gap-4 xl:grid-cols-3">
        <TileSkeleton className="h-96 xl:col-span-2" />
        <TileSkeleton className="h-96" />
      </div>
    </div>
  );
}

// A workspace with nobody in it would only see fourteen empty tiles, which
// says nothing. It gets one line and the way to start instead.
function EmptyState(props: { employeesPath: string }) {
  return (
    <div className={TILE}>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          <Users className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold tracking-tight">
          There is nobody to analyse yet
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          Every chart on this page is built from your people. Add the first
          employee, give them a department and some work, and this dashboard
          fills itself in.
        </p>
        <Button asChild className="mt-1">
          <Link to={props.employeesPath}>Open the employees</Link>
        </Button>
      </div>
    </div>
  );
}
