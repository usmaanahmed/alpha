// The module and feature keys the React side has to name by itself: a page
// that hides a card asks "is this feature on?", and it has to write the key
// of that card somewhere.
//
// The full list, with its labels and its descriptions, lives on the server
// (GET /api/organizations/modules) and is drawn by the switch board of the
// SaaS owner. This file is only the short list of the keys the app writes
// down by hand, so a typo becomes a TypeScript error instead of a card that
// disappears forever.
//
// It is the exact twin of lib/permissions.ts, for the other half of the
// question: a permission says what THIS PERSON may do, a module says what
// THIS ORGANIZATION bought.

export const MODULES = {
  DASHBOARD: "dashboard",
  DEPARTMENTS: "departments",
  EMPLOYEES: "employees",
  TEAMS: "teams",
  ROLES: "roles",
  TASKS: "tasks",
  MEETINGS: "meetings",
  CHEQUES: "cheques",
  SALARIES: "salaries",
  ATTENDANCE: "attendance",
  LEAVES: "leaves",
  LEAVE_TYPES: "leave_types",
  HOLIDAYS: "holidays",
  NOTIFICATIONS: "notifications",
} as const;

export const FEATURES = {
  DASHBOARD_QUICK_ACCESS: "dashboard.quick_access",
  DASHBOARD_CREATE_SHORTCUTS: "dashboard.create_shortcuts",
  DASHBOARD_STAT_CARDS: "dashboard.stat_cards",
  DASHBOARD_MODULE_ANALYTICS: "dashboard.module_analytics",
  DASHBOARD_TASK_CHARTS: "dashboard.task_charts",
  DASHBOARD_TOP_EMPLOYEES: "dashboard.top_employees",
  DASHBOARD_RECENT_ACTIVITY: "dashboard.recent_activity",
  DASHBOARD_PLANNED_ABSENCES: "dashboard.planned_absences",
  DASHBOARD_UPCOMING_EVENTS: "dashboard.upcoming_events",

  DEPARTMENTS_DASHBOARD: "departments.dashboard",

  EMPLOYEES_DASHBOARD: "employees.dashboard",
  EMPLOYEES_PROFILE: "employees.profile",
  EMPLOYEES_ACTIVITY: "employees.activity",

  TEAMS_DASHBOARD: "teams.dashboard",
  TEAMS_MY_TEAM: "teams.my_team",

  TASKS_KANBAN: "tasks.kanban",
  TASKS_CALENDAR: "tasks.calendar",
  TASKS_COMMENTS: "tasks.comments",
  TASKS_ATTACHMENTS: "tasks.attachments",

  MEETINGS_DASHBOARD: "meetings.dashboard",
  MEETINGS_NOTES: "meetings.notes",
  MEETINGS_RESCHEDULE: "meetings.reschedule",

  CHEQUES_DASHBOARD: "cheques.dashboard",
  CHEQUES_REMINDERS: "cheques.reminders",
  CHEQUES_SCAN: "cheques.scan",

  SALARIES_ALLOWANCES: "salaries.allowances",

  ATTENDANCE_CALENDAR: "attendance.calendar",
  ATTENDANCE_SELF_CHECKIN: "attendance.self_checkin",

  LEAVES_DECISION_SUPPORT: "leaves.decision_support",
  LEAVES_DOCUMENTS: "leaves.documents",
  LEAVES_HISTORY: "leaves.history",

  NOTIFICATIONS_BELL: "notifications.bell",
} as const;

// Is this module one of the ones the organization has?
//
// The list comes from /api/auth/me and already holds only the modules that
// are on, so the question is simply "is the key in there".
export function hasModule(modules: string[], moduleKey: string) {
  return modules.includes(moduleKey);
}

// The same for one card, one panel or one extra page.
//
// The server already took the features of a switched off module out of the
// list, so a card never has to ask about its module as well.
export function hasFeature(features: string[], featureKey: string) {
  return features.includes(featureKey);
}
