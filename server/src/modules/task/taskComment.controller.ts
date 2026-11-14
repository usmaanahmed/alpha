import type { Request, Response } from "express";
import * as service from "./taskComment.service.js";
import { getLoggedInEmployee } from "../../utils/taskAccess.util.js";
import { getUploadedFiles } from "../../middlewares/upload.middleware.js";

export async function getTaskComments(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    commentId: String(request.params.commentId),
  };
  const result = await service.getTaskComments(actor, ids);
  let statusCode = 200;
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

export async function createTaskComment(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    commentId: String(request.params.commentId),
  };
  const result = await service.createTaskComment(actor, request.body, ids, getUploadedFiles(request));
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

export async function deleteTaskComment(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    commentId: String(request.params.commentId),
  };
  const result = await service.deleteTaskComment(actor, ids);
  let statusCode = 200;
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
  });
}
