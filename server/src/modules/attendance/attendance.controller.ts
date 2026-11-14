import type { Request, Response } from "express";
import * as service from "./attendance.service.js";
import { getLoggedInEmployee } from "../../utils/currentUser.util.js";

export async function getMyTodayAttendance(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.getMyTodayAttendance(actor);
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

export async function checkIn(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.checkIn(actor);
  let statusCode = 201;
  if (result.status === "forbidden") {
    statusCode = 403;
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

export async function checkOut(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.checkOut(actor);
  let statusCode = 200;
  if (result.status === "forbidden") {
    statusCode = 403;
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

export async function getMyAttendance(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const options = {
    year: request.query.year,
    month: request.query.month,
    date: request.query.date,
  };
  const result = await service.getMyAttendance(actor, options);
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

export async function getAttendanceOfDay(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const options = {
    year: request.query.year,
    month: request.query.month,
    date: request.query.date,
  };
  const result = await service.getAttendanceOfDay(actor, options);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getAttendanceOfMonth(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const options = {
    year: request.query.year,
    month: request.query.month,
    date: request.query.date,
  };
  const result = await service.getAttendanceOfMonth(actor, options);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function markAttendance(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.markAttendance(actor, request.body);
  let statusCode = 200;
  if (result.status === "invalid") {
    statusCode = 400;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}
