import { PERMISSIONS } from "./permissions.js";

// The list of everything the SaaS owner can switch on and off for ONE
// organization.
//
// There are two sizes of switch here:
//
//   - a MODULE is a whole area of the app ("Cheques", "Meetings", "Tasks").
//     When the SaaS owner switches a module off for an organization, every
//     page, every link and every route of that module is gone for that
//     organization: nobody inside it can open the pages any more, not even
//     the organization account itself.
//
//   - a FEATURE is one named piece INSIDE a module: a card, a panel, a
//     second page, an extra way of working. "Cheques" stays on, but the
//     reminders card is off. Turning a module off turns off every feature
//     inside it as well, because the whole area is gone.
//
// This file is the ONLY place where a module or a feature is invented. The
// server checks against it, and the React app draws the switch board of the
// SaaS owner from it (it reads it with GET /api/organizations/modules), so
// the two sides can never disagree about what exists.
//
// Every key is written once here so nobody has to remember the exact text:
// a typo in a text is silent, a typo in MODULES.CHEQUES is a TypeScript
// error.

// The key of every module, so the rest of the server can name one without
// typing the text by hand.
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

// The key of every feature. The text always starts with the key of the
// module it lives in, so reading "cheques.reminders" already tells you where
// it belongs.
export const FEATURES = {
  // Dashboard: the big page is one block under the other, and each block is
  // its own switch.
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

// One switch inside a module.
export interface ModuleFeature {
  key: string;
  label: string;
  // The small grey sentence under the switch, so the SaaS owner knows what
  // really disappears when it is turned off.
  description: string;
  // Where in the app this section sits, written the way the user reads it on
  // the screen. The switch board says it out loud ("on the Cheque Dashboard
  // page"), because "what does this take away" is really two questions: what
  // does it look like, and where was it.
  page: string;
  // Which drawing the switch board shows for this section. The list of the
  // drawings that exist lives on the React side, in FeaturePreview.tsx, and
  // a key that names none of them simply falls back to a plain box.
  preview: string;
}

// One module of the app, with everything that can be switched inside it.
export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  // The permissions that belong to this module. When the module is off,
  // these permissions are taken away from everybody of that organization,
  // which is what makes the menu, the routes and the buttons disappear on
  // their own: they are all built from the permission list.
  //
  // A module without a permission (the bell) simply keeps this empty.
  permissions: string[];
  // The pages this module owns, named the way they are written in the menu.
  // Switching the module off takes exactly these pages away, so the switch
  // board can list them instead of leaving the SaaS owner to guess.
  pages: string[];
  features: ModuleFeature[];
}

