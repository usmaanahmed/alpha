import express from "express";
import {
  createTeam,
  getAllTeams,
  getMyTeams,
  getTeamCandidates,
  updateTeam,
  updateTeamMembers,
  deleteTeam,
} from "./team.controller.js";
import { teamSchema, teamMembersSchema } from "./team.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import {
  requireLogin,
  requireEmployee,
  requireOrganizationOrEmployee,
} from "../../middlewares/auth.middleware.js";
import { requirePermission, requireModule } from "../../middlewares/permission.middleware.js";
import { MODULES } from "../../config/modules.js";
import { PERMISSIONS } from "../../config/permissions.js";

const router = express.Router();

// Everybody here must at least be logged in. Who may do what is written
// on each line below, because this module is shared: whoever may build the
// teams builds them, and a team lead manages the people of its own team.
router.use(requireLogin);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.TEAMS));

// "/my-teams" must stay above "/:id".
// Only an employee has a team, so the organization account never asks it.
// This one needs no permission: it is my own team.
router.get("/my-teams", requireEmployee, getMyTeams);

// Everything below belongs to one organization.
router.use(requireOrganizationOrEmployee);

router.get("/", requirePermission(PERMISSIONS.TEAMS_VIEW), getAllTeams);

router.post("/", requirePermission(PERMISSIONS.TEAMS_CREATE), validateBody(teamSchema), createTeam);

router.put("/:id", requirePermission(PERMISSIONS.TEAMS_EDIT), validateIdParam, validateBody(teamSchema), updateTeam);

router.delete("/:id", requirePermission(PERMISSIONS.TEAMS_DELETE), validateIdParam, deleteTeam);

// These last two are the shared ones: whoever may edit the teams uses them,
// and so does the lead of that one team, who has no permission at all and is
// still allowed to choose their own people. That is why there is no
// requirePermission here: the controller looks at the team itself and
// answers "are you its lead?".
router.get("/:id/candidates", validateIdParam, getTeamCandidates);

router.patch("/:id/members", validateIdParam, validateBody(teamMembersSchema), updateTeamMembers);

export default router;
