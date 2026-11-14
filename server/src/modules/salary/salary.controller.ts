// Controllers read request values and send HTTP responses.
import type { Request, Response } from "express";
import * as salaryService from "./salary.service.js";
import type { SalaryListOptions } from "./salary.types.js";

// GET /api/salaries
export async function getAllSalaries(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const options: SalaryListOptions = {
    search: String(request.query.search || "").trim(),
    salaryType: String(request.query.salaryType || "").trim(),
    sortBy: String(request.query.sortBy || "createdAt"),
    sortOrder: String(request.query.sortOrder || "desc"),
  };
  const salaries = await salaryService.getAllSalaries(organizationId, options);

  return response.status(200).json({ success: true, data: salaries });
}

// POST /api/salaries
export async function createSalary(request: Request, response: Response) {
  // The organization comes from login, never from form data.
  const organizationId = String(request.user?.organizationId);
  const result = await salaryService.createSalary(organizationId, request.body);

  if (result.status === "invalid") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(201).json({
    success: true,
    message: result.message,
    data: result.salary,
  });
}

// GET /api/salaries/:id
export async function getSalary(request: Request, response: Response) {
  // The organization comes from login, never from form data.
  const organizationId = String(request.user?.organizationId);
  const salaryId = String(request.params.id);
  const result = await salaryService.getSalary(organizationId, salaryId);

  if (result.status === "not_found") {
    return response.status(404).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(200).json({
    success: true,
    data: result.salary,
  });
}

// PUT /api/salaries/:id
export async function updateSalary(request: Request, response: Response) {
  // The organization comes from login, never from form data.
  const organizationId = String(request.user?.organizationId);
  const salaryId = String(request.params.id);
  const result = await salaryService.updateSalary(organizationId, salaryId, request.body);

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
    data: result.salary,
  });
}

// DELETE /api/salaries/:id
export async function deleteSalary(request: Request, response: Response) {
  // The organization comes from login, never from form data.
  const organizationId = String(request.user?.organizationId);
  const salaryId = String(request.params.id);
  const result = await salaryService.deleteSalary(organizationId, salaryId);

  if (result.status === "not_found") {
    return response.status(404).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(200).json({
    success: true,
    message: result.message,
  });
}
