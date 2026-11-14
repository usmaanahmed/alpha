// Role database queries belong here.
import { Role } from "./role.model.js";
import { Employee } from "../employee/employee.model.js";
import type { RoleDocument, RoleInput } from "./role.types.js";

export async function findAllRoles(organizationId: string) {
  // -1 shows newest roles first. lean() returns plain data without save().
  return Role.find({ organization: organizationId }).sort({ createdAt: -1 }).lean();
}

export async function findActiveRoles(organizationId: string) {
  // 1 sorts names from A to Z for the employee dropdown.
  return Role.find({
    organization: organizationId,
    status: "active",
  }).sort({ name: 1 });
}

export async function findRoleById(organizationId: string, roleId: string) {
  // The organization prevents access to another workspace's role.
  return Role.findOne({ _id: roleId, organization: organizationId });
}

export async function findRoleByName(organizationId: string, name: string) {
  return Role.findOne({ organization: organizationId, name: name });
}

export async function insertRole(
  organizationId: string,
  input: RoleInput,
  permissions: string[]
) {
  let description = input.description;

  if (!description) {
    description = "";
  }

  return Role.create({
    organization: organizationId,
    name: input.name,
    description: description,
    permissions: permissions,
    status: input.status,
  });
}

export async function saveRole(role: RoleDocument) {
  return role.save();
}

export async function countRoleEmployees(organizationId: string, roleId: string) {
  return Employee.countDocuments({ organization: organizationId, role: roleId });
}

export async function removeRole(roleId: string) {
  await Role.deleteOne({ _id: roleId });
}
