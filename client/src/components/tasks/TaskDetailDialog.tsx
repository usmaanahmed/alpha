import { useState } from "react";
import { Loader2, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { TaskAttachmentPicker } from "@/components/tasks/TaskAttachmentPicker";
import { TaskAttachmentList } from "@/components/tasks/TaskAttachmentList";
import { TaskTimeSpent } from "@/components/tasks/TaskTimeSpent";
import { TaskCommentList } from "@/components/tasks/TaskCommentList";
import { TaskCommentForm } from "@/components/tasks/TaskCommentForm";
import { TaskAssignmentTimeline } from "@/components/tasks/TaskAssignmentTimeline";
import {
  useUploadTaskAttachments,
  useDeleteTaskAttachment,
} from "@/hooks/useTasks";
import { useTaskComments, useDeleteTaskComment } from "@/hooks/useTaskComments";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { Task, TaskAttachment } from "@/types/task.types";
import type { TaskComment } from "@/types/comment.types";
import {
  getTaskAttachments,
  getStatusLabel,
  getPriorityLabel,
  formatDate,
} from "@/types/task.types";

// Everything about ONE task on one screen: what it is, its documents, and
// the discussion under it.
//
// The task comes from the list of the page, not from its own request, so
// after every change the list is reloaded and this dialog shows the new
// task by itself.
export function TaskDetailDialog(props: { task: Task | null; onClose: () => void }) {
  const { user, hasFeature } = useAuth();

  // The documents waiting to be sent, and the two things the user can
  // confirm before it really happens.
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<TaskAttachment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<TaskComment | null>(null);

  const uploadAttachments = useUploadTaskAttachments();
  const deleteAttachment = useDeleteTaskAttachment();
  const deleteComment = useDeleteTaskComment();

  // The comments are asked for only while a task is open.
  // Two blocks of this dialog are sections the SaaS owner can switch off.
  // When the comments are off the list is not even asked for: the server
  // would answer 403, and a red error under a block that should not be
  // there at all is worse than no block.
  const hasComments = hasFeature(FEATURES.TASKS_COMMENTS);
  const hasAttachments = hasFeature(FEATURES.TASKS_ATTACHMENTS);

  const commentsQuery = useTaskComments(
    props.task && hasComments ? props.task._id : null
  );

  const task = props.task;

  if (!task) {
    // Nothing is open, so there is nothing to draw at all.
    return null;
  }

  const attachments = getTaskAttachments(task);

  // Who can remove one document of the task:
  // - the owner of the task (the organization, or the manager who created
  //   it), that is exactly what canEdit says,
  // - and the person who sent that file, even when the task is not theirs.
  // The server checks the same two rules again, this only decides if the
  // little bin is drawn.
  function canDeleteAttachment(attachment: TaskAttachment) {
    if (task!.canEdit) {
      return true;
    }

    return (
      user?.employeeId !== null &&
      attachment.uploadedBy?._id === user?.employeeId
    );
  }

  function sendChosenFiles() {
    uploadAttachments.mutate(
      { taskId: task!._id, files: filesToUpload },
      { onSuccess: () => setFilesToUpload([]) }
    );
  }

  function confirmDeleteAttachment() {
    if (!attachmentToDelete) {
      return;
    }

    deleteAttachment.mutate(
      { taskId: task!._id, attachmentId: attachmentToDelete._id },
      { onSuccess: () => setAttachmentToDelete(null) }
    );
  }

  function confirmDeleteComment() {
    if (!commentToDelete) {
      return;
    }

    deleteComment.mutate(
      { taskId: task!._id, commentId: commentToDelete._id },
      { onSuccess: () => setCommentToDelete(null) }
    );
  }

  return (
    <>
      <Dialog open={true} onOpenChange={props.onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{task.title}</DialogTitle>
            {/* The dialog description is a paragraph, and a picture cannot
                live inside one, so the person is drawn under it instead. */}
            <DialogDescription>Who has to do this task</DialogDescription>
            <div className="mt-1 text-sm">
              <EmployeeAvatar
                name={task.assignedTo?.name || "Nobody"}
                photo={task.assignedTo?.photo || ""}
                subtitle={task.department?.name}
              />
            </div>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            {/* ----------------------------------------------------------
                What this task is
                ---------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{getStatusLabel(task.status)}</Badge>
                <Badge variant="outline">
                  {getPriorityLabel(task.priority)} priority
                </Badge>
                {task.dueDate ? (
                  <span className="text-xs text-muted-foreground">
                    Due {formatDate(task.dueDate)}
                  </span>
                ) : null}

                {/* What the task has really cost. A finished task says how
                    long it took in the end, an open one says how much has
                    gone into it so far. */}
                <TaskTimeSpent
                  settledMinutesToday={task.settledMinutesToday}
                  settledMinutesTotal={task.settledMinutesTotal}
                  runningSince={task.runningSince}
                  isDone={task.status === "completed"}
                  className="text-xs text-muted-foreground"
                />
              </div>

              {task.description ? (
                <p className="text-sm whitespace-pre-line">{task.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This task has no description.
                </p>
              )}

              {task.remarks ? (
                <p className="border-l-2 pl-2 text-sm text-muted-foreground italic">
                  {task.remarks}
                </p>
              ) : null}
            </div>

            {/* ----------------------------------------------------------
                The documents of the task
                ---------------------------------------------------------- */}
            {hasAttachments ? (
            <div className="flex flex-col gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Paperclip className="h-4 w-4" />
                Documents
                {attachments.length > 0 ? (
                  <Badge variant="secondary">{attachments.length}</Badge>
                ) : null}
              </h3>

              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No document on this task yet.
                </p>
              ) : (
                <TaskAttachmentList
                  attachments={attachments}
                  canDelete={canDeleteAttachment}
                  onDelete={setAttachmentToDelete}
                  isDeleting={deleteAttachment.isPending}
                />
              )}

              {/* Only somebody who is part of this task may add to it. An
                  approver who opened it from a leave request reads it and
                  nothing more, so they are not shown a button that would only
                  come back with an error. */}
              {task.canComment ? (
                <TaskAttachmentPicker
                  files={filesToUpload}
                  onChange={setFilesToUpload}
                  disabled={uploadAttachments.isPending}
                />
              ) : null}

              {/* The upload button appears only when there is really
                  something to upload. */}
              {filesToUpload.length > 0 ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={uploadAttachments.isPending}
                    onClick={sendChosenFiles}
                  >
                    {uploadAttachments.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Upload {filesToUpload.length}{" "}
                    {filesToUpload.length === 1 ? "file" : "files"}
                  </Button>
                </div>
              ) : null}
            </div>
            ) : null}

            {/* ----------------------------------------------------------
                The discussion
                ---------------------------------------------------------- */}
            {hasComments ? (
            <div className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Comments</h3>

              <TaskCommentList
                comments={commentsQuery.data || []}
                isLoading={commentsQuery.isLoading}
                onDelete={setCommentToDelete}
                isDeleting={deleteComment.isPending}
              />

              <div className="border-t pt-3">
                {task.canComment ? (
                  <TaskCommentForm taskId={task._id} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You are reading this task, so you cannot write under it.
                  </p>
                )}
              </div>
            </div>
            ) : null}

            {/* ----------------------------------------------------------
                Who had this task, and when
                ---------------------------------------------------------- */}
            <div className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Assignment timeline</h3>
              <TaskAssignmentTimeline task={task} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={attachmentToDelete !== null}
        title="Remove file"
        description={
          'The file "' +
          (attachmentToDelete?.originalName || "") +
          '" will be removed from this task.'
        }
        isPending={deleteAttachment.isPending}
        onConfirm={confirmDeleteAttachment}
        onClose={() => setAttachmentToDelete(null)}
      />

      <ConfirmDialog
        isOpen={commentToDelete !== null}
        title="Delete comment"
        description="The message and the files sent with it will be removed."
        isPending={deleteComment.isPending}
        onConfirm={confirmDeleteComment}
        onClose={() => setCommentToDelete(null)}
      />
    </>
  );
}
