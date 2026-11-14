import type { Request, Response } from "express";
import * as service from "./cheque.service.js";
import { getLoggedInEmployee } from "../../utils/currentUser.util.js";

export async function getAllCheques(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.getAllCheques(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function createCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.createCheque(actor, request.body);
  const statusCode = 201;
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function updateCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateCheque(actor, request.body, ids);
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

export async function deleteCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.deleteCheque(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}

export async function changeChequeStatus(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.changeChequeStatus(actor, request.body, ids);
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

export async function depositCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.depositCheque(actor, request.body, ids);
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

export async function clearCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.clearCheque(actor, request.body, ids);
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

export async function bounceCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.bounceCheque(actor, request.body, ids);
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

export async function cancelCheque(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.cancelCheque(actor, request.body, ids);
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

export async function uploadChequeScan(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.uploadChequeScan(actor, ids, request.file);
  let statusCode = 201;
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

export async function deleteChequeScan(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.deleteChequeScan(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}
