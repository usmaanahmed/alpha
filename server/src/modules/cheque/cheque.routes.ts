import express from "express";
import {
  getAllCheques,
  createCheque,
  updateCheque,
  deleteCheque,
  changeChequeStatus,
  depositCheque,
  clearCheque,
  bounceCheque,
  cancelCheque,
  uploadChequeScan,
  deleteChequeScan,
} from "./cheque.controller.js";
import {
  chequeSchema,
  chequeStatusSchema,
  chequeDepositSchema,
  chequeClearanceSchema,
  chequeBounceSchema,
  chequeCancelSchema,
} from "./cheque.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule } from "../../middlewares/permission.middleware.js";
import { MODULES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { uploadChequeScan as readChequeScan } from "../../middlewares/upload.middleware.js";

const router = express.Router();

// The cheque module used to belong to the organization account alone. Now the
// organization can hand it to somebody it trusts, for example an accountant,
// by ticking the cheque permissions on their role.
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.CHEQUES));

// The whole list. The React side builds the dashboard and the reminders
// from it, so there is no separate dashboard route.
router.get("/", requirePermission(PERMISSIONS.CHEQUES_VIEW), getAllCheques);

router.post("/", requirePermission(PERMISSIONS.CHEQUES_CREATE), validateBody(chequeSchema), createCheque);

router.put("/:id", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, validateBody(chequeSchema), updateCheque);

router.delete("/:id", requirePermission(PERMISSIONS.CHEQUES_DELETE), validateIdParam, deleteCheque);

// The status workflow. The simple moves share one route, the four heavy
// steps have one route each because they carry extra papers. Moving a cheque
// from one status to the next is a change of the cheque, so all of them ask
// for the same "edit" permission.
router.patch("/:id/status", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, validateBody(chequeStatusSchema), changeChequeStatus);

router.patch("/:id/deposit", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, validateBody(chequeDepositSchema), depositCheque);

router.patch("/:id/clear", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, validateBody(chequeClearanceSchema), clearCheque);

router.patch("/:id/bounce", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, validateBody(chequeBounceSchema), bounceCheque);

router.patch("/:id/cancel", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, validateBody(chequeCancelSchema), cancelCheque);

// The scan of the paper cheque. readChequeScan must run first: it reads the
// file from the form, and only then the controller can save it. The
// permission is asked before that, so a request that is not allowed never
// leaves a file behind on the disk.
router.post("/:id/scan", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, readChequeScan, uploadChequeScan);

router.delete("/:id/scan", requirePermission(PERMISSIONS.CHEQUES_EDIT), validateIdParam, deleteChequeScan);

export default router;
