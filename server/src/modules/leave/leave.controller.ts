import type { Request, Response } from "express";
import * as service from "./leave.service.js";
import { getLoggedInEmployee } from "../../utils/currentUser.util.js";
import { getUploadedFiles } from "../../middlewares/upload.middleware.js";

export async function getAllLeaveRequests(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const options = {
    view: request.query.view,
    status: request.query.status,
    year: request.query.year,
  };
  const result = await service.getAllLeaveRequests(actor, options);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getMyLeaveBalance(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const options = {
    view: request.query.view,
    status: request.query.status,
    year: request.query.year,
  };
  const result = await service.getMyLeaveBalance(actor, options);
  let statusCode = 200;
  if (result.status === "forbidden") {
    statusCode = 403;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function createLeaveRequest(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.createLeaveRequest(actor, request.body, getUploadedFiles(request));
  let statusCode = 201;
  if (result.status === "invalid") {
    statusCode = 400;
  }
  if (result.status === "forbidden") {
    statusCode = 403;
  }
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getLeaveRequestContext(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getLeaveRequestContext(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  if (result.status === "forbidden") {
    statusCode = 403;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getLeavePolicySettings(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.getLeavePolicySettings(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function updateLeavePolicySettings(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.updateLeavePolicySettings(actor, request.body);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function recommendLeaveRequest(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.recommendLeaveRequest(actor, request.body, ids);
  let statusCode = 200;
  if (result.status === "forbidden") {
    statusCode = 403;
  }
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

export async function reviewLeaveRequest(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.reviewLeaveRequest(actor, request.body, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  if (result.status === "invalid") {
    statusCode = 400;
  }
  if (result.status === "forbidden") {
    statusCode = 403;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function cancelLeaveRequest(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.cancelLeaveRequest(actor, ids);
  let statusCode = 200;
  if (result.status === "forbidden") {
    statusCode = 403;
  }
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
