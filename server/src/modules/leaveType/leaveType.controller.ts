// Controllers read the request, call the service, and send the HTTP response.
import type { Request, Response } from "express";
import * as leaveTypeService from "./leaveType.service.js";
import { getLoggedInEmployee, can } from "../../utils/currentUser.util.js";
import { PERMISSIONS } from "../../config/permissions.js";

// POST /api/leave-types
export async function createLeaveType(request: Request, response: Response) {
  // Always use the logged-in organization, never an id from the request body.
  const organizationId = String(request.user?.organizationId);
  const result = await leaveTypeService.createLeaveType(organizationId, request.body);

  if (result.status !== "success") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(201).json({
    success: true,
    message: result.message,
    data: result.leaveType,
  });
}

// GET /api/leave-types
export async function getAllLeaveTypes(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const employee = await getLoggedInEmployee(request);
  // The organization account can view all types. Employees need this permission.
  const canViewInactiveTypes = can(employee, PERMISSIONS.LEAVE_TYPES_VIEW);
  const leaveTypes = await leaveTypeService.getAllLeaveTypes(
    organizationId,
    canViewInactiveTypes
  );

  return response.status(200).json({
    success: true,
    data: leaveTypes,
  });
}

// PUT /api/leave-types/:id
export async function updateLeaveType(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const leaveTypeId = String(request.params.id);
  const result = await leaveTypeService.updateLeaveType(
    organizationId,
    leaveTypeId,
    request.body
  );

  // A missing leave type returns 404; a blocked change returns 400.
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
    data: result.leaveType,
  });
}

// DELETE /api/leave-types/:id
export async function deleteLeaveType(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const leaveTypeId = String(request.params.id);
  const result = await leaveTypeService.deleteLeaveType(
    organizationId,
    leaveTypeId
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
