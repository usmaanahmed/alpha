import express from "express";
import {
  getPermissionCatalog,
  getRoleTemplates,
  getAllRoles,
  getActiveRoles,
  createRole,
  updateRole,
  deleteRole,
} from "./role.controller.js";
import { roleSchema } from "./role.validator.js";
import {
  validateBody,
  validateIdParam,
} from "../../middlewares/validate.middleware.js";
import {
  requireLogin,
  requireSaasOwner,
  requireOrganizationOrEmployee,
} from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/permission.middleware.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// Everybody below must be logged in.
router.use(requireLogin);

// The permission catalog is shared by all logged-in users.
router.get("/permissions", getPermissionCatalog);

// The roles a new organization starts with. Only the SaaS owner looks at them.
router.get("/templates", requireSaasOwner, getRoleTemplates);

// Everything below belongs to one organization: the organization account
// itself, or one of its employees whose role allows it.
router.use(requireOrganizationOrEmployee);

// The dropdown of the employee form. Every employee of the organization may
// read it: it is only the list of the role names of their own company.
router.get("/active", getActiveRoles);

// Route checks run in order before the controller.
router.get(
  "/",
  requirePermission(PERMISSIONS.ROLES_VIEW),
  getAllRoles
);

router.post(
  "/",
  requirePermission(PERMISSIONS.ROLES_CREATE),
  validateBody(roleSchema),
  createRole
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_EDIT),
  validateIdParam,
  validateBody(roleSchema),
  updateRole
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.ROLES_DELETE),
  validateIdParam,
  deleteRole
);

export default router;
