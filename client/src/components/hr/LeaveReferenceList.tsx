import { useState } from "react";
import {
  ClipboardList,
  CalendarClock,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { TaskDetailDialog } from "@/components/tasks/TaskDetailDialog";
import { MeetingDetailDialog } from "@/components/meetings/MeetingDetailDialog";
import { useTask } from "@/hooks/useTasks";
import { useMeeting } from "@/hooks/useMeetings";
import { formatDay, formatTime } from "@/lib/date";
import type { LeaveReference } from "@/types/hr.types";

// The work an approver pointed at while answering a leave request.
//
// Every line opens the real thing: a task opens the task dialog of the tasks
// page, a meeting opens the meeting dialog of the meetings page. Neither of
// them is a copy, and the meeting one is opened in its reading mode, because
// this screen is about being reminded of a commitment and not about moving
// it.
//
// The title and the date come from the leave request itself, not from the
// task or the meeting, so a line still reads correctly after the meeting has
// been deleted. Pressing it then simply says the meeting is gone.
export function LeaveReferenceList(props: { references: LeaveReference[] }) {
  // What is open right now. Only one of the two is ever set.
  const [taskId, setTaskId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  const taskQuery = useTask(taskId);
  const meetingQuery = useMeeting(meetingId);

  if (props.references.length === 0) {
    return null;
  }

  return (
    <>
      <ul className="flex min-w-0 flex-col gap-1.5">
        {props.references.map((reference) => {
          const isTask = reference.kind === "task";
          const isOpening =
            (isTask && taskId === reference.refId && taskQuery.isLoading) ||
            (!isTask && meetingId === reference.refId && meetingQuery.isLoading);

          return (
            <li key={reference.kind + reference.refId}>
              <button
                type="button"
                disabled={isOpening}
                onClick={() =>
                  isTask
                    ? setTaskId(reference.refId)
                    : setMeetingId(reference.refId)
                }
                title={isTask ? "Open this task" : "Open this meeting"}
                className="flex w-full min-w-0 cursor-pointer flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/60"
              >
                {isTask ? (
                  <ClipboardList className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                ) : (
                  <CalendarClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}

                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {reference.title}
                </span>

                {reference.note ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    {reference.note === "in_person"
                      ? "in person"
                      : reference.note}
                  </span>
                ) : null}

                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {describeWhen(reference)}
                </span>

                {isOpening ? (
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <TaskDetailDialog
        task={taskQuery.data || null}
        onClose={() => setTaskId(null)}
      />

      {/* readOnly: this is a reminder of a commitment, not the meetings page,
          so nobody edits, reschedules or answers a meeting from here. */}
      <MeetingDetailDialog
        meeting={meetingQuery.data || null}
        readOnly
        onClose={() => setMeetingId(null)}
      />
    </>
  );
}

// "12 Aug 2026" for a task that is due that day, "13 Aug 2026 at 10:00" for a
// meeting, which is a real moment and not just a day.
function describeWhen(reference: LeaveReference) {
  if (!reference.at) {
    return "no date";
  }

  if (reference.kind === "meeting") {
    return formatDay(reference.at) + " at " + formatTime(reference.at);
  }

  return formatDay(reference.at);
}
