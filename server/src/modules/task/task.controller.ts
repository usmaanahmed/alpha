import type { Request, Response } from "express";
import * as service from "./task.service.js";
import { getLoggedInEmployee } from "../../utils/taskAccess.util.js";
import { getUploadedFiles } from "../../middlewares/upload.middleware.js";

export async function getAssignableEmployees(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.getAssignableEmployees(actor);
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

export async function getAllTasks(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const options = {
    view: request.query.view,
  };
  const result = await service.getAllTasks(actor, options);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getOneTask(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.getOneTask(actor, ids);
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

export async function createTask(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.createTask(actor, request.body);
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

export async function updateTask(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.updateTask(actor, request.body, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
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

export async function updateTaskStatus(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.updateTaskStatus(actor, request.body, ids);
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

export async function reassignTask(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.reassignTask(actor, request.body, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
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

export async function addTaskAttachments(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.addTaskAttachments(actor, ids, getUploadedFiles(request));
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

export async function deleteTaskAttachment(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.deleteTaskAttachment(actor, ids);
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

export async function deleteTask(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
    attachmentId: String(request.params.attachmentId),
  };
  const result = await service.deleteTask(actor, ids);
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
  });
}
