import express from "express";
import {
  getAssignableEmployees,
  getAllTasks,
  getOneTask,
  createTask,
  updateTask,
  updateTaskStatus,
  reassignTask,
  addTaskAttachments,
  deleteTaskAttachment,
  deleteTask,
} from "./task.controller.js";
import { getTaskComments, createTaskComment, deleteTaskComment } from "./taskComment.controller.js";
import { taskSchema, taskStatusSchema, taskReassignSchema, taskCommentSchema } from "./task.validator.js";
import { validateBody, validateIdParam } from "../../middlewares/validate.middleware.js";
import { requireLogin, requireOrganizationOrEmployee } from "../../middlewares/auth.middleware.js";
import { requireModule, requireFeature } from "../../middlewares/permission.middleware.js";
import { MODULES, FEATURES } from "../../config/modules.js";
import { uploadTaskFiles } from "../../middlewares/upload.middleware.js";

const router = express.Router();

// The organization and every employee use these routes.
//
// Most lines below have NO requirePermission, and that is on purpose: a task
// is personal. Everybody always sees their own tasks, moves them to another
// status, writes a comment and reads the documents, whatever their role is.
// The controller looks at the task itself ("is it mine? did I give it?") and
// at the permissions of the role for the rest, because a permission alone
// cannot answer a question about one single task.
router.use(requireLogin, requireOrganizationOrEmployee);

// The SaaS owner sold this module to this organization, or it did not.
// One line here closes EVERY route below it for a workspace that does not
// have the module, the pages that need no permission at all included.
router.use(requireModule(MODULES.TASKS));

// "/assignable-employees" must stay above "/:id".
// canGiveTasks decides here: the permission "tasks.assign", or being the lead
// of a team. A team lead has no permission at all and may still give work to
// their own people, so this check cannot live in a middleware.
router.get("/assignable-employees", getAssignableEmployees);

// My own tasks, or every task of the organization for somebody who carries
// "tasks.view_all". The controller builds the right filter.
router.get("/", getAllTasks);

// One single task, for the screens that know an id but do not hold the list.
// The leave approval screen is the one that needs it: it lists the tasks that
// would stall if a leave is approved, and pressing one of them opens it.
router.get("/:id", validateIdParam, getOneTask);

// Creating, editing and deleting a task are all checked inside the
// controller, against the task itself: canGiveTasks for a new one, and
// canManageTask ("I gave this task and my role still lets me edit tasks")
// for the two others.
router.post("/", validateBody(taskSchema), createTask);

router.put("/:id", validateIdParam, validateBody(taskSchema), updateTask);

router.patch("/:id/status", validateIdParam, validateBody(taskStatusSchema), updateTaskStatus);

router.patch("/:id/reassign", validateIdParam, validateBody(taskReassignSchema), reassignTask);

// The documents of the task itself.
// uploadTaskFiles must run first: it reads the files and only after that
// the controller can write them inside the task.
router.post("/:id/attachments", requireFeature(FEATURES.TASKS_ATTACHMENTS), validateIdParam, uploadTaskFiles, addTaskAttachments);

router.delete("/:id/attachments/:attachmentId", requireFeature(FEATURES.TASKS_ATTACHMENTS), validateIdParam, deleteTaskAttachment);

// The discussion under the task.
// The "new comment" form carries the message and its files together, so
// it is a multipart form: uploadTaskFiles reads the files and puts the
// message in req.body, and only then validateBody has something to check.
router.get("/:id/comments", requireFeature(FEATURES.TASKS_COMMENTS), validateIdParam, getTaskComments);

router.post("/:id/comments", requireFeature(FEATURES.TASKS_COMMENTS), validateIdParam, uploadTaskFiles, validateBody(taskCommentSchema), createTaskComment);

router.delete("/:id/comments/:commentId", requireFeature(FEATURES.TASKS_COMMENTS), validateIdParam, deleteTaskComment);

router.delete("/:id", validateIdParam, deleteTask);

export default router;
