// The list of everything a role can be allowed to do.
//
// One permission is a short text like "employees.create". The first part is
// the module, the second part is the action. A role simply keeps an array of
// these texts, and the server asks "is this text inside the array?" before it
// lets somebody do the work.
//
// This file is the only place where a permission is invented. The server
// checks against it, and the React app draws its checkbox grid from it (it
// reads it with GET /api/roles/permissions), so the two sides can never
// disagree about what exists.

// Every permission of the app, written once so nobody has to remember the
// exact text. Use PERMISSIONS.EMPLOYEES_CREATE instead of typing
// "employees.create" by hand: a typo in a text is silent, a typo here is a
// TypeScript error.
export const PERMISSIONS = {
  // The numbers of the whole organization on the dashboard.
  DASHBOARD_VIEW: "dashboard.view",

  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_CREATE: "departments.create",
  DEPARTMENTS_EDIT: "departments.edit",
  DEPARTMENTS_DELETE: "departments.delete",

  EMPLOYEES_VIEW: "employees.view",
  EMPLOYEES_CREATE: "employees.create",
  EMPLOYEES_EDIT: "employees.edit",
  EMPLOYEES_DELETE: "employees.delete",

  TEAMS_VIEW: "teams.view",
  TEAMS_CREATE: "teams.create",
  TEAMS_EDIT: "teams.edit",
  TEAMS_DELETE: "teams.delete",

  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",

  // A task everybody always has: their own. These four are about the tasks
  // of other people.
  TASKS_VIEW_ALL: "tasks.view_all",
  TASKS_ASSIGN: "tasks.assign",
  TASKS_EDIT: "tasks.edit",
  TASKS_DELETE: "tasks.delete",

  MEETINGS_VIEW_ALL: "meetings.view_all",
  MEETINGS_CREATE: "meetings.create",
  MEETINGS_EDIT: "meetings.edit",
  MEETINGS_DELETE: "meetings.delete",

  CHEQUES_VIEW: "cheques.view",
  CHEQUES_CREATE: "cheques.create",
  CHEQUES_EDIT: "cheques.edit",
  CHEQUES_DELETE: "cheques.delete",

  // The salary structure of an employee: what they earn and the allowances
  // paid on top of it. This is money about a person, so it is its own module
  // and not part of "employees".
  SALARIES_VIEW: "salaries.view",
  SALARIES_CREATE: "salaries.create",
  SALARIES_EDIT: "salaries.edit",
  SALARIES_DELETE: "salaries.delete",

  ATTENDANCE_VIEW_ALL: "attendance.view_all",
  ATTENDANCE_EDIT: "attendance.edit",

  LEAVES_VIEW_ALL: "leaves.view_all",
  LEAVES_APPROVE: "leaves.approve",

  LEAVE_TYPES_VIEW: "leave_types.view",
  LEAVE_TYPES_CREATE: "leave_types.create",
  LEAVE_TYPES_EDIT: "leave_types.edit",
  LEAVE_TYPES_DELETE: "leave_types.delete",

  HOLIDAYS_VIEW: "holidays.view",
  HOLIDAYS_CREATE: "holidays.create",
  HOLIDAYS_EDIT: "holidays.edit",
  HOLIDAYS_DELETE: "holidays.delete",
} as const;

// One line of the checkbox grid.
export interface PermissionItem {
  key: string;
  label: string;
  // The small grey sentence under the checkbox, so the organization knows
  // what it is really giving away.
  description: string;
}

// One block of the checkbox grid: a module and its actions.
export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionItem[];
}

