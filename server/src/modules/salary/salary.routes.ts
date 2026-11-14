import express from "express";
import {
  createSalary,
  getAllSalaries,
  getSalary,
  updateSalary,
  deleteSalary,
} from "./salary.controller.js";
import { salarySchema } from "./salary.validator.js";
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

// A salary belongs to one organization, so everybody here must be logged in
// and must belong to a workspace. What each person may do then comes from the
// permissions of their role: the organization account carries all of them.
router.use(requireLogin);
router.use(requireOrganizationOrEmployee);
// The organization must have the salaries module enabled.
router.use(requireModule(MODULES.SALARIES));

// The list. It also answers the search, the filter and the sort, which are
// written on the address (see the comment on getAllSalaries).
router.get(
  "/",
  requirePermission(PERMISSIONS.SALARIES_VIEW),
  getAllSalaries
);

router.post(
  "/",
  requirePermission(PERMISSIONS.SALARIES_CREATE),
  validateBody(salarySchema),
  createSalary
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.SALARIES_VIEW),
  validateIdParam,
  getSalary
);

router.put(
  "/:id",
  requirePermission(PERMISSIONS.SALARIES_EDIT),
  validateIdParam,
  validateBody(salarySchema),
  updateSalary
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.SALARIES_DELETE),
  validateIdParam,
  deleteSalary
);

export default router;
