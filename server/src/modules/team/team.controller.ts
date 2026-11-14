import type { Request, Response } from "express";
import * as service from "./team.service.js";
import { getLoggedInEmployee } from "../../utils/currentUser.util.js";

export async function createTeam(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.createTeam(actor, request.body);
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

export async function getAllTeams(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.getAllTeams(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getMyTeams(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.getMyTeams(actor);
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

export async function getTeamCandidates(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getTeamCandidates(actor, ids);
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

export async function updateTeam(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateTeam(actor, request.body, ids);
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

export async function updateTeamMembers(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateTeamMembers(actor, request.body, ids);
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

export async function deleteTeam(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.deleteTeam(actor, ids);
  let statusCode = 200;
  if (result.status === "not_found") {
    statusCode = 404;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
  });
}
