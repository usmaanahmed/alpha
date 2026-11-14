import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { PermissionRoute } from "./PermissionRoute";
import { FeatureRoute } from "./FeatureRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoginPage } from "@/pages/LoginPage";
import { OwnerDashboardPage } from "@/pages/owner/OwnerDashboardPage";
import { OrganizationsPage } from "@/pages/owner/OrganizationsPage";
import { RolesPage as DefaultRolesPage } from "@/pages/owner/RolesPage";
import { OrganizationDashboardPage } from "@/pages/organization/OrganizationDashboardPage";
import { DepartmentDashboardPage } from "@/pages/organization/DepartmentDashboardPage";
import { DepartmentsPage } from "@/pages/organization/DepartmentsPage";
import { EmployeeAnalyticsPage } from "@/pages/organization/EmployeeAnalyticsPage";
import { EmployeesPage } from "@/pages/organization/EmployeesPage";
import { EmployeeDetailPage } from "@/pages/organization/EmployeeDetailPage";
import { TeamDashboardPage } from "@/pages/organization/TeamDashboardPage";
import { TeamsPage } from "@/pages/organization/TeamsPage";
import { TasksPage } from "@/pages/organization/TasksPage";
import { RolesPage } from "@/pages/organization/RolesPage";
import { EmployeeDashboardPage } from "@/pages/employee/EmployeeDashboardPage";
import { MyTasksPage } from "@/pages/employee/MyTasksPage";
import { MyTeamPage } from "@/pages/employee/MyTeamPage";
import { TeamTasksPage } from "@/pages/employee/TeamTasksPage";
import { HolidaysPage } from "@/pages/hr/HolidaysPage";
import { LeaveTypesPage } from "@/pages/hr/LeaveTypesPage";
import { LeaveRequestsPage } from "@/pages/hr/LeaveRequestsPage";
import { MyLeavesPage } from "@/pages/hr/MyLeavesPage";
import { SalariesPage } from "@/pages/hr/SalariesPage";
import { AttendancePage } from "@/pages/hr/AttendancePage";
import { AttendanceCalendarPage } from "@/pages/hr/AttendanceCalendarPage";
import { MyAttendancePage } from "@/pages/hr/MyAttendancePage";
import { ChequeDashboardPage } from "@/pages/cheques/ChequeDashboardPage";
import { ChequesPage } from "@/pages/cheques/ChequesPage";
import { MeetingDashboardPage } from "@/pages/meetings/MeetingDashboardPage";
import { MeetingsPage } from "@/pages/meetings/MeetingsPage";
import { MyMeetingsPage } from "@/pages/employee/MyMeetingsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { NotificationsPage } from "@/pages/notifications/NotificationsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PERMISSIONS } from "@/lib/permissions";
import { FEATURES, MODULES } from "@/lib/features";

