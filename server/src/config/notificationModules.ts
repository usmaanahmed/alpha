import { PERMISSIONS } from "./permissions.js";

// One table that describes every module of the app for the bell.
//
// This is the ONLY place to touch when a new module has to send
// notifications. It answers the four questions a notification always asks:
//   - what do I call this thing?          -> label
//   - who is allowed to hear about it?    -> permissions
//   - which page does the line open?      -> page (and myPage)
//   - is there a name to quote in it?     -> nameFields
//
// The key is the first piece of the address of the module, exactly as it is
// written in the url: "/api/leave-types/..." -> "leave-types". The middleware
// reads the url and finds the line here, so a module that is not in this
// table simply says nothing, and that is on purpose (attendance check-ins,
// the login, the saas owner pages).

export interface NotificationModule {
  // Used inside the sentence: "Ali Khan added a new cheque".
  label: string;
  // Anybody whose role carries ONE of these hears about this module. The
  // organization account always hears everything, so it is not written here.
  permissions: string[];
  // The page of the module, the same under /organization and /employee.
  page: string;
  // The "my own" page of the module, for the lines that are about the person
  // reading them ("a task was given to YOU"). Only three modules have one.
  myPage?: string;
  // Where to look in the form for a name worth quoting. The first field that
  // really has something wins, and when there is none the sentence simply
  // has no name in it.
  nameFields: string[];
}

export const NOTIFICATION_MODULES: Record<string, NotificationModule> = {
  employees: {
    label: "employee",
    permissions: [PERMISSIONS.EMPLOYEES_VIEW],
    page: "employees",
    nameFields: ["name"],
  },
  departments: {
    label: "department",
    permissions: [PERMISSIONS.DEPARTMENTS_VIEW],
    page: "departments",
    nameFields: ["name"],
  },
  teams: {
    label: "team",
    permissions: [PERMISSIONS.TEAMS_VIEW],
    page: "teams",
    nameFields: ["name"],
  },
  roles: {
    label: "role",
    permissions: [PERMISSIONS.ROLES_VIEW],
    page: "roles",
    nameFields: ["name"],
  },
  tasks: {
    label: "task",
    permissions: [PERMISSIONS.TASKS_VIEW_ALL],
    page: "tasks",
    myPage: "my-tasks",
    nameFields: ["title"],
  },
  meetings: {
    label: "meeting",
    permissions: [PERMISSIONS.MEETINGS_VIEW_ALL],
    page: "meetings",
    myPage: "my-meetings",
    nameFields: ["title"],
  },
  cheques: {
    label: "cheque",
    permissions: [PERMISSIONS.CHEQUES_VIEW],
    page: "cheques",
    nameFields: ["chequeNumber"],
  },
  salaries: {
    label: "salary structure",
    permissions: [PERMISSIONS.SALARIES_VIEW],
    page: "salaries",
    // A salary has no name of its own (the form only sends the id of the
    // employee), so the sentence stays short: "Ali Khan added a new salary
    // structure".
    nameFields: [],
  },
  holidays: {
    label: "holiday",
    permissions: [PERMISSIONS.HOLIDAYS_VIEW],
    page: "holidays",
    nameFields: ["name"],
  },
  "leave-types": {
    label: "leave type",
    permissions: [PERMISSIONS.LEAVE_TYPES_VIEW],
    page: "leave-types",
    nameFields: ["name"],
  },
  leaves: {
    label: "leave request",
    // Somebody who answers the requests of their own people has
    // "leaves.approve" without "leaves.view_all", and they are exactly the
    // person a new request has to reach.
    permissions: [PERMISSIONS.LEAVES_VIEW_ALL, PERMISSIONS.LEAVES_APPROVE],
    page: "leaves",
    myPage: "my-leaves",
    // A leave request has no name of its own, so the sentence stays short:
    // "Ali Khan added a new leave request".
    nameFields: [],
  },
};

// The modules whose "something was created" line is written BY HAND inside
// their controller, because the controller knows more than a middleware ever
// can: a task knows who received it, a meeting knows who is invited.
//
// The middleware skips these two, so nobody is told the same thing twice.
export const WRITTEN_BY_HAND = ["tasks", "meetings"];
