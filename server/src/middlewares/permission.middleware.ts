import type { Request, Response, NextFunction } from "express";
import { getLoggedInEmployee, can } from "../utils/currentUser.util.js";
import {
  getRequestSwitches,
  isModuleOn,
  isFeatureOn,
} from "../utils/moduleAccess.util.js";
import { moduleOfPermission } from "../config/modules.js";

// This middleware stands in front of a route and asks two questions:
//
//   1. "is this module switched on for that organization at all?"
//      The SaaS owner decides that one, and it beats everything below it:
//      a module that was sold to nobody is closed for the whole tenant,
//      the organization account included.
//
//   2. "does the person who sent this request have that permission?"
//
// It is written for the routes of one organization, so it must run AFTER
// requireOrganizationOrEmployee, which is the one that makes sure there is
// an organization id in the token.
//
// The organization account is the owner of its tenant, so it walks through
// every permission check. It does NOT walk through the module check: it
// bought a plan like everybody else.
//
// Hiding a button in React is only for comfort: this is the real lock, and
// it runs on every single request.
export function requirePermission(permission: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    // 1. The module of this permission has to be on.
    const moduleKey = moduleOfPermission(permission);

    if (moduleKey) {
      const switches = await getRequestSwitches(req);

      if (!isModuleOn(switches, moduleKey)) {
        return res.status(403).json({
          success: false,
          message: "This module is switched off for your organization",
        });
      }
    }

    // 2. The organization account may do everything inside its organization.
    if (req.user?.role === "organization") {
      return next();
    }

    if (req.user?.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "You cannot do this",
      });
    }

    const me = await getLoggedInEmployee(req);

    if (!me || !can(me, permission)) {
      return res.status(403).json({
        success: false,
        message: "Your role does not allow you to do this",
      });
    }

    next();
  };
}

// The module check on its own, without a permission behind it.
//
// It is put at the top of a route file, right under requireLogin, and it
// closes EVERY route of that module in one line: the list, the create, the
// "my own" page that needs no permission at all. That last one is why this
// middleware has to exist: "My tasks" is open to every employee, so there is
// no permission to drop and only the module key can close it.
export function requireModule(moduleKey: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    // The SaaS owner is not inside any organization, so no module was ever
    // switched off for them.
    if (req.user?.role === "saas_owner") {
      return next();
    }

    const switches = await getRequestSwitches(req);

    if (!isModuleOn(switches, moduleKey)) {
      return res.status(403).json({
        success: false,
        message: "This module is switched off for your organization",
      });
    }

    next();
  };
}

// The same for one card, one panel or one extra page inside a module.
//
// A feature is off when its own switch is off, or when the module around it
// is off. Both are answered by isFeatureOn, so this middleware only has to
// ask once.
export function requireFeature(featureKey: string) {
  return async function (req: Request, res: Response, next: NextFunction) {
    if (req.user?.role === "saas_owner") {
      return next();
    }

    const switches = await getRequestSwitches(req);

    if (!isFeatureOn(switches, featureKey)) {
      return res.status(403).json({
        success: false,
        message: "This feature is switched off for your organization",
      });
    }

    next();
  };
}
