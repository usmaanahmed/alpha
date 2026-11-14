import type { Request, Response } from "express";
import * as service from "./employee.service.js";
import { getLoggedInEmployee } from "../../utils/currentUser.util.js";

export async function createEmployee(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.createEmployee(actor, request.body, request.file);
  let statusCode = 201;
  if (result.status === "invalid") {
    statusCode = 400;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getAllEmployees(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.getAllEmployees(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getOneEmployee(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getOneEmployee(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getEmployeeAttendance(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const options = {
    year: request.query.year,
    month: request.query.month,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getEmployeeAttendance(actor, options, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getEmployeeLeaves(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getEmployeeLeaves(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getEmployeeLeaveBalance(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const options = {
    year: request.query.year,
    month: request.query.month,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getEmployeeLeaveBalance(actor, options, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function updateEmployee(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateEmployee(actor, request.body, ids, request.file);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  if (result.status === "invalid") {
    statusCode = 400;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function changeEmployeePassword(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.changeEmployeePassword(actor, request.body, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}

export async function deleteEmployee(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.deleteEmployee(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  if (result.status === "invalid") {
    statusCode = 400;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}
