import express from "express";
import {
  getAssignableEmployees,
  getAllMeetings,
  getOneMeeting,
  createMeeting,
  updateMeeting,
  rescheduleMeeting,
  changeMeetingStatus,
  respondToMeeting,
  saveMeetingNotes,
  deleteMeeting,
} from "./meeting.controller.js";
import {
  meetingSchema,
  meetingRescheduleSchema,
  meetingStatusSchema,
  meetingRespondSchema,
  meetingNotesSchema,
} from "./meeting.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule, requireFeature } from "../../middlewares/permission.middleware.js";
import { MODULES, FEATURES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// The organization and every employee use these routes.
//
// Reading, and answering an invitation, need no permission: a meeting I am
// invited to is mine to read and to answer. Everything that touches a meeting
// itself asks for the matching permission, and the controller then checks the
// meeting as well ("did I schedule this one?").
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.MEETINGS));

// "/assignable-employees" must stay above "/:id". It is the invite list of
// the meeting form, so whoever may schedule a meeting reads it.
router.get("/assignable-employees", requirePermission(PERMISSIONS.MEETINGS_CREATE), getAssignableEmployees);

// My meetings, or every meeting for somebody with "meetings.view_all".
router.get("/", getAllMeetings);

// One single meeting, for the screens that know an id but do not hold the
// list. A leave request that references a meeting opens it from here.
router.get("/:id", validateIdParam, getOneMeeting);

router.post("/", requirePermission(PERMISSIONS.MEETINGS_CREATE), validateBody(meetingSchema), createMeeting);

router.put("/:id", requirePermission(PERMISSIONS.MEETINGS_EDIT), validateIdParam, validateBody(meetingSchema), updateMeeting);

router.patch("/:id/reschedule", requireFeature(FEATURES.MEETINGS_RESCHEDULE), requirePermission(PERMISSIONS.MEETINGS_EDIT), validateIdParam, validateBody(meetingRescheduleSchema), rescheduleMeeting);

router.patch("/:id/status", requirePermission(PERMISSIONS.MEETINGS_EDIT), validateIdParam, validateBody(meetingStatusSchema), changeMeetingStatus);

// Saying yes or no to my own invitation. Everybody who is invited may do it,
// so there is no permission on this line.
router.patch("/:id/respond", validateIdParam, validateBody(meetingRespondSchema), respondToMeeting);

router.patch("/:id/notes", requireFeature(FEATURES.MEETINGS_NOTES), requirePermission(PERMISSIONS.MEETINGS_EDIT), validateIdParam, validateBody(meetingNotesSchema), saveMeetingNotes);

router.delete("/:id", requirePermission(PERMISSIONS.MEETINGS_DELETE), validateIdParam, deleteMeeting);

export default router;
