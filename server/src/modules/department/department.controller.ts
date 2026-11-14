// Controllers read the request, call the service, and send the HTTP response.
import type { Request, Response } from "express";
import * as departmentService from "./department.service.js";

// POST /api/departments
export async function createDepartment(request: Request, response: Response) {
  // Always use the logged-in organization, never an id from the request body.
  const organizationId = String(request.user?.organizationId);
  const result = await departmentService.createDepartment(organizationId, request.body);

  if (result.status !== "success") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(201).json({
    success: true,
    message: result.message,
    data: result.department,
  });
}

// GET /api/departments
export async function getAllDepartments(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const departments = await departmentService.getAllDepartments(organizationId);

  return response.status(200).json({
    success: true,
    data: departments,
  });
}

// GET /api/departments/active
export async function getActiveDepartments(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const departments = await departmentService.getActiveDepartments(organizationId);

  return response.status(200).json({
    success: true,
    data: departments,
  });
}

// PUT /api/departments/:id
export async function updateDepartment(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const departmentId = String(request.params.id);
  const result = await departmentService.updateDepartment(
    organizationId,
    departmentId,
    request.body
  );

  // A missing department returns 404; a blocked change returns 400.
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
    data: result.department,
  });
}

// DELETE /api/departments/:id
export async function deleteDepartment(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const departmentId = String(request.params.id);
  const result = await departmentService.deleteDepartment(
    organizationId,
    departmentId
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
