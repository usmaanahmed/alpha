import type { Request, Response } from "express";
import * as service from "./organization.service.js";

export async function createOrganization(request: Request, response: Response) {
  const result = await service.createOrganization(request.body);
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

export async function getAllOrganizations(request: Request, response: Response) {
  const result = await service.getAllOrganizations();
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getOneOrganization(request: Request, response: Response) {
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getOneOrganization(ids);
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

export async function updateOrganization(request: Request, response: Response) {
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateOrganization(request.body, ids);
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

export async function changeOrganizationPassword(request: Request, response: Response) {
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.changeOrganizationPassword(request.body, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}

export async function getModuleCatalog(request: Request, response: Response) {
  const result = await service.getModuleCatalog();
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getOrganizationModules(request: Request, response: Response) {
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getOrganizationModules(ids);
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

export async function updateOrganizationModules(request: Request, response: Response) {
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateOrganizationModules(request.body, ids);
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

export async function deleteOrganization(request: Request, response: Response) {
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.deleteOrganization(ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}