// All the urls of the app are listed here.
//
// The module pages are written TWICE: once under /organization and once under
// /employee. They are the very same components, and each one is wrapped in a
// PermissionRoute that says which permission opens it. That is what makes the
// permission module real on the screen: an employee whose role carries
// "employees.view" opens the same employee page the organization uses, at
// /employee/employees, and somebody without it is sent back to their own
// dashboard.
//
// A few pages carry a SECOND guard, FeatureRoute. That one asks the other
// question: not "does my role let me in?" but "did the SaaS owner sell this
// piece to my organization?". It is only used for a section INSIDE a module
// that is otherwise on, for example the analytics page that sits in front of
// the cheque list. A module that is switched off needs no guard at all: the
// server takes its permissions out of my profile, so the PermissionRoute in
// front of its pages closes it by itself.
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Pages only for the saas owner */}
      <Route element={<ProtectedRoute allowedRole="saas_owner" />}>
        <Route path="/owner" element={<DashboardLayout />}>
          <Route index element={<OwnerDashboardPage />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          {/* Read only: the roles a new organization starts with. */}
          <Route path="roles" element={<DefaultRolesPage />} />
          {/* The page behind "Settings" in the avatar menu. It belongs to
              whoever is logged in, so it needs no permission at all. */}
          <Route path="settings" element={<SettingsPage />} />
          {/* The bell of this account, in full. Same reason: it holds the
              lines addressed to ME, so no permission opens it. */}
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      {/* Pages of an organization account */}
      <Route element={<ProtectedRoute allowedRole="organization" />}>
        <Route path="/organization" element={<DashboardLayout />}>
          <Route index element={<OrganizationDashboardPage />} />

          {/* My own account. No permission: it is about me, not a module. */}
          <Route path="settings" element={<SettingsPage />} />
          {/* Everything the bell ever said to me. Also mine, also free —
              but the SaaS owner can take the whole notification module away,
              and then there is nothing to read here. */}
          <Route element={<FeatureRoute module={MODULES.NOTIFICATIONS} />}>
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.DEPARTMENTS_VIEW} />}>
            <Route element={<FeatureRoute feature={FEATURES.DEPARTMENTS_DASHBOARD} />}>
              <Route
                path="department-dashboard"
                element={<DepartmentDashboardPage />}
              />
            </Route>
            <Route path="departments" element={<DepartmentsPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.EMPLOYEES_VIEW} />}>
            {/* The analytics of the people come before the list itself, the
                same way the department group opens on its dashboard. */}
            <Route element={<FeatureRoute feature={FEATURES.EMPLOYEES_DASHBOARD} />}>
              <Route
                path="employee-dashboard"
                element={<EmployeeAnalyticsPage />}
              />
            </Route>
            <Route path="employees" element={<EmployeesPage />} />
            <Route element={<FeatureRoute feature={FEATURES.EMPLOYEES_PROFILE} />}>
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
            </Route>
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.TEAMS_VIEW} />}>
            {/* The analytics of the teams come before the list itself, the
                same way the department group opens on its dashboard. */}
            <Route element={<FeatureRoute feature={FEATURES.TEAMS_DASHBOARD} />}>
              <Route path="team-dashboard" element={<TeamDashboardPage />} />
            </Route>
            <Route path="teams" element={<TeamsPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.TASKS_VIEW_ALL} />}>
            <Route path="tasks" element={<TasksPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.ROLES_VIEW} />}>
            <Route path="roles" element={<RolesPage />} />
          </Route>

          {/* The HR module */}
          <Route element={<PermissionRoute permission={PERMISSIONS.HOLIDAYS_VIEW} />}>
            <Route path="holidays" element={<HolidaysPage />} />
          </Route>
          <Route element={<PermissionRoute permission={PERMISSIONS.LEAVE_TYPES_VIEW} />}>
            <Route path="leave-types" element={<LeaveTypesPage />} />
          </Route>
          <Route
            element={
              <PermissionRoute
                anyOf={[PERMISSIONS.LEAVES_VIEW_ALL, PERMISSIONS.LEAVES_APPROVE]}
              />
            }
          >
            <Route path="leaves" element={<LeaveRequestsPage />} />
          </Route>
          <Route
            element={<PermissionRoute permission={PERMISSIONS.ATTENDANCE_VIEW_ALL} />}
          >
            <Route path="attendance" element={<AttendancePage />} />
            <Route element={<FeatureRoute feature={FEATURES.ATTENDANCE_CALENDAR} />}>
              <Route
                path="attendance-calendar"
                element={<AttendanceCalendarPage />}
              />
            </Route>
          </Route>
          <Route element={<PermissionRoute permission={PERMISSIONS.SALARIES_VIEW} />}>
            <Route path="salaries" element={<SalariesPage />} />
          </Route>

          {/* The finance module */}
          <Route element={<PermissionRoute permission={PERMISSIONS.CHEQUES_VIEW} />}>
            <Route element={<FeatureRoute feature={FEATURES.CHEQUES_DASHBOARD} />}>
              <Route path="cheque-dashboard" element={<ChequeDashboardPage />} />
            </Route>
            <Route path="cheques" element={<ChequesPage />} />
          </Route>

          {/* The meeting module */}
          <Route
            element={
              <PermissionRoute
                anyOf={[
                  PERMISSIONS.MEETINGS_VIEW_ALL,
                  PERMISSIONS.MEETINGS_CREATE,
                ]}
              />
            }
          >
            <Route element={<FeatureRoute feature={FEATURES.MEETINGS_DASHBOARD} />}>
              <Route path="meeting-dashboard" element={<MeetingDashboardPage />} />
            </Route>
            <Route path="meetings" element={<MeetingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Pages of an employee.
          The first block needs no permission at all: it is my own work, and
          every employee has it. Everything after it is the same module page
          the organization uses, opened by the permission of my role. */}
      <Route element={<ProtectedRoute allowedRole="employee" />}>
        <Route path="/employee" element={<DashboardLayout />}>
          <Route index element={<EmployeeDashboardPage />} />
          <Route path="my-tasks" element={<MyTasksPage />} />
          <Route element={<FeatureRoute feature={FEATURES.TEAMS_MY_TEAM} />}>
            <Route path="my-team" element={<MyTeamPage />} />
          </Route>
          <Route path="team-tasks" element={<TeamTasksPage />} />
          <Route path="my-meetings" element={<MyMeetingsPage />} />
          <Route path="my-leaves" element={<MyLeavesPage />} />
          <Route path="my-attendance" element={<MyAttendancePage />} />
          {/* My own account, opened from the avatar menu on the topbar. */}
          <Route path="settings" element={<SettingsPage />} />
          {/* Everything the bell ever said to me. */}
          <Route element={<FeatureRoute module={MODULES.NOTIFICATIONS} />}>
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
          {/* Every employee has to know which days the office is closed. */}
          <Route path="holidays" element={<HolidaysPage />} />

          {/* Answering the leave requests of my own people, or of everybody.
              A team lead gets in without any permission too: a request is
              routed to them for a recommendation, so they must be able to
              open the page and read it. */}
          <Route
            element={
              <PermissionRoute
                anyOf={[PERMISSIONS.LEAVES_VIEW_ALL, PERMISSIONS.LEAVES_APPROVE]}
                allowTeamLead
              />
            }
          >
            <Route path="leaves" element={<LeaveRequestsPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.DEPARTMENTS_VIEW} />}>
            <Route element={<FeatureRoute feature={FEATURES.DEPARTMENTS_DASHBOARD} />}>
              <Route
                path="department-dashboard"
                element={<DepartmentDashboardPage />}
              />
            </Route>
            <Route path="departments" element={<DepartmentsPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.EMPLOYEES_VIEW} />}>
            <Route element={<FeatureRoute feature={FEATURES.EMPLOYEES_DASHBOARD} />}>
              <Route
                path="employee-dashboard"
                element={<EmployeeAnalyticsPage />}
              />
            </Route>
            <Route path="employees" element={<EmployeesPage />} />
            <Route element={<FeatureRoute feature={FEATURES.EMPLOYEES_PROFILE} />}>
              <Route path="employees/:id" element={<EmployeeDetailPage />} />
            </Route>
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.TEAMS_VIEW} />}>
            <Route element={<FeatureRoute feature={FEATURES.TEAMS_DASHBOARD} />}>
              <Route path="team-dashboard" element={<TeamDashboardPage />} />
            </Route>
            <Route path="teams" element={<TeamsPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.TASKS_VIEW_ALL} />}>
            <Route path="tasks" element={<TasksPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.ROLES_VIEW} />}>
            <Route path="roles" element={<RolesPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.LEAVE_TYPES_VIEW} />}>
            <Route path="leave-types" element={<LeaveTypesPage />} />
          </Route>

          <Route
            element={<PermissionRoute permission={PERMISSIONS.ATTENDANCE_VIEW_ALL} />}
          >
            <Route path="attendance" element={<AttendancePage />} />
            <Route element={<FeatureRoute feature={FEATURES.ATTENDANCE_CALENDAR} />}>
              <Route
                path="attendance-calendar"
                element={<AttendanceCalendarPage />}
              />
            </Route>
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.SALARIES_VIEW} />}>
            <Route path="salaries" element={<SalariesPage />} />
          </Route>

          <Route element={<PermissionRoute permission={PERMISSIONS.CHEQUES_VIEW} />}>
            <Route element={<FeatureRoute feature={FEATURES.CHEQUES_DASHBOARD} />}>
              <Route path="cheque-dashboard" element={<ChequeDashboardPage />} />
            </Route>
            <Route path="cheques" element={<ChequesPage />} />
          </Route>

          <Route
            element={
              <PermissionRoute
                anyOf={[
                  PERMISSIONS.MEETINGS_VIEW_ALL,
                  PERMISSIONS.MEETINGS_CREATE,
                ]}
              />
            }
          >
            <Route element={<FeatureRoute feature={FEATURES.MEETINGS_DASHBOARD} />}>
              <Route path="meeting-dashboard" element={<MeetingDashboardPage />} />
            </Route>
            <Route path="meetings" element={<MeetingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
