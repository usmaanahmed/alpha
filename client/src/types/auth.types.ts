// The three kinds of accounts that can login.
// A manager also logs in as "employee": "manager" is not a kind of account,
// it is simply a role of the organization with more permissions ticked on it.
export type UserRole = "saas_owner" | "organization" | "employee";

// The logged in user that the server sends back.
//
// permissions is the important one: it is everything this person may do, for
// example ["tasks.assign", "leaves.approve"]. An organization account gets
// the full list, because it owns its whole organization, and an employee gets
// the permissions its organization ticked on its role. The menu, the route
// guard and the buttons are all built from that array — and the server checks
// the very same array again on every request, so hiding a link here is only
// for comfort, never the real protection.
//
// isTeamLead is not a permission at all: it is true when the organization put
// this employee at the head of at least one active team, and it lets that
// person give tasks to the members of their team.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  employeeId: string | null;
  departmentName: string | null;
  roleName: string | null;
  permissions: string[];
  // The modules the SaaS owner switched ON for this organization, for
  // example ["tasks", "meetings", "holidays"].
  //
  // Most of the time nothing here has to be asked: the server already threw
  // the permissions of a switched off module out of the array above, so the
  // menu, the routes and the buttons of that module are gone on their own.
  // This list is for the few links no permission protects — "My Tasks",
  // "My Leaves", the bell — where there is no permission to drop.
  modules: string[];
  // The cards, the panels and the extra pages that are ON, for example
  // ["cheques.reminders", "tasks.kanban"]. A page hides a card when its key
  // is not in this list.
  features: string[];
  isTeamLead: boolean;
  // True when I am in a team at all, as its lead or as one of its members.
  isInTeam: boolean;
  // The file name of the profile picture. Only an employee can have one,
  // so for a saas owner and for an organization it is always empty and the
  // avatar shows the letters of the name instead.
  photo: string;
}

// Every role starts on a different page after the login.
// The login page and the route guard both use this function, so the
// answer is always the same.
export function getHomePath(role: UserRole) {
  if (role === "saas_owner") {
    return "/owner";
  }
  if (role === "organization") {
    return "/organization";
  }
  return "/employee";
}

// Where the module pages of this account live.
//
// The same page is mounted twice, once under /organization and once under
// /employee, because an employee whose role carries the permission opens the
// very same screen the organization uses. So a link INSIDE one of those
// shared pages can never be written by hand: it is built from here, and it
// then points at the copy that belongs to the person who is logged in.
export function getModuleBase(role: UserRole | undefined) {
  return role === "organization" ? "/organization" : "/employee";
}
