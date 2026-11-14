import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { CreateShortcuts } from "@/components/dashboard/CreateShortcuts";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ModuleAnalytics } from "@/components/dashboard/ModuleAnalytics";
import { DepartmentDistribution } from "@/components/dashboard/DepartmentDistribution";
import { TaskAnalytics } from "@/components/dashboard/TaskAnalytics";
import { TaskProgressChart } from "@/components/dashboard/TaskProgressChart";
import { DepartmentTasksChart } from "@/components/dashboard/DepartmentTasksChart";
import { TopEmployees } from "@/components/dashboard/TopEmployees";
import { PlannedAbsences } from "@/components/dashboard/PlannedAbsences";
import { UpcomingEvents } from "@/components/dashboard/UpcomingEvents";
import { OnboardingList } from "@/components/dashboard/OnboardingList";
import { WelcomePanel } from "@/components/dashboard/WelcomePanel";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { buildModuleStats } from "@/components/dashboard/moduleStats";
import { buildRecentActivity } from "@/components/dashboard/activityFeed";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { useEmployees } from "@/hooks/useEmployees";
import { useDepartments } from "@/hooks/useDepartments";
import { useTeams } from "@/hooks/useTeams";
import { useTasks } from "@/hooks/useTasks";
import { useMeetings } from "@/hooks/useMeetings";
import { useCheques } from "@/hooks/useCheques";
import { useLeaveRequests } from "@/hooks/useLeaves";
import { useHolidays } from "@/hooks/useHolidays";
import { useAttendanceOfDay } from "@/hooks/useAttendance";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { todayInputValue } from "@/lib/date";

