import type { EmployeeDocument } from "../modules/employee/employee.types.js";
import type { Request } from "express";
import { Employee } from "../modules/employee/employee.model.js";
import { isTeamLeadEmployee } from "./team.util.js";
import {
  getRequestSwitches,
  filterPermissionsByModules,
} from "./moduleAccess.util.js";

// What we know about the person who sent the request.
//
// permissions is the array of the role of this employee, for example
// ["tasks.assign", "leaves.approve"]. Every "may I do this?" question of the
// whole server is answered from that array, with the can() helper below.
//
// isTeamLead is not a permission and never will be: it is not something the
// organization ticks on a role, it is the employee it put at the head of a
// team. That is why it still comes from the team list.
export interface LoggedInEmployee {
  employee: EmployeeDocument;
  permissions: string[];
  isTeamLead: boolean;
}

// Read the employee of the logged in user together with the permissions of
// its role.
//
// For an organization account this returns null, because an organization is
// not an employee. Every controller uses the same rule:
//   me === null  ->  the organization account, it may do everything
//   me !== null  ->  an employee, and can(me, "...") decides the rest
export async function getLoggedInEmployee(
  req: Request
): Promise<LoggedInEmployee | null> {
  if (req.user?.role !== "employee") {
    return null;
  }

  const employee = await Employee.findOne({
    _id: req.user.employeeId,
    organization: req.user.organizationId,
  }).populate("role", "name permissions status");

  if (!employee) {
    return null;
  }

  // The permissions of a module the SaaS owner switched off for this
  // organization are dropped here, so every can(me, "...") of every
  // controller answers "no" for a module that is not part of the plan. The
  // login profile drops exactly the same ones, so the buttons React draws
  // and the answers the server gives can never disagree.
  const switches = await getRequestSwitches(req);

  return {
    employee: employee,
    permissions: filterPermissionsByModules(
      readRolePermissions(employee.role),
      switches
    ),
    isTeamLead: await isTeamLeadEmployee(
      String(req.user.organizationId),
      String(employee._id)
    ),
  };
}

// May this person do that thing?
//
// The organization account (me === null) always answers yes: it owns the
// whole tenant. An employee answers yes only when the permission is ticked
// on its role.
export function can(me: LoggedInEmployee | null, permission: string) {
  if (me === null) {
    return true;
  }

  return me.permissions.includes(permission);
}

// The permissions written on a role document.
//
// It is used on a populated role ("the role of this employee") and also on a
// role we read ourselves ("the role of the person I want to give a task to").
// An inactive role gives nothing: the organization switched it off, so the
// people who still carry it lose their extra rights until it is back.
export function readRolePermissions(role: any): string[] {
  if (!role || role.status === "inactive") {
    return [];
  }

  return role.permissions || [];
}
