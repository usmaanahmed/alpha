// Controllers read the request, call the service, and send the HTTP response.
import type { Request, Response } from "express";
import * as roleService from "./role.service.js";
import { getLoggedInEmployee } from "../../utils/currentUser.util.js";

// POST /api/roles
export async function createRole(request: Request, response: Response) {
  // Always use the logged-in organization, never an id from the request body.
  const organizationId = String(request.user?.organizationId);
  const employee = await getLoggedInEmployee(request);
  let employeePermissions: string[] | null = null;

  if (employee) {
    employeePermissions = employee.permissions;
  }

  const result = await roleService.createRole(
    organizationId,
    request.body,
    employeePermissions
  );

  if (result.status === "forbidden") {
    return response.status(403).json({
      success: false,
      message: result.message,
    });
  }

  if (result.status !== "success") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(201).json({
    success: true,
    message: result.message,
    data: result.role,
  });
}

// GET /api/roles
export async function getAllRoles(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const roles = await roleService.getAllRoles(organizationId);

  return response.status(200).json({
    success: true,
    data: roles,
  });
}

// GET /api/roles/active
export async function getActiveRoles(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const roles = await roleService.getActiveRoles(organizationId);

  return response.status(200).json({
    success: true,
    data: roles,
  });
}

// PUT /api/roles/:id
export async function updateRole(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const roleId = String(request.params.id);
  const employee = await getLoggedInEmployee(request);
  let employeePermissions: string[] | null = null;

  if (employee) {
    employeePermissions = employee.permissions;
  }

  const result = await roleService.updateRole(
    organizationId,
    roleId,
    request.body,
    employeePermissions
  );

  // A missing role returns 404; a blocked change returns 400.
  if (result.status === "not_found") {
    return response.status(404).json({
      success: false,
      message: result.message,
    });
  }

  if (result.status === "invalid") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  if (result.status === "forbidden") {
    return response.status(403).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(200).json({
    success: true,
    message: result.message,
    data: result.role,
  });
}

// DELETE /api/roles/:id
export async function deleteRole(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const roleId = String(request.params.id);
  const result = await roleService.deleteRole(
    organizationId,
    roleId
  );

  if (result.status === "not_found") {
    return response.status(404).json({
      success: false,
      message: result.message,
    });
  }

  if (result.status === "invalid") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(200).json({
    success: true,
    message: result.message,
  });
}

// GET /api/roles/permissions
export async function getPermissionCatalog(request: Request, response: Response) {
  return response.status(200).json({
    success: true,
    data: roleService.getPermissionCatalog(),
  });
}

// GET /api/roles/templates
export async function getRoleTemplates(request: Request, response: Response) {
  return response.status(200).json({
    success: true,
    data: roleService.getRoleTemplates(),
  });
}
