import express from "express";
import {
  getMyNotifications,
  getAllMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notification.controller.js";
import { validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin } from "../../middlewares/auth.middleware.js";
import { requireModule } from "../../middlewares/permission.middleware.js";
import { MODULES } from "../../config/modules.js";

const router = express.Router();

// Every account needs login and access to the notifications module.
// The repository uses the logged-in user id to protect each recipient's data.
router.use(requireLogin);
router.use(requireModule(MODULES.NOTIFICATIONS));

router.get("/", getMyNotifications);

// Recent notifications for the full page.
router.get("/all", getAllMyNotifications);

// Mark all uses a fixed URL. Marking one also checks the MongoDB id.
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", validateIdParam, markNotificationRead);

export default router;
