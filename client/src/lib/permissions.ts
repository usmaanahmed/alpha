// The permission texts the React side has to name by itself: the menu, the
// route guard and the buttons all ask "do I have this one?".
//
// The full list, with its labels and its descriptions, lives on the server
// (GET /api/roles/permissions) and is drawn by the role form. This file is
// only the short list of the keys the app writes down by hand, so a typo
// becomes a TypeScript error instead of a button that never shows up.
export const PERMISSIONS = {
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

// Does this list of permissions hold that one?
// Used by the menu and by the route guard, which both work with the plain
// array that /api/auth/me sends.
export function hasPermission(permissions: string[], permission: string) {
  return permissions.includes(permission);
}

// Does it hold at least one of them? A page that shows two different things
// uses this, for example the attendance page, which is opened either to read
// everybody's days or to fix one of them.
export function hasAnyPermission(
  permissions: string[],
  wanted: string[]
) {
  return wanted.some((permission) => permissions.includes(permission));
}
