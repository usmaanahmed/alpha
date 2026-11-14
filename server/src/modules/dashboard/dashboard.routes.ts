import express from "express";
import { getDashboardStats, getTaskProgress, getDepartmentTasks } from "./dashboard.controller.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule } from "../../middlewares/permission.middleware.js";
import { MODULES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// These numbers cover the whole organization, so they need the permission
// "dashboard.view". An employee without it still has its own dashboard, which
// is built from its own tasks and needs nothing special.
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.DASHBOARD));

router.get("/stats", requirePermission(PERMISSIONS.DASHBOARD_VIEW), getDashboardStats);

// The bars of one stretch of time, split by task status, for the bar chart.
router.get("/task-progress", requirePermission(PERMISSIONS.DASHBOARD_VIEW), getTaskProgress);

// The same tasks cut by department instead of by date.
router.get("/department-tasks", requirePermission(PERMISSIONS.DASHBOARD_VIEW), getDepartmentTasks);

export default router;
