import { Organization } from "../organization/organization.model.js";
import { Employee } from "../employee/employee.model.js";
import type { RoleDocument } from "../role/role.types.js";

export async function findOrganization(organizationId: string) {
  return Organization.findById(organizationId);
}

export async function findEmployee(employeeId: string | null) {
  return Employee.findById(employeeId);
}

export async function findEmployeeProfile(employeeId: string) {
  // populate replaces ids with the fields needed for the profile.
  return Employee.findById(employeeId)
    .populate<{
    department: {
      name: string;
    } | null;
  }>("department", "name")
    .populate<{ role: RoleDocument | null }>("role", "name permissions status");
}
