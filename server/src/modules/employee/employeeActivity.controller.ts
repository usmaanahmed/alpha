import type { Request, Response } from "express";
import * as service from "./employeeActivity.service.js";

export async function getEmployeeActivity(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getEmployeeActivity(actor, ids);
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