// The whole switch board, in the order it is drawn on the screen.
export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    key: MODULES.DASHBOARD,
    label: "Dashboard",
    description:
      "The first page of the organization: the numbers, the charts and the timeline of the whole workspace.",
    permissions: [PERMISSIONS.DASHBOARD_VIEW],
    pages: ["Dashboard"],
    features: [
      {
        key: FEATURES.DASHBOARD_QUICK_ACCESS,
        page: "Dashboard",
        preview: "icon-grid",
        label: "Quick access",
        description: "The grid of app icons that opens every page.",
      },
      {
        key: FEATURES.DASHBOARD_CREATE_SHORTCUTS,
        page: "Dashboard",
        preview: "buttons",
        label: "Create shortcuts",
        description:
          "The row of buttons that starts a new task, meeting or cheque.",
      },
      {
        key: FEATURES.DASHBOARD_STAT_CARDS,
        page: "Dashboard",
        preview: "stat-cards",
        label: "Workspace numbers",
        description:
          "The cards counted by the server: people, tasks, meetings, money.",
      },
      {
        key: FEATURES.DASHBOARD_MODULE_ANALYTICS,
        page: "Dashboard",
        preview: "bento",
        label: "Module analytics",
        description: "The bento grid with one chart per module.",
      },
      {
        key: FEATURES.DASHBOARD_TASK_CHARTS,
        page: "Dashboard",
        preview: "charts",
        label: "Task charts",
        description:
          "The task status ring, the month by month bars and the split by department.",
      },
      {
        key: FEATURES.DASHBOARD_TOP_EMPLOYEES,
        page: "Dashboard",
        preview: "list",
        label: "Top employees",
        description: "Who carries the most work right now.",
      },
      {
        key: FEATURES.DASHBOARD_RECENT_ACTIVITY,
        page: "Dashboard",
        preview: "timeline",
        label: "Activity timeline",
        description: "The last things that happened anywhere in the workspace.",
      },
      {
        key: FEATURES.DASHBOARD_PLANNED_ABSENCES,
        page: "Dashboard",
        preview: "list",
        label: "Planned absences",
        description: "Who is away over the next two weeks.",
      },
      {
        key: FEATURES.DASHBOARD_UPCOMING_EVENTS,
        page: "Dashboard",
        preview: "cards-3",
        label: "Events and onboarding",
        description: "The coming holidays and the people who just joined.",
      },
    ],
  },
  {
    key: MODULES.DEPARTMENTS,
    label: "Departments",
    description: "The departments of the company and the people inside them.",
    permissions: [
      PERMISSIONS.DEPARTMENTS_VIEW,
      PERMISSIONS.DEPARTMENTS_CREATE,
      PERMISSIONS.DEPARTMENTS_EDIT,
      PERMISSIONS.DEPARTMENTS_DELETE,
    ],
    pages: ["Departments", "Department Dashboard"],
    features: [
      {
        key: FEATURES.DEPARTMENTS_DASHBOARD,
        page: "Department Dashboard",
        preview: "page",
        label: "Department analytics",
        description:
          "The whole analytics page that sits in front of the department list.",
      },
    ],
  },
  {
    key: MODULES.EMPLOYEES,
    label: "Employees",
    description: "The staff list, the profiles and the logins of the people.",
    permissions: [
      PERMISSIONS.EMPLOYEES_VIEW,
      PERMISSIONS.EMPLOYEES_CREATE,
      PERMISSIONS.EMPLOYEES_EDIT,
      PERMISSIONS.EMPLOYEES_DELETE,
    ],
    pages: ["Employees", "Employee Dashboard", "Employee profile"],
    features: [
      {
        key: FEATURES.EMPLOYEES_DASHBOARD,
        page: "Employee Dashboard",
        preview: "page",
        label: "Employee analytics",
        description:
          "The whole analytics page that sits in front of the staff list.",
      },
      {
        key: FEATURES.EMPLOYEES_PROFILE,
        page: "Employee profile",
        preview: "page",
        label: "Employee profile page",
        description:
          "The full page of one employee. Without it the list stays, but a row does not open.",
      },
      {
        key: FEATURES.EMPLOYEES_ACTIVITY,
        page: "Employees",
        preview: "accordion",
        label: "Activity accordion",
        description:
          "A row of the list opens into the tasks, meetings and presence of that person today.",
      },
    ],
  },
  {
    key: MODULES.TEAMS,
    label: "Teams",
    description: "The teams inside a department, their lead and their members.",
    permissions: [
      PERMISSIONS.TEAMS_VIEW,
      PERMISSIONS.TEAMS_CREATE,
      PERMISSIONS.TEAMS_EDIT,
      PERMISSIONS.TEAMS_DELETE,
    ],
    pages: ["Teams", "Team Dashboard", "My Team"],
    features: [
      {
        key: FEATURES.TEAMS_DASHBOARD,
        page: "Team Dashboard",
        preview: "page",
        label: "Team analytics",
        description:
          "The whole analytics page that sits in front of the team list.",
      },
      {
        key: FEATURES.TEAMS_MY_TEAM,
        page: "My Team",
        preview: "page",
        label: "My team page",
        description: "The page where an employee sees the team they belong to.",
      },
    ],
  },
  {
    key: MODULES.ROLES,
    label: "Roles and permissions",
    description:
      "The roles of the organization and the permissions ticked on each of them.",
    permissions: [
      PERMISSIONS.ROLES_VIEW,
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_EDIT,
      PERMISSIONS.ROLES_DELETE,
    ],
    pages: ["Roles"],
    features: [],
  },
  {
    key: MODULES.TASKS,
    label: "Tasks",
    description:
      "Giving work to people and following it. Also covers the My Tasks page of every employee.",
    permissions: [
      PERMISSIONS.TASKS_VIEW_ALL,
      PERMISSIONS.TASKS_ASSIGN,
      PERMISSIONS.TASKS_EDIT,
      PERMISSIONS.TASKS_DELETE,
    ],
    pages: ["Tasks", "My Tasks", "Team Tasks"],
    features: [
      {
        key: FEATURES.TASKS_KANBAN,
        page: "Tasks, My Tasks and Team Tasks",
        preview: "kanban",
        label: "Kanban view",
        description: "The board with one column per status.",
      },
      {
        key: FEATURES.TASKS_CALENDAR,
        page: "Tasks, My Tasks and Team Tasks",
        preview: "calendar",
        label: "Calendar view",
        description: "The month calendar of the deadlines.",
      },
      {
        key: FEATURES.TASKS_COMMENTS,
        page: "the task detail window",
        preview: "comments",
        label: "Comments",
        description: "Talking under a task.",
      },
      {
        key: FEATURES.TASKS_ATTACHMENTS,
        page: "the task detail window",
        preview: "files",
        label: "Attachments",
        description: "Hanging files on a task.",
      },
    ],
  },
  {
    key: MODULES.MEETINGS,
    label: "Meetings",
    description:
      "Scheduling meetings and inviting people. Also covers the My Meetings page.",
    permissions: [
      PERMISSIONS.MEETINGS_VIEW_ALL,
      PERMISSIONS.MEETINGS_CREATE,
      PERMISSIONS.MEETINGS_EDIT,
      PERMISSIONS.MEETINGS_DELETE,
    ],
    pages: ["Meetings", "Meeting Dashboard", "My Meetings"],
    features: [
      {
        key: FEATURES.MEETINGS_DASHBOARD,
        page: "Meeting Dashboard",
        preview: "page",
        label: "Meeting analytics",
        description:
          "The whole analytics page that sits in front of the meeting list.",
      },
      {
        key: FEATURES.MEETINGS_NOTES,
        page: "the meeting detail window",
        preview: "notes",
        label: "Meeting notes",
        description: "Writing down what was said after a meeting.",
      },
      {
        key: FEATURES.MEETINGS_RESCHEDULE,
        page: "the meeting detail window",
        preview: "button",
        label: "Rescheduling",
        description:
          "Moving a meeting to another moment, which asks everybody to answer again.",
      },
    ],
  },
  {
    key: MODULES.CHEQUES,
    label: "Cheques",
    description:
      "The money moving in and out of the company, cheque by cheque.",
    permissions: [
      PERMISSIONS.CHEQUES_VIEW,
      PERMISSIONS.CHEQUES_CREATE,
      PERMISSIONS.CHEQUES_EDIT,
      PERMISSIONS.CHEQUES_DELETE,
    ],
    pages: ["Cheques", "Cheque Dashboard"],
    features: [
      {
        key: FEATURES.CHEQUES_DASHBOARD,
        page: "Cheque Dashboard",
        preview: "page",
        label: "Finance dashboard",
        description:
          "The whole analytics page that sits in front of the cheque list.",
      },
      {
        key: FEATURES.CHEQUES_REMINDERS,
        page: "Cheque Dashboard",
        preview: "list",
        label: "Reminders",
        description: "The card of the cheques that are due or already late.",
      },
      {
        key: FEATURES.CHEQUES_SCAN,
        page: "the cheque form and detail window",
        preview: "upload",
        label: "Cheque scan",
        description: "Uploading and reading the picture of a cheque.",
      },
    ],
  },
  {
    key: MODULES.SALARIES,
    label: "Salaries",
    description:
      "What every employee earns and the allowances paid on top of it.",
    permissions: [
      PERMISSIONS.SALARIES_VIEW,
      PERMISSIONS.SALARIES_CREATE,
      PERMISSIONS.SALARIES_EDIT,
      PERMISSIONS.SALARIES_DELETE,
    ],
    pages: ["Salaries"],
    features: [
      {
        key: FEATURES.SALARIES_ALLOWANCES,
        page: "the salary form and detail window",
        preview: "form-rows",
        label: "Allowances",
        description:
          "The extra lines on top of the basic salary. Without it a salary is one single amount.",
      },
    ],
  },
  {
    key: MODULES.ATTENDANCE,
    label: "Attendance",
    description:
      "Who was in and when. Also covers the My Attendance page of every employee.",
    permissions: [PERMISSIONS.ATTENDANCE_VIEW_ALL, PERMISSIONS.ATTENDANCE_EDIT],
    pages: ["Attendance", "Attendance Calendar", "My Attendance"],
    features: [
      {
        key: FEATURES.ATTENDANCE_CALENDAR,
        page: "Attendance Calendar and My Attendance",
        preview: "calendar",
        label: "Attendance calendar",
        description: "The month view of the days, next to the day by day table.",
      },
      {
        key: FEATURES.ATTENDANCE_SELF_CHECKIN,
        page: "My Attendance",
        preview: "checkin",
        label: "Self check-in",
        description:
          "The card where an employee checks themselves in and out. Without it only a manager writes the days.",
      },
    ],
  },
  {
    key: MODULES.LEAVES,
    label: "Leave requests",
    description:
      "Asking for days off and answering those requests. Also covers the My Leaves page.",
    permissions: [PERMISSIONS.LEAVES_VIEW_ALL, PERMISSIONS.LEAVES_APPROVE],
    pages: ["Leave Requests", "My Leaves"],
    features: [
      {
        key: FEATURES.LEAVES_DECISION_SUPPORT,
        page: "the leave review window",
        preview: "panels",
        label: "Decision support",
        description:
          "The warnings, the clashes and the workload panels shown while answering a request.",
      },
      {
        key: FEATURES.LEAVES_DOCUMENTS,
        page: "the leave windows",
        preview: "files",
        label: "Supporting documents",
        description: "Hanging a medical note or a ticket on a request.",
      },
      {
        key: FEATURES.LEAVES_HISTORY,
        page: "the leave history window",
        preview: "timeline",
        label: "Approval history",
        description:
          "The trail of who recommended and who decided, step by step.",
      },
    ],
  },
  {
    key: MODULES.LEAVE_TYPES,
    label: "Leave types",
    description:
      "The kinds of leave the organization gives, with their yearly balance.",
    permissions: [
      PERMISSIONS.LEAVE_TYPES_VIEW,
      PERMISSIONS.LEAVE_TYPES_CREATE,
      PERMISSIONS.LEAVE_TYPES_EDIT,
      PERMISSIONS.LEAVE_TYPES_DELETE,
    ],
    pages: ["Leave Types"],
    features: [],
  },
  {
    key: MODULES.HOLIDAYS,
    label: "Holidays",
    description: "The days the office is closed, for the whole organization.",
    permissions: [
      PERMISSIONS.HOLIDAYS_VIEW,
      PERMISSIONS.HOLIDAYS_CREATE,
      PERMISSIONS.HOLIDAYS_EDIT,
      PERMISSIONS.HOLIDAYS_DELETE,
    ],
    pages: ["Holidays"],
    features: [],
  },
  {
    key: MODULES.NOTIFICATIONS,
    label: "Notifications",
    description:
      "The bell of the topbar and the page behind it. This module has no permission: everybody of the organization has a bell, or nobody has.",
    permissions: [],
    pages: ["Notifications"],
    features: [
      {
        key: FEATURES.NOTIFICATIONS_BELL,
        page: "the topbar of every page",
        preview: "bell",
        label: "Bell on the topbar",
        description:
          "The little bell with the five newest lines. Without it the lines are only on the notification page.",
      },
    ],
  },
];

