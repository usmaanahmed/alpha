import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getOneEmployee,
  getEmployeeAttendance,
  getEmployeeLeaves,
  getEmployeeLeaveBalance,
  updateEmployee,
  changeEmployeePassword,
  deleteEmployee,
} from "./employee.controller.js";
import {
  downloadTemplate,
  exportEmployees,
  importEmployees,
} from "./employeeExcel.controller.js";
import { getEmployeeActivity } from "./employeeActivity.controller.js";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  changeEmployeePasswordSchema,
} from "./employee.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule, requireFeature } from "../../middlewares/permission.middleware.js";
import { MODULES, FEATURES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { uploadEmployeePhoto, uploadEmployeeSheet } from "../../middlewares/upload.middleware.js";

const router = express.Router();

// The organization account and its employees both come here, and the
// permission written on every line decides who really passes.
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.EMPLOYEES));

router.get("/", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), getAllEmployees);

// The Excel files. These three must stay above the "/:id" routes, otherwise
// Express would read the word "template" as the id of an employee.
router.get("/template", requirePermission(PERMISSIONS.EMPLOYEES_CREATE), downloadTemplate);

router.get("/export", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), exportEmployees);

router.post("/import", requirePermission(PERMISSIONS.EMPLOYEES_CREATE), uploadEmployeeSheet, importEmployees);

// The read routes of one employee, used by the employee detail page.
router.get("/:id", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validateIdParam, getOneEmployee);

router.get("/:id/attendance", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validateIdParam, getEmployeeAttendance);

router.get("/:id/leaves", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validateIdParam, getEmployeeLeaves);

router.get("/:id/leave-balance", requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validateIdParam, getEmployeeLeaveBalance);

// What this person is busy with today: their tasks, their meetings, whether
// they are in, and what they last did. It is read by the accordion of the
// employee table, one row at a time.
//
// It reads from four modules but it is still the employees module asking
// "what is my person doing", so it needs the same permission as the rest of
// this file. The dashboard routes are built the same way: one permission for
// an answer that touches several modules.
router.get("/:id/activity", requireFeature(FEATURES.EMPLOYEES_ACTIVITY), requirePermission(PERMISSIONS.EMPLOYEES_VIEW), validateIdParam, getEmployeeActivity);

// The two forms below carry the employee picture, so they are sent as
// multipart instead of JSON. uploadEmployeePhoto must run first: it reads
// the file and puts all the normal text fields into req.body, and only
// after that validateBody has something to check.
//
// The permission is asked before the file is read, so a request that is not
// allowed never leaves a picture behind on the disk.
router.post("/", requirePermission(PERMISSIONS.EMPLOYEES_CREATE), uploadEmployeePhoto, validateBody(createEmployeeSchema), createEmployee);

router.put("/:id", requirePermission(PERMISSIONS.EMPLOYEES_EDIT), validateIdParam, uploadEmployeePhoto, validateBody(updateEmployeeSchema), updateEmployee);

// Giving somebody a new login password is part of editing that person.
router.patch("/:id/password", requirePermission(PERMISSIONS.EMPLOYEES_EDIT), validateIdParam, validateBody(changeEmployeePasswordSchema), changeEmployeePassword);

router.delete("/:id", requirePermission(PERMISSIONS.EMPLOYEES_DELETE), validateIdParam, deleteEmployee);

export default router;
