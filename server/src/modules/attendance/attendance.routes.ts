import express from "express";
import {
  getMyTodayAttendance,
  checkIn,
  checkOut,
  getMyAttendance,
  getAttendanceOfDay,
  getAttendanceOfMonth,
  markAttendance,
} from "./attendance.controller.js";
import { markAttendanceSchema } from "./attendance.validator.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule, requireFeature } from "../../middlewares/permission.middleware.js";
import { MODULES, FEATURES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// The organization and every employee use these routes.
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.ATTENDANCE));

// The routes of the logged in employee itself. My own day is always mine, so
// these four ask for no permission at all.
router.get("/me/today", getMyTodayAttendance);

router.get("/me", getMyAttendance);

router.post("/check-in", requireFeature(FEATURES.ATTENDANCE_SELF_CHECKIN), checkIn);

router.post("/check-out", requireFeature(FEATURES.ATTENDANCE_SELF_CHECKIN), checkOut);

// The routes that read the whole organization, or fix a day by hand.
// "/month" is written before "/" only for the eye: express matches on the
// full path, so the order of these two does not matter.
router.get("/month", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_ALL), getAttendanceOfMonth);

router.get("/", requirePermission(PERMISSIONS.ATTENDANCE_VIEW_ALL), getAttendanceOfDay);

router.post("/mark", requirePermission(PERMISSIONS.ATTENDANCE_EDIT), validateBody(markAttendanceSchema), markAttendance);

export default router;