export function OrganizationDashboardPage() {
  const { user, hasFeature } = useAuth();

  // The whole page listens to the socket: whoever changes something anywhere
  // in the workspace, the lists below are read again and the timeline, the
  // cards and the charts move on their own. Nobody presses F5.
  useLiveUpdates();

  // The ten numbers of the stat cards. This one is NOT a list: the server
  // counts them in the database and sends back only the numbers.
  //
  // It is only asked for when the cards are really drawn: the server closes
  // that route for an organization whose dashboard module is off.
  const statsQuery = useDashboardStats(hasFeature(FEATURES.DASHBOARD_STAT_CARDS));

  // One query per module. Every one of them is a list the module pages
  // already ask for, so the numbers on this page and the numbers inside a
  // module are always the same list, read twice.
  const employeesQuery = useEmployees();
  const departmentsQuery = useDepartments();

  // The teams are only read for the activity timeline ("Team Alpha was
  // created"), so this list is not part of the numbers above.
  const teamsQuery = useTeams();

  // The organization sees every task of the organization, so the "view" it
  // sends does not matter here.
  const tasksQuery = useTasks("assigned");
  const meetingsQuery = useMeetings();
  const chequesQuery = useCheques();

  // For the organization account the server ignores the "view" and sends
  // every leave request, so "mine" already returns the whole organization.
  const leavesQuery = useLeaveRequests({ view: "mine", status: "all" });

  // The holidays of the current year, used for the "Future Events" card.
  const currentYear = new Date().getFullYear();
  const holidaysQuery = useHolidays(currentYear);

  // Who is in today, for the attendance card.
  const attendanceQuery = useAttendanceOfDay(todayInputValue());

  const employees = employeesQuery.data || [];
  const departments = departmentsQuery.data || [];
  const teams = teamsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const meetings = meetingsQuery.data || [];
  const cheques = chequesQuery.data || [];
  const leaves = leavesQuery.data || [];
  const holidays = holidaysQuery.data || [];
  const attendanceToday = attendanceQuery.data || [];

  // Only the people who still work here belong on the timeline.
  const activeEmployees = employees.filter(
    (employee) => employee.status === "active"
  );

  // The numbers of every module, worked out one time and then shared by the
  // cards, the table and the charts.
  const moduleStats = buildModuleStats({
    employees: employees,
    departments: departments,
    tasks: tasks,
    meetings: meetings,
    cheques: cheques,
    leaves: leaves,
    holidays: holidays,
    attendanceToday: attendanceToday,
  });

  // The same lists read a second time, now for the moments instead of the
  // numbers: who did what, newest first. Fifteen lines fill the panel
  // without turning it into a page of its own.
  const activityItems = buildRecentActivity({
    employees: employees,
    departments: departments,
    teams: teams,
    tasks: tasks,
    meetings: meetings,
    cheques: cheques,
    leaves: leaves,
    organizationName: user?.organizationName || user?.name || "Organization",
    limit: 15,
  });

  // The cards and the panel are drawn as grey placeholders until every list
  // has arrived, because one missing list would show a wrong zero.
  const isLoadingStats =
    employeesQuery.isLoading ||
    departmentsQuery.isLoading ||
    tasksQuery.isLoading ||
    meetingsQuery.isLoading ||
    chequesQuery.isLoading ||
    leavesQuery.isLoading ||
    holidaysQuery.isLoading ||
    attendanceQuery.isLoading;

  // The three figures in the banner. We read them from the same module
  // numbers, so the banner can never disagree with the cards below it.
  const taskStat = moduleStats.find((stat) => stat.key === "tasks");
  const meetingStat = moduleStats.find((stat) => stat.key === "meetings");
  const leaveStat = moduleStats.find((stat) => stat.key === "leaves");

  const headline = [
    { label: "Active people", value: String(activeEmployees.length) },
    { label: "Open tasks", value: String(taskStat ? taskStat.active : 0) },
    { label: "Meetings today", value: String(meetingStat ? meetingStat.attention : 0) },
    { label: "Leaves to answer", value: String(leaveStat ? leaveStat.attention : 0) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <DashboardHero
        organizationName={user?.organizationName || user?.name || "there"}
        headline={headline}
      />

      {/* Every block below is a section of its own on the switch board of
          the SaaS owner, so each one asks whether this organization still
          has it before it is drawn. The banner above has no switch: it is
          the page itself, and a dashboard with nothing on it would be an
          empty screen instead of a page. */}

      {/* Every page this role may open, as a grid of app icons. */}
      {hasFeature(FEATURES.DASHBOARD_QUICK_ACCESS) ? <QuickAccess /> : null}

      {/* Everything this role may create, one tap away. */}
      {hasFeature(FEATURES.DASHBOARD_CREATE_SHORTCUTS) ? (
        <CreateShortcuts />
      ) : null}

      {/* The ten numbers of the workspace, straight from the server. */}
      {hasFeature(FEATURES.DASHBOARD_STAT_CARDS) ? (
        <StatsCards stats={statsQuery.data} isLoading={statsQuery.isLoading} />
      ) : null}

      {/* The analytics of every module, as one bento grid of charts. */}
      {hasFeature(FEATURES.DASHBOARD_MODULE_ANALYTICS) ? (
        <ModuleAnalytics stats={moduleStats} isLoading={isLoadingStats} />
      ) : null}

      {/* How the team is shared out over the departments, as one ring. It
          belongs to the module analytics block. */}
      {hasFeature(FEATURES.DASHBOARD_MODULE_ANALYTICS) ? (
        <DepartmentDistribution
          employees={employees}
          departments={departments}
          isLoading={employeesQuery.isLoading || departmentsQuery.isLoading}
        />
      ) : null}

      {/* The three charts about the tasks: where they stand, how the year
          went, and how they are shared out over the departments. */}
      {hasFeature(FEATURES.DASHBOARD_TASK_CHARTS) ? (
        <>
          <TaskAnalytics tasks={tasks} isLoading={tasksQuery.isLoading} />
          <TaskProgressChart />
          <DepartmentTasksChart />
        </>
      ) : null}

      {/* Who carries the most work, read from the same task list. */}
      {hasFeature(FEATURES.DASHBOARD_TOP_EMPLOYEES) ? (
        <TopEmployees tasks={tasks} isLoading={tasksQuery.isLoading} />
      ) : null}

      {/* The last things that happened, as one timeline. */}
      {hasFeature(FEATURES.DASHBOARD_RECENT_ACTIVITY) ? (
        <RecentActivity
          items={activityItems}
          isLoading={isLoadingStats || teamsQuery.isLoading}
        />
      ) : null}

      {/* The hero of the HR side: who is away over the next two weeks. */}
      {hasFeature(FEATURES.DASHBOARD_PLANNED_ABSENCES) ? (
        <PlannedAbsences
          employees={activeEmployees}
          leaves={leaves}
          isLoading={employeesQuery.isLoading || leavesQuery.isLoading}
        />
      ) : null}

      {/* The three cards under the timeline. The welcome panel is not part
          of the switch: it is the greeting of the page, not a number. */}
      <div className="grid gap-4 lg:grid-cols-3">
        {hasFeature(FEATURES.DASHBOARD_UPCOMING_EVENTS) ? (
          <>
            <UpcomingEvents
              holidays={holidays}
              isLoading={holidaysQuery.isLoading}
            />

            <OnboardingList
              employees={employees}
              isLoading={employeesQuery.isLoading}
            />
          </>
        ) : null}

        <WelcomePanel name={user?.organizationName || user?.name || "there"} />
      </div>
    </div>
  );
}
