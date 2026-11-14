import express from "express";
import { login, logout, getMyProfile } from "./auth.controller.js";
import { loginSchema } from "./auth.validator.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireLogin } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", validateBody(loginSchema), login);

router.post("/logout", logout);

router.get("/me", requireLogin, getMyProfile);

export default router;
