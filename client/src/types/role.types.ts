// A role belongs to ONE organization. The organization writes its own roles
// and ticks what each one of them may do, so the "Manager" of one company and
// the "Manager" of another one are two different roles.
//
// permissions is the array of the ticked boxes, for example
// ["employees.view", "tasks.assign"].
export interface Role {
  _id: string;
  organization: string;
  name: string;
  description: string;
  permissions: string[];
  status: "active" | "inactive";
  // How many employees carry this role right now. The server counts it, and
  // the table shows it: a role that somebody uses cannot be deleted.
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

// One checkbox of the permission grid.
export interface PermissionItem {
  key: string;
  label: string;
  description: string;
}

// One block of the grid: a module and the actions it offers.
// The server sends this list (GET /api/roles/permissions), so the grid can
// never show a permission the server does not know.
export interface PermissionGroup {
  key: string;
  label: string;
  items: PermissionItem[];
}

// One of the roles a brand new organization starts with. Only the SaaS owner
// reads these, on its read-only "Default roles" page.
export interface RoleTemplate {
  name: string;
  description: string;
  permissions: string[];
}
