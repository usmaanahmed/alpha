import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.js";
import { AUTH_COOKIE_NAME } from "../utils/cookie.util.js";

// This middleware runs before a protected route.
// It reads the token from the cookie and checks if it is valid.
export function requireLogin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies[AUTH_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "You are not logged in",
    });
  }

  try {
    const decoded = verifyToken(token);
    // Save the user info on the request so the controller can use it.
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Your session is not valid, please login again",
    });
  }
}

// This middleware allows only the saas owner to continue.
export function requireSaasOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "saas_owner") {
    return res.status(403).json({
      success: false,
      message: "Only the SaaS owner can do this",
    });
  }

  next();
}

// This middleware allows only a logged in organization to continue.
// It also makes sure the organization id really exists in the token,
// because every organization route uses that id to read only its own data.
export function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "organization") {
    return res.status(403).json({
      success: false,
      message: "Only an organization can do this",
    });
  }

  if (!req.user.organizationId) {
    return res.status(403).json({
      success: false,
      message: "Your account is not linked to an organization",
    });
  }

  next();
}

// This middleware allows only a logged in employee (or manager) to continue.
export function requireEmployee(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "employee") {
    return res.status(403).json({
      success: false,
      message: "Only an employee can do this",
    });
  }

  if (!req.user.organizationId || !req.user.employeeId) {
    return res.status(403).json({
      success: false,
      message: "Your account is not linked to an employee",
    });
  }

  next();
}

// The task routes are shared: an organization, a manager and an employee
// all use them, and the controller decides what each one is allowed to do.
// The saas owner is not part of it, because tasks belong to one organization.
export function requireOrganizationOrEmployee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const role = req.user?.role;

  if (role !== "organization" && role !== "employee") {
    return res.status(403).json({
      success: false,
      message: "Only an organization or an employee can do this",
    });
  }

  if (!req.user?.organizationId) {
    return res.status(403).json({
      success: false,
      message: "Your account is not linked to an organization",
    });
  }

  next();
}
