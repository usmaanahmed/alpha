import express from "express";
import {
  getAllHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "./holiday.controller.js";
import { holidaySchema } from "./holiday.validator.js";
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

// The organization must have the holidays module enabled.
router.use(requireModule(MODULES.HOLIDAYS));

// All employees can read holidays. Editing still needs the permissions below.
router.get("/", getAllHolidays);

// Permission and validation checks run before the controller.
router.post(
  "/",
  requirePermission(PERMISSIONS.HOLIDAYS_CREATE),
  validateBody(holidaySchema),
  createHoliday
);

// Update and delete also require a valid MongoDB id in the URL.
router.put(
  "/:id",
  requirePermission(PERMISSIONS.HOLIDAYS_EDIT),
  validateIdParam,
  validateBody(holidaySchema),
  updateHoliday
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.HOLIDAYS_DELETE),
  validateIdParam,
  deleteHoliday
);

export default router;
