import express from "express";
import {
  getAllLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
} from "./leaveType.controller.js";
import { leaveTypeSchema } from "./leaveType.validator.js";
import {
  validateBody,
  validateIdParam,
} from "../../middlewares/validate.middleware.js";
import {
  requireLogin,
  requireOrganizationOrEmployee,
} from "../../middlewares/auth.middleware.js";
import {
  requirePermission,
  requireModule,
} from "../../middlewares/permission.middleware.js";
import { MODULES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// All routes require a logged-in organization account or employee.
router.use(requireLogin, requireOrganizationOrEmployee);

// The organization must have the leave-types module enabled.
router.use(requireModule(MODULES.LEAVE_TYPES));

// Employees need this list for the leave form. The controller checks
// whether they may also see inactive types.
router.get("/", getAllLeaveTypes);

// Permission and validation checks run before the controller.
router.post(
  "/",
  requirePermission(PERMISSIONS.LEAVE_TYPES_CREATE),
  validateBody(leaveTypeSchema),
  createLeaveType
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.LEAVE_TYPES_EDIT),
  validateIdParam,
  validateBody(leaveTypeSchema),
  updateLeaveType
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.LEAVE_TYPES_DELETE),
  validateIdParam,
  deleteLeaveType
);

export default router;
