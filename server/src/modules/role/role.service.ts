// Apply role rules here, without reading requests or sending HTTP responses.
import * as roleRepository from "./role.repository.js";
import { PERMISSION_GROUPS, isKnownPermission } from "../../config/permissions.js";
import { ROLE_TEMPLATES } from "../../config/roleTemplates.js";
import type { RoleInput, RoleResult, PermissionResult } from "./role.types.js";

export function getPermissionCatalog() {
  return PERMISSION_GROUPS;
}

export function getRoleTemplates() {
  return ROLE_TEMPLATES;
}

export async function getAllRoles(organizationId: string) {
  const roles = await roleRepository.findAllRoles(organizationId);
  const rolesWithCount = [];

  for (const role of roles) {
    const employeeCount = await roleRepository.countRoleEmployees(
      organizationId,
      String(role._id)
    );

    // Copy all existing fields and add the count used by the role table.
    const roleWithCount = Object.assign({}, role, { employeeCount: employeeCount });
    rolesWithCount.push(roleWithCount);
  }

  return rolesWithCount;
}

export async function getActiveRoles(organizationId: string) {
  return roleRepository.findActiveRoles(organizationId);
}

export async function createRole(
  organizationId: string,
  input: RoleInput,
  employeePermissions: string[] | null
): Promise<RoleResult> {
  const existingRole = await roleRepository.findRoleByName(organizationId, input.name);

  if (existingRole) {
    return {
      status: "invalid",
      message: "Your organization already has a role with this name",
    };
  }

  const permissions = cleanPermissions(input.permissions, employeePermissions);

  if (permissions.message) {
    return { status: "forbidden", message: permissions.message };
  }

  const role = await roleRepository.insertRole(organizationId, input, permissions.list);

  return { status: "success", message: "Role created successfully", role: role };
}

export async function updateRole(
  organizationId: string,
  roleId: string,
  input: RoleInput,
  employeePermissions: string[] | null
): Promise<RoleResult> {
  const role = await roleRepository.findRoleById(organizationId, roleId);

  if (!role) {
    return { status: "not_found", message: "Role not found" };
  }

  const roleWithSameName = await roleRepository.findRoleByName(organizationId, input.name);

  // Keeping this role's own name is allowed. A different role blocks the change.
  if (roleWithSameName) {
    const existingRoleId = String(roleWithSameName._id);
    const currentRoleId = String(role._id);

    if (existingRoleId !== currentRoleId) {
      return {
        status: "invalid",
        message: "Your organization already has a role with this name",
      };
    }
  }

  const permissions = cleanPermissions(input.permissions, employeePermissions);

  if (permissions.message) {
    return { status: "forbidden", message: permissions.message };
  }

  let description = input.description;

  if (!description) {
    description = "";
  }

  role.name = input.name;
  role.description = description;
  role.permissions = permissions.list;
  role.status = input.status;
  await roleRepository.saveRole(role);

  return { status: "success", message: "Role updated successfully", role: role };
}

export async function deleteRole(
  organizationId: string,
  roleId: string
): Promise<RoleResult> {
  const role = await roleRepository.findRoleById(organizationId, roleId);

  if (!role) {
    return { status: "not_found", message: "Role not found" };
  }

  const currentRoleId = String(role._id);
  const employeeCount = await roleRepository.countRoleEmployees(organizationId, currentRoleId);

  // A used role must stay so employee records do not lose their role.
  if (employeeCount > 0) {
    return {
      status: "invalid",
      message:
        "This role is used by " +
        employeeCount +
        " employee(s). Make it inactive instead of deleting it.",
    };
  }

  await roleRepository.removeRole(currentRoleId);
  return { status: "success", message: "Role deleted successfully" };
}

// Both create and update use these same permission rules.
function cleanPermissions(
  requestedPermissions: string[],
  employeePermissions: string[] | null
): PermissionResult {
  const permissions: string[] = [];

  for (const permission of requestedPermissions) {
    if (!isKnownPermission(permission)) {
      continue;
    }

    if (permissions.includes(permission)) {
      continue;
    }

    permissions.push(permission);
  }

  // null represents the organization account, which can grant any known permission.
  if (employeePermissions === null) {
    return { list: permissions, message: "" };
  }

  // Employees cannot grant rights they do not have. Otherwise they could
  // create a stronger role and use it to give themselves more access.
  const missingPermissions: string[] = [];

  for (const permission of permissions) {
    if (!employeePermissions.includes(permission)) {
      missingPermissions.push(permission);
    }
  }

  if (missingPermissions.length > 0) {
    return {
      list: [],
      message:
        "You can only give a permission you have yourself. Ask your organization for: " +
        missingPermissions.join(", "),
    };
  }

  return { list: permissions, message: "" };
}
