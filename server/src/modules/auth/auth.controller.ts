import type { Request, Response } from "express";
import * as authService from "./auth.service.js";
import { setAuthCookie, clearAuthCookie } from "../../utils/cookie.util.js";

export async function login(request: Request, response: Response) {
  const result = await authService.login(request.body);
  let statusCode = 200;
  if (result.status === "unauthorized") {
    statusCode = 401;
  }
  if (result.status === "forbidden") {
    statusCode = 403;
  }
  if (result.status === "not_found") {
    statusCode = 404;
  }
  // Only successful login sets the HTTP-only authentication cookie.
  if (result.status === "success" && result.token) {
    setAuthCookie(response, result.token);
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}

export async function getMyProfile(request: Request, response: Response) {
  const result = await authService.getMyProfile(request.user?.userId);
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

export async function logout(request: Request, response: Response) {
  clearAuthCookie(response);
  return response.status(200).json({
    success: true,
    message: "Logout successful",
  });
}