// Every module key of the app, flattened into one array.
export const ALL_MODULE_KEYS: string[] = MODULE_DEFINITIONS.map(
  (module) => module.key
);

// Every feature key of the app, flattened into one array.
export const ALL_FEATURE_KEYS: string[] = MODULE_DEFINITIONS.flatMap((module) =>
  module.features.map((feature) => feature.key)
);

// Is this text really one of our modules? The switch board sends an array of
// texts, and we refuse anything we do not know, so a wrong or an invented
// module can never be saved.
export function isKnownModule(moduleKey: string) {
  return ALL_MODULE_KEYS.includes(moduleKey);
}

// The same question for a feature.
export function isKnownFeature(featureKey: string) {
  return ALL_FEATURE_KEYS.includes(featureKey);
}

// Which module does this permission belong to?
//
// "cheques.create" -> "cheques". It is used to take the permissions of a
// switched off module away from everybody of that organization.
//
// A permission that belongs to no module answers null and is then never
// taken away, which is the safe way round: forgetting a line in this file
// must not silently lock people out of something else.
export function moduleOfPermission(permission: string): string | null {
  for (const module of MODULE_DEFINITIONS) {
    if (module.permissions.includes(permission)) {
      return module.key;
    }
  }

  return null;
}

// Which module does this feature belong to?
// "cheques.reminders" -> "cheques".
export function moduleOfFeature(featureKey: string): string | null {
  for (const module of MODULE_DEFINITIONS) {
    const found = module.features.find((feature) => feature.key === featureKey);

    if (found) {
      return module.key;
    }
  }

  return null;
}
