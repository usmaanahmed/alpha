import { PERMISSIONS, ALL_PERMISSIONS } from "./permissions.js";

// The roles a brand new organization starts with.
//
// They are only a starting point: the moment the organization is created,
// these are copied into real Role documents that belong to that organization,
// and from then on the organization renames them, re-ticks their permissions
// or deletes them exactly as it wants. Changing this file later never touches
// an organization that already exists.
export interface RoleTemplate {
  name: string;
  description: string;
  permissions: string[];
}

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    name: "Admin",
    description:
      "The right hand of the organization: may do everything inside it.",
    permissions: ALL_PERMISSIONS,
  },
  {
    name: "Manager",
    description:
      "Gives tasks to its people and schedules meetings. It also opens the leave screen, but answering a request needs 'View all' too.",
    permissions: [
      PERMISSIONS.TASKS_ASSIGN,
      PERMISSIONS.TASKS_EDIT,
      PERMISSIONS.TASKS_DELETE,
      PERMISSIONS.MEETINGS_CREATE,
      PERMISSIONS.MEETINGS_EDIT,
      PERMISSIONS.MEETINGS_DELETE,
      PERMISSIONS.LEAVES_APPROVE,
    ],
  },
  {
    name: "HR",
    description:
      "Looks after the people: the attendance, the leave requests of the whole organization, the leave types and the holidays.",
    permissions: [
      PERMISSIONS.EMPLOYEES_VIEW,
      PERMISSIONS.ATTENDANCE_VIEW_ALL,
      PERMISSIONS.ATTENDANCE_EDIT,
      PERMISSIONS.LEAVES_VIEW_ALL,
      PERMISSIONS.LEAVES_APPROVE,
      PERMISSIONS.LEAVE_TYPES_VIEW,
      PERMISSIONS.LEAVE_TYPES_CREATE,
      PERMISSIONS.LEAVE_TYPES_EDIT,
      PERMISSIONS.LEAVE_TYPES_DELETE,
      PERMISSIONS.HOLIDAYS_VIEW,
      PERMISSIONS.HOLIDAYS_CREATE,
      PERMISSIONS.HOLIDAYS_EDIT,
      PERMISSIONS.HOLIDAYS_DELETE,
    ],
  },
  {
    name: "Employee",
    description:
      "A normal member of the staff. No extra permission is needed: everybody always sees their own tasks, meetings, attendance and leaves.",
    permissions: [],
  },
];

// Find the template that carries a name, whatever the letter case is.
// The migration of the old shared roles uses it: a role that was called
// "Manager" before keeps the permissions of a manager afterwards.
export function findRoleTemplate(name: string) {
  const wanted = String(name).trim().toLowerCase();

  return ROLE_TEMPLATES.find(
    (template) => template.name.toLowerCase() === wanted
  );
}
