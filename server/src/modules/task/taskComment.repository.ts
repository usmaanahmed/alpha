import type { CommentAuthor, TaskCommentIds } from "./task.types.js";
import type { TaskDocument } from "./task.model.js";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import { TaskComment } from "./taskComment.model.js";
import type { AttachmentData } from "../../types/attachment.schema.js";
import type { TaskCommentDocument } from "./taskComment.model.js";

export async function findComments(task: TaskDocument) {
  return TaskComment.find({ task: task._id })
    // "photo" comes with the name, because the discussion draws the small
    // round picture of the writer in front of every message.
    .populate<{ author: CommentAuthor | null }>("author", "name email photo")
    // The files sent inside a message keep only the id of the person who
    // sent them, and the list under the message shows that person too.
    .populate("attachments.uploadedBy", "name email photo")
    .sort({ createdAt: 1 })
    .lean();
}

export async function insertComment(
  task: TaskDocument,
  organizationId: string,
  me: LoggedInEmployee | null,
  message: string,
  attachments: AttachmentData[],
) {
  return TaskComment.create({
    task: task._id,
    organization: organizationId,
    author: me ? me.employee._id : null,
    authorType: me ? "employee" : "organization",
    message: message,
    attachments: attachments,
  });
}

export async function findComment(ids: TaskCommentIds, task: TaskDocument) {
  return TaskComment.findOne({
    _id: ids.commentId,
    task: task._id,
  });
}

export async function removeTaskComment(comment: TaskCommentDocument) {
  return TaskComment.deleteOne({ _id: comment._id });
}
