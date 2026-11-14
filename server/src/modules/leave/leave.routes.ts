import express from "express";
import {
  getAllLeaveRequests,
  getMyLeaveBalance,
  createLeaveRequest,
  getLeaveRequestContext,
  getLeavePolicySettings,
  updateLeavePolicySettings,
  recommendLeaveRequest,
  reviewLeaveRequest,
  cancelLeaveRequest,
} from "./leave.controller.js";
import {
  leaveRequestSchema,
  leaveReviewSchema,
  leaveRecommendSchema,
  leavePolicySchema,
} from "./leave.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule } from "../../middlewares/permission.middleware.js";
import { MODULES } from "../../config/modules.js";
import { uploadLeaveDocuments } from "../../middlewares/upload.middleware.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// The organization and every employee use these routes. Asking for a leave,
// reading my own days and taking my own request back are always mine to do,
// so only the "review" line asks for a permission.
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.LEAVES));

// The fixed addresses must stay above the ones with "/:id" in them,
// otherwise "policy" would be read as the id of a leave request.
router.get("/my-balance", getMyLeaveBalance);

// The two numbers the warnings on the approval screen are measured against.
// Reading them is open to everybody who can open a leave page, because they
// are shown next to the warnings they explain. Changing them asks for the
// same permission as changing a leave type: it is the same job.
router.get("/policy", getLeavePolicySettings);

router.put("/policy", requirePermission(PERMISSIONS.LEAVE_TYPES_EDIT), validateBody(leavePolicySchema), updateLeavePolicySettings);

// My own requests, the requests of the people reporting to me, or every
// request of the organization: the controller builds the right filter from
// "leaves.view_all" and "leaves.approve".
router.get("/", getAllLeaveRequests);

// Asking for days off. The form carries its supporting documents together
// with the dates, so it is a multipart form: uploadLeaveDocuments reads the
// files and puts the rest of the fields in req.body, and only then does
// validateBody have something to check.
//
// Which files are really allowed depends on the leave type, and that is not
// known here yet, so the controller does that second check itself.
router.post("/", uploadLeaveDocuments, validateBody(leaveRequestSchema), createLeaveRequest);

// Who else is away in these same days, and what this employee has on their
// plate then. The controller checks that the person asking is really one of
// the people deciding about this request.
router.get("/:id/context", validateIdParam, getLeaveRequestContext);

// The first level of the workflow: the team lead writes what it thinks about
// the request of one of its own members.
//
// There is no permission line here on purpose. Being a team lead is not a
// permission, it is the employee the organization put at the head of a team,
// so the controller asks the team list instead.
router.patch("/:id/recommend", validateIdParam, validateBody(leaveRecommendSchema), recommendLeaveRequest);

// Saying yes or no to somebody else's request. The controller then checks the
// request itself: never my own one, and only when I may read the whole
// organization.
router.patch("/:id/review", requirePermission(PERMISSIONS.LEAVES_APPROVE), validateIdParam, validateBody(leaveReviewSchema), reviewLeaveRequest);

router.patch("/:id/cancel", validateIdParam, cancelLeaveRequest);

export default router;