// The whole grid, in the order it is drawn on the screen.
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    items: [
      {
        key: PERMISSIONS.DASHBOARD_VIEW,
        label: "View dashboard",
        description: "See the numbers and the charts of the whole organization",
      },
    ],
  },
  {
    key: "departments",
    label: "Departments",
    items: [
      {
        key: PERMISSIONS.DEPARTMENTS_VIEW,
        label: "View",
        description: "Open the department list",
      },
      {
        key: PERMISSIONS.DEPARTMENTS_CREATE,
        label: "Create",
        description: "Add a new department",
      },
      {
        key: PERMISSIONS.DEPARTMENTS_EDIT,
        label: "Edit",
        description: "Change the name or the status of a department",
      },
      {
        key: PERMISSIONS.DEPARTMENTS_DELETE,
        label: "Delete",
        description: "Remove a department that is empty",
      },
    ],
  },
  {
    key: "employees",
    label: "Employees",
    items: [
      {
        key: PERMISSIONS.EMPLOYEES_VIEW,
        label: "View",
        description: "Open the employee list and the profile of one employee",
      },
      {
        key: PERMISSIONS.EMPLOYEES_CREATE,
        label: "Create",
        description: "Add a new employee together with its login",
      },
      {
        key: PERMISSIONS.EMPLOYEES_EDIT,
        label: "Edit",
        description: "Change an employee and its login password",
      },
      {
        key: PERMISSIONS.EMPLOYEES_DELETE,
        label: "Delete",
        description: "Remove an employee that has no work left",
      },
    ],
  },
  {
    key: "teams",
    label: "Teams",
    items: [
      {
        key: PERMISSIONS.TEAMS_VIEW,
        label: "View",
        description: "Open the team list of the organization",
      },
      {
        key: PERMISSIONS.TEAMS_CREATE,
        label: "Create",
        description: "Build a new team inside a department",
      },
      {
        key: PERMISSIONS.TEAMS_EDIT,
        label: "Edit",
        description: "Change a team, its lead and its members",
      },
      {
        key: PERMISSIONS.TEAMS_DELETE,
        label: "Delete",
        description: "Remove a team",
      },
    ],
  },
  {
    key: "roles",
    label: "Roles & permissions",
    items: [
      {
        key: PERMISSIONS.ROLES_VIEW,
        label: "View",
        description: "Open the role list and see what each role may do",
      },
      {
        key: PERMISSIONS.ROLES_CREATE,
        label: "Create",
        description: "Add a new role",
      },
      {
        key: PERMISSIONS.ROLES_EDIT,
        label: "Edit",
        description: "Change a role and tick its permissions",
      },
      {
        key: PERMISSIONS.ROLES_DELETE,
        label: "Delete",
        description: "Remove a role that nobody uses",
      },
    ],
  },
  {
    key: "tasks",
    label: "Tasks",
    items: [
      {
        key: PERMISSIONS.TASKS_VIEW_ALL,
        label: "View all",
        description:
          "See every task of the organization, not only my own ones",
      },
      {
        key: PERMISSIONS.TASKS_ASSIGN,
        label: "Assign",
        description: "Give a task to somebody else",
      },
      {
        key: PERMISSIONS.TASKS_EDIT,
        label: "Edit",
        description: "Change a task I gave",
      },
      {
        key: PERMISSIONS.TASKS_DELETE,
        label: "Delete",
        description: "Remove a task I gave",
      },
    ],
  },
  {
    key: "meetings",
    label: "Meetings",
    items: [
      {
        key: PERMISSIONS.MEETINGS_VIEW_ALL,
        label: "View all",
        description:
          "See every meeting of the organization, not only my own ones",
      },
      {
        key: PERMISSIONS.MEETINGS_CREATE,
        label: "Create",
        description: "Schedule a meeting and invite people",
      },
      {
        key: PERMISSIONS.MEETINGS_EDIT,
        label: "Edit",
        description: "Reschedule, close and write the notes of a meeting",
      },
      {
        key: PERMISSIONS.MEETINGS_DELETE,
        label: "Delete",
        description: "Remove a meeting",
      },
    ],
  },
  {
    key: "cheques",
    label: "Cheques",
    items: [
      {
        key: PERMISSIONS.CHEQUES_VIEW,
        label: "View",
        description: "Open the cheque list and the finance dashboard",
      },
      {
        key: PERMISSIONS.CHEQUES_CREATE,
        label: "Create",
        description: "Write a new cheque",
      },
      {
        key: PERMISSIONS.CHEQUES_EDIT,
        label: "Edit",
        description:
          "Change a cheque, move its status and keep its scan",
      },
      {
        key: PERMISSIONS.CHEQUES_DELETE,
        label: "Delete",
        description: "Remove a cheque",
      },
    ],
  },
  {
    key: "salaries",
    label: "Salaries",
    items: [
      {
        key: PERMISSIONS.SALARIES_VIEW,
        label: "View",
        description:
          "Open the salary list and read what one employee earns",
      },
      {
        key: PERMISSIONS.SALARIES_CREATE,
        label: "Create",
        description: "Give an employee a salary structure",
      },
      {
        key: PERMISSIONS.SALARIES_EDIT,
        label: "Edit",
        description: "Change the amounts and the allowances of a salary",
      },
      {
        key: PERMISSIONS.SALARIES_DELETE,
        label: "Delete",
        description: "Remove the salary structure of an employee",
      },
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    items: [
      {
        key: PERMISSIONS.ATTENDANCE_VIEW_ALL,
        label: "View all",
        description: "See the attendance of everybody, day by day and month by month",
      },
      {
        key: PERMISSIONS.ATTENDANCE_EDIT,
        label: "Edit",
        description: "Fix the attendance of a day by hand",
      },
    ],
  },
  {
    key: "leaves",
    label: "Leave requests",
    items: [
      {
        key: PERMISSIONS.LEAVES_VIEW_ALL,
        label: "View all",
        description: "See every leave request of the organization",
      },
      {
        key: PERMISSIONS.LEAVES_APPROVE,
        label: "Approve",
        description:
          "Open the leave screen. Answering a request needs 'View all' as well, and then it is anybody of the organization",
      },
    ],
  },
  {
    key: "leave_types",
    label: "Leave types",
    items: [
      {
        key: PERMISSIONS.LEAVE_TYPES_VIEW,
        label: "View",
        description: "Open the leave type page and see the inactive ones too",
      },
      {
        key: PERMISSIONS.LEAVE_TYPES_CREATE,
        label: "Create",
        description: "Add a new leave type",
      },
      {
        key: PERMISSIONS.LEAVE_TYPES_EDIT,
        label: "Edit",
        description: "Change a leave type",
      },
      {
        key: PERMISSIONS.LEAVE_TYPES_DELETE,
        label: "Delete",
        description: "Remove a leave type nobody used",
      },
    ],
  },
  {
    key: "holidays",
    label: "Holidays",
    items: [
      {
        key: PERMISSIONS.HOLIDAYS_VIEW,
        label: "View",
        description:
          "Open the holiday page as a manager (everybody can read the days themselves)",
      },
      {
        key: PERMISSIONS.HOLIDAYS_CREATE,
        label: "Create",
        description: "Add a holiday to the calendar",
      },
      {
        key: PERMISSIONS.HOLIDAYS_EDIT,
        label: "Edit",
        description: "Change a holiday",
      },
      {
        key: PERMISSIONS.HOLIDAYS_DELETE,
        label: "Delete",
        description: "Remove a holiday",
      },
    ],
  },
];

// Every permission text of the app, flattened into one array.
// The organization account gets this whole list, because the owner of the
// tenant may always do everything inside its own organization.
export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map((item) => item.key)
);

// Is this text really one of our permissions? The role form sends an array
// of texts, and we refuse anything we do not know, so a wrong or an invented
// permission can never be saved.
export function isKnownPermission(permission: string) {
  return ALL_PERMISSIONS.includes(permission);
}
