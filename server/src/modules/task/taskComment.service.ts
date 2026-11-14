import * as repository from "./taskComment.repository.js";
import type { ServiceActor, UploadedFile } from "../../types/service.types.js";
import type { TaskCommentIds, TaskCommentInput } from "./task.types.js";
import mongoose from "mongoose";
import type { AttachmentData } from "../../types/attachment.schema.js";
import {
  canManageTask,
  findTaskICanSee,
  findTaskICanRead,
  whoGaveTheTask,
} from "../../utils/taskAccess.util.js";
import { notifyTaskComment } from "../../utils/notification.util.js";
import { deleteTaskFile } from "../../middlewares/upload.middleware.js";

// The discussion under one task.
//
// Everybody who can open the task can read the comments and write one:
// the organization, the manager who gave the task, the employee who has
// it, and the people who held it before. Who exactly that is, is decided
// in one single place, findTaskICanSee, so the rule can never say two
// different things in two different routes.
// GET /api/tasks/:id/comments
// Oldest first, like a chat: the last message is at the bottom.
export async function getTaskComments(actor: ServiceActor, ids: TaskCommentIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  // The reading door: whoever may open the task may read the discussion under
  // it. Writing a comment is a different question and asks findTaskICanSee.
  const found = await findTaskICanRead(organizationId, String(ids.id), me);
  if (!found.task) {
    let outcome = "invalid";
    if (found.status === 403) {
      outcome = "forbidden";
    }
    if (found.status === 404) {
      outcome = "not_found";
    }
    return {
      status: outcome,
      message: found.message,
    };
  }
  // lean() gives plain objects, so we can add the "canDelete" flag to
  // every comment before sending them.
  const comments = await repository.findComments(found.task);
  const myEmployeeId = me ? String(me.employee._id) : null;
  // The owner of the task can delete any message of the discussion.
  const iOwnThisTask = canManageTask(found.task, me);
  const commentsWithFlags = comments.map((comment) => {
    const iWroteIt = myEmployeeId !== null &&
      String(comment.author?._id || comment.author) === myEmployeeId;
    return {
      ...comment,
      canDelete: iOwnThisTask || iWroteIt,
    };
  });
  return {
    status: "success",
    data: commentsWithFlags,
  };
}

// POST /api/tasks/:id/comments
// Write one message, with or without documents.
//
// This request is a multipart form and not JSON, because a file cannot
// travel inside JSON. uploadTaskFiles saved the files on the disk before
// the controller passes the message text and file information here.
export async function createTaskComment(
  actor: ServiceActor,
  input: TaskCommentInput,
  ids: TaskCommentIds,
  uploadedFiles: UploadedFile[],
) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const files = uploadedFiles;
  const found = await findTaskICanSee(organizationId, String(ids.id), me);
  if (!found.task) {
    // The files are already on the disk and nobody will ever use them.
    files.forEach((file) => deleteTaskFile(file.filename));
    let outcome = "invalid";
    if (found.status === 403) {
      outcome = "forbidden";
    }
    if (found.status === 404) {
      outcome = "not_found";
    }
    return {
      status: outcome,
      message: found.message,
    };
  }
  const message = (input.message || "").trim();
  // A comment with no text and no file is nothing at all.
  if (message === "" && files.length === 0) {
    return {
      status: "invalid",
      message: "Write a message or attach a file",
    };
  }
  // The type is written here on purpose: it tells TypeScript that
  // "employee" and "organization" are the only two words allowed in
  // uploadedByType, exactly like the schema says.
  const attachments: AttachmentData[] = files.map((file) => ({
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedBy: me ? me.employee._id : null,
    uploadedByType: me ? "employee" : "organization",
    uploadedAt: new Date(),
  }));
  const comment = await repository.insertComment(found.task, organizationId, me, message, attachments);
  // The two people on the other side of this conversation: the one doing the
  // work and the one waiting for it. notifyTaskComment leaves out whoever of
  // them just wrote the message.
  await notifyTaskComment({
    organizationId: organizationId,
    taskTitle: found.task.title,
    assigneeEmployeeId: String(found.task.assignedTo),
    assignerEmployeeId: whoGaveTheTask(found.task),
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Comment added",
    data: comment,
  };
}

// DELETE /api/tasks/:id/comments/:commentId
// You can always delete your own message, and the owner of the task can
// delete any message of the discussion.
export async function deleteTaskComment(actor: ServiceActor, ids: TaskCommentIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  // validateIdParam only checked the id of the task, so we check this
  // second id ourselves before asking the database anything.
  if (!mongoose.isValidObjectId(ids.commentId)) {
    return {
      status: "invalid",
      message: "Invalid comment id",
    };
  }
  const found = await findTaskICanSee(organizationId, String(ids.id), me);
  if (!found.task) {
    let outcome = "invalid";
    if (found.status === 403) {
      outcome = "forbidden";
    }
    if (found.status === 404) {
      outcome = "not_found";
    }
    return {
      status: outcome,
      message: found.message,
    };
  }
  const comment = await repository.findComment(ids, found.task);
  if (!comment) {
    return {
      status: "not_found",
      message: "Comment not found",
    };
  }
  const iWroteIt = me !== null && String(comment.author) === String(me.employee._id);
  if (!iWroteIt && !canManageTask(found.task, me)) {
    return {
      status: "forbidden",
      message: "You can delete only your own comments",
    };
  }
  // The message goes away, so its documents go away with it.
  comment.attachments.forEach((file) => deleteTaskFile(file.fileName));
  await repository.removeTaskComment(comment);
  return {
    status: "success",
    message: "Comment deleted",
  };
}
