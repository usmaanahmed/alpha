import express from "express";
import {
  createDepartment,
  getAllDepartments,
  getActiveDepartments,
  updateDepartment,
  deleteDepartment,
} from "./department.controller.js";
import { departmentSchema } from "./department.validator.js";
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

// Every route requires a logged-in organization account or employee.
router.use(requireLogin, requireOrganizationOrEmployee);

// The organization must have the departments module enabled.
router.use(requireModule(MODULES.DEPARTMENTS));

// Dropdowns need active departments even when the employee cannot open
// the department list page. Login and module checks still apply here.
router.get("/active", getActiveDepartments);

// Route checks run from top to bottom before the controller.
router.get(
  "/",
  requirePermission(PERMISSIONS.DEPARTMENTS_VIEW),
  getAllDepartments
);

// Check the permission and form fields before creating a department.
router.post(
  "/",
  requirePermission(PERMISSIONS.DEPARTMENTS_CREATE),
  validateBody(departmentSchema),
  createDepartment
);

// Updates also need a valid MongoDB id in the URL.
router.put(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENTS_EDIT),
  validateIdParam,
  validateBody(departmentSchema),
  updateDepartment
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.DEPARTMENTS_DELETE),
  validateIdParam,
  deleteDepartment
);

export default router;
