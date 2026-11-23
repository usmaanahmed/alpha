import type { Request, Response } from "express";
import * as service from "./employeeBulk.service.js";

export async function bulkDeleteEmployees(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.bulkDeleteEmployees(actor, request.body.ids);
  return response.status(200).json({
    success: true,
    message: result.message,
    data: result.data,
  });
}

export async function bulkChangeStatus(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.bulkChangeStatus(actor, request.body.ids, request.body.status);
  return response.status(200).json({
    success: true,
    message: result.message,
    data: result.data,
  });
}
