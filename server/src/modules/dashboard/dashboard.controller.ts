import type { Request, Response } from "express";
import * as service from "./dashboard.service.js";

export async function getDashboardStats(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.getDashboardStats(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getTaskProgress(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const options = {
    period: request.query.period,
    year: request.query.year,
    month: request.query.month,
  };
  const result = await service.getTaskProgress(actor, options);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getDepartmentTasks(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const options = {
    period: request.query.period,
    year: request.query.year,
    month: request.query.month,
  };
  const result = await service.getDepartmentTasks(actor, options);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}
