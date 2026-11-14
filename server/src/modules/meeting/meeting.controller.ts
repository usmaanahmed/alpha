import type { Request, Response } from "express";
import * as service from "./meeting.service.js";
import { getLoggedInEmployee } from "../../utils/meetingAccess.util.js";

export async function getAssignableEmployees(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const result = await service.getAssignableEmployees(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getAllMeetings(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.getAllMeetings(actor);
  const statusCode = 200;
  return response.status(statusCode).json({
    success: result.status === "success",
    data: result.data,
  });
}

export async function getOneMeeting(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.getOneMeeting(actor, ids);
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

export async function createMeeting(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const result = await service.createMeeting(actor, request.body);
  let statusCode = 201;
  if (result.status === "invalid") {
    statusCode = 400;
  }
  if (result.status === "conflict") {
    statusCode = 409;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function updateMeeting(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.updateMeeting(actor, request.body, ids);
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
  if (result.status === "conflict") {
    statusCode = 409;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function rescheduleMeeting(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.rescheduleMeeting(actor, request.body, ids);
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
  if (result.status === "conflict") {
    statusCode = 409;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function changeMeetingStatus(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.changeMeetingStatus(actor, request.body, ids);
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

export async function respondToMeeting(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.respondToMeeting(actor, request.body, ids);
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

export async function saveMeetingNotes(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.saveMeetingNotes(actor, request.body, ids);
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

export async function deleteMeeting(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: await getLoggedInEmployee(request),
  };
  const ids = {
    id: String(request.params.id),
  };
  const result = await service.deleteMeeting(actor, ids);
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
