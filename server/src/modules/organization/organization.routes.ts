import express from "express";
import {
  createOrganization,
  getAllOrganizations,
  getOneOrganization,
  updateOrganization,
  changeOrganizationPassword,
  getModuleCatalog,
  getOrganizationModules,
  updateOrganizationModules,
  deleteOrganization,
} from "./organization.controller.js";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  changeOrganizationPasswordSchema,
  organizationModulesSchema,
} from "./organization.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireSaasOwner } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Every route below needs a logged in saas owner.
router.use(requireLogin, requireSaasOwner);

router.post("/", validateBody(createOrganizationSchema), createOrganization);

router.get("/", getAllOrganizations);

// The switch board of the whole app: what a module is, and what can be
// switched inside it. It is a fixed word, so it must stay ABOVE "/:id",
// otherwise express would read "modules" as an organization id.
router.get("/modules", getModuleCatalog);

router.get("/:id", validateIdParam, getOneOrganization);

router.put("/:id", validateIdParam, validateBody(updateOrganizationSchema), updateOrganization);

router.patch("/:id/password", validateIdParam, validateBody(changeOrganizationPasswordSchema), changeOrganizationPassword);

// What is switched on and off for ONE organization.
router.get("/:id/modules", validateIdParam, getOrganizationModules);

router.put("/:id/modules", validateIdParam, validateBody(organizationModulesSchema), updateOrganizationModules);

router.delete("/:id", validateIdParam, deleteOrganization);

export default router;
