import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CalendarCheck,
  MessagesSquare,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { LeaveDayList } from "@/components/hr/LeaveDayList";
import { LeaveDocumentList } from "@/components/hr/LeaveDocumentList";
import { LeaveDecisionSupport } from "@/components/hr/LeaveDecisionSupport";
import { LeaveReferencePicker } from "@/components/hr/LeaveReferencePicker";
import type { ChosenReference } from "@/components/hr/LeaveReferencePicker";
import { leaveReviewSchema } from "@/validators/hr.schema";
import type { LeaveReviewFormValues } from "@/validators/hr.schema";
import { useReviewLeaveRequest, useLeaveContext } from "@/hooks/useLeaves";
import { formatDay, formatTime } from "@/lib/date";
import type { LeaveRequest, LeaveDay, LeaveContext } from "@/types/hr.types";

// Saturday and Sunday. The dates of the HR module are midnight UTC, so the
// day of the week is read in UTC too.
function isWeekendDate(value: string) {
  const weekday = new Date(value).getUTCDay();
  return weekday === 0 || weekday === 6;
}

// The day list as it looks with the weekend switch the approver has chosen
// right now.
//
// The stored list was built the day the employee applied, and there the
// weekends are always taken out. So when the approver says "count the
// weekends", those days have to come BACK into the list, otherwise there
// would be nothing to tick. Turning the switch off again takes them out.
//
// A weekend that is also a public holiday is left exactly as it is: that day
// is decided by the holiday switch of the leave type, not by the approver.
function previewDays(days: LeaveDay[], excludeWeekends: boolean): LeaveDay[] {
  return days.map((day) => {
    if (!isWeekendDate(day.date)) {
      return day;
    }

    if (day.status === "excluded" && day.reason !== "Weekend") {
      return day;
    }

    if (excludeWeekends) {
      return { date: day.date, status: "excluded", reason: "Weekend" };
    }

    return { date: day.date, status: "approved", reason: "" };
  });
}

// The days of a request that a person may still say yes or no to.
//
// A day that a rule already took out is not one of them: the approver cannot
// give a public holiday back as a leave day.
function choosableDates(days: LeaveDay[]) {
  return days
    .filter((day) => day.status !== "excluded")
    .map((day) => day.date.slice(0, 10));
}

// The form the organization, an HR or a manager uses to make the final
// decision on one leave request.
//
// There are three things to choose here, and the dialog shows them in the
// order a person thinks about them:
//
// 1. approve or reject,
// 2. which of the requested days are approved (ticking the day list),
// 3. whether the weekends inside the leave count as leave days.
//
// The number of days is deliberately NOT counted here. The browser cannot
// know which days already have an attendance row, so the real number only
// comes back from the server after saving. The box at the bottom says so.
export function LeaveReviewDialog(props: {
  request: LeaveRequest | null;
  onClose: () => void;
}) {
  const reviewLeaveRequest = useReviewLeaveRequest();

  // Everything around this one request: the other leaves of the same days,
  // and the work of this employee inside them. Asked only while the dialog is
  // really open, which is what the null does.
  const contextQuery = useLeaveContext(props.request?._id || null);

  // The days the approver has ticked right now, as texts like "2026-08-03".
  const [chosenDates, setChosenDates] = useState<string[]>([]);
  // Do the Saturdays and Sundays inside the leave count as leave days?
  const [excludeWeekends, setExcludeWeekends] = useState(true);
  // The tasks and meetings the approver is pointing at with this answer.
  const [references, setReferences] = useState<ChosenReference[]>([]);

  const form = useForm<LeaveReviewFormValues>({
    resolver: zodResolver(leaveReviewSchema),
    defaultValues: { status: "approved", reviewRemarks: "" },
  });

  // Every time another request is opened the dialog starts fresh: approve,
  // every choosable day ticked, and the weekend rule the request carries.
  useEffect(() => {
    if (props.request) {
      form.reset({ status: "approved", reviewRemarks: "" });
      setChosenDates(
        choosableDates(
          previewDays(props.request.leaveDays, props.request.excludeWeekends)
        )
      );
      setExcludeWeekends(props.request.excludeWeekends);
      setReferences([]);
    }
  }, [props.request, form]);

  const answer = form.watch("status");

  // The day list the approver is looking at, which follows the weekend switch.
  const shownDays = props.request
    ? previewDays(props.request.leaveDays, excludeWeekends)
    : [];

  // The notes the team lead of this employee has written. The whole point of
  // the multi level workflow is that the person deciding reads them first, so
  // they sit above the buttons and not in some other dialog.
  const teamLeadNotes = (props.request?.approvalHistory || []).filter(
    (entry) =>
      entry.action === "recommended" || entry.action === "not_recommended"
  );

  // Ticking one day of the list takes it in or out of the answer.
  function toggleDate(dayText: string) {
    setChosenDates((current) =>
      current.includes(dayText)
        ? current.filter((date) => date !== dayText)
        : current.concat(dayText)
    );
  }

  function onSubmit(values: LeaveReviewFormValues) {
    if (!props.request) {
      return;
    }

    const allDates = choosableDates(
      previewDays(props.request.leaveDays, excludeWeekends)
    );
    // Ticking everything is the plain "approve the whole request" answer, so
    // we send nothing and let the server read it that way.
    const isEverything = chosenDates.length === allDates.length;

    reviewLeaveRequest.mutate(
      {
        id: props.request._id,
        values: {
          status: values.status,
          reviewRemarks: values.reviewRemarks,
          // A rejection says no to everything, so the two extra choices mean
          // nothing there and are left out.
          approvedDates:
            values.status === "rejected" || isEverything
              ? undefined
              : chosenDates,
          excludeWeekends:
            values.status === "rejected" ? undefined : excludeWeekends,
          // Sent for both answers: an approval reminds the employee of what
          // still needs them, a rejection says what they are needed FOR.
          references: references.length > 0 ? references : undefined,
        },
      },
      { onSuccess: () => props.onClose() }
    );
  }

  const request = props.request;

  return (
    <Dialog open={request !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Answer leave request</DialogTitle>
          <DialogDescription>
            Approving takes the approved days from the balance of the employee.
            Rejecting leaves the balance as it is.
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="min-w-0 rounded-xl border bg-muted/40 p-4">
            <EmployeeAvatar
              name={request.employee.name}
              photo={request.employee.photo}
              subtitle={request.department?.name}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-background px-2 py-1 font-medium">
                {request.leaveType.name}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-1 tabular-nums">
                {formatDay(request.fromDate)}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                {formatDay(request.toDate)}
              </span>

              <span className="rounded-full bg-background px-2 py-1 font-medium tabular-nums">
                {request.requestedDays +
                  (request.requestedDays === 1 ? " day asked" : " days asked")}
              </span>
            </div>

            <p className="mt-3 border-t pt-3 text-sm">{request.reason}</p>
          </div>
        ) : null}

        {/* The papers the employee handed in. They sit here, above the
            buttons, because they are part of what the decision is made on. */}
        {request ? <LeaveDocumentList documents={request.documents} /> : null}

        {/* Who else is away in these days, and what this person has on their
            plate then. It is read only when this dialog is open, because it
            is the most expensive answer of the whole module. */}
        {request ? (
          <LeaveDecisionSupport
            context={contextQuery.data}
            isLoading={contextQuery.isLoading}
            employeeName={request.employee.name}
          />
        ) : null}

        {/* What the team lead thinks. It is only a recommendation, so it is
            drawn as a quote and never preselects any button. */}
        {teamLeadNotes.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <MessagesSquare className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              What the team lead says
            </p>

            {teamLeadNotes.map((note, index) => (
              <div key={index} className="text-sm">
                <p className="flex items-center gap-1.5 font-medium">
                  {note.action === "recommended" ? (
                    <ThumbsUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ThumbsDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  )}
                  {note.actorName +
                    (note.action === "recommended"
                      ? " recommends this leave"
                      : " does not recommend this leave")}
                </p>

                {note.note ? (
                  <p className="mt-1 text-muted-foreground">{note.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label>Your answer</Label>

            <div className="grid grid-cols-2 gap-3">
              <AnswerButton
                isChosen={answer === "approved"}
                icon={<CheckCircle2 className="h-5 w-5" />}
                label="Approve"
                chosenClass="border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                onClick={() => form.setValue("status", "approved")}
              />

              <AnswerButton
                isChosen={answer === "rejected"}
                icon={<XCircle className="h-5 w-5" />}
                label="Reject"
                chosenClass="border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                onClick={() => form.setValue("status", "rejected")}
              />
            </div>
          </div>

          {/* The two extra choices only exist for an approval: there is
              nothing to pick apart in a "no". */}
          {answer === "approved" && request ? (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" />
                    Days you approve
                  </Label>

                  <span className="text-xs text-muted-foreground tabular-nums">
                    {chosenDates.length +
                      " of " +
                      choosableDates(shownDays).length +
                      " days ticked"}
                  </span>
                </div>

                <LeaveDayList
                  days={shownDays}
                  chosenDates={chosenDates}
                  onToggle={toggleDate}
                />

                <p className="text-xs text-muted-foreground">
                  Click a day to take it out of the answer. A grey day was
                  already removed by a rule and cannot be given back.
                </p>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
                <div>
                  <Label htmlFor="review-weekends">
                    {excludeWeekends ? "Exclude weekends" : "Include weekends"}
                  </Label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {excludeWeekends
                      ? "The Saturdays and Sundays inside this leave are not counted as leave days."
                      : "The Saturdays and Sundays inside this leave are counted as leave days."}
                  </p>
                </div>

                <Switch
                  id="review-weekends"
                  checked={excludeWeekends}
                  onCheckedChange={(checked) => {
                    setExcludeWeekends(checked);

                    // Flipping the switch changes which days are in the list
                    // at all, so the ticks start again from "everything that
                    // can be ticked". That is what an approver who just said
                    // "count the weekends" means.
                    setChosenDates(
                      choosableDates(previewDays(request.leaveDays, checked))
                    );
                  }}
                />
              </div>

              <p className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-xs">
                The final number of days is counted by the server after saving.
                A day whose attendance is already recorded is given back to the
                employee, so the approved days can be fewer than the days you
                tick here. The reason of every removed day is written in the
                history.
              </p>
            </>
          ) : null}

          {/* The work of these days, with a box in front of each line. It is
              offered for BOTH answers: an approval reminds the employee of
              what still needs them, a rejection says what they are needed
              for. */}
          {contextQuery.data ? (
            <LeaveReferencePicker
              context={contextQuery.data}
              chosen={references}
              onChange={setReferences}
            />
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="review-remarks">
              {answer === "approved"
                ? "Message for the employee (optional)"
                : "Why you are rejecting (optional)"}
            </Label>
            <Textarea
              id="review-remarks"
              rows={2}
              placeholder={
                answer === "approved"
                  ? "Please hand these over before you go."
                  : "Please apply again once these are done or handed over."
              }
              {...form.register("reviewRemarks")}
            />
          </div>

          {/* Exactly what the employee will read, put together from the
              answer, the ticked lines and the message. It is here so nobody
              has to press Save to find out how their answer comes across. */}
          {references.length > 0 && contextQuery.data ? (
            <AnswerPreview
              isApproved={answer === "approved"}
              references={references}
              context={contextQuery.data}
              message={form.watch("reviewRemarks") || ""}
            />
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={reviewLeaveRequest.isPending}>
              {reviewLeaveRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save answer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// What the employee is going to read, shown while the answer is still being
// written.
//
// The titles come from the workload panel of this same dialog, so the preview
// is built from what the approver is looking at. The saved answer takes its
// titles from the database instead, which is what makes it trustworthy; the
// two say the same thing.
function AnswerPreview(props: {
  isApproved: boolean;
  references: ChosenReference[];
  context: LeaveContext;
  message: string;
}) {
  // The ticked lines, back in the order the two lists have them.
  const lines: string[] = [];

  for (const task of props.context.workload.tasks) {
    const isTicked = props.references.some(
      (item) => item.kind === "task" && item.refId === task._id
    );

    if (isTicked) {
      lines.push(
        task.title + (task.dueDate ? " – " + formatDay(task.dueDate) : "")
      );
    }
  }

  for (const meeting of props.context.workload.meetings) {
    const isTicked = props.references.some(
      (item) => item.kind === "meeting" && item.refId === meeting._id
    );

    if (isTicked) {
      lines.push(
        meeting.title +
          " – " +
          formatDay(meeting.startAt) +
          " at " +
          formatTime(meeting.startAt)
      );
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-dashed p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Eye className="h-3.5 w-3.5" />
        What the employee will see
      </p>

      <p className="text-sm font-medium">
        {props.isApproved
          ? "Approved. Please note that you have the following commitments during your leave:"
          : "Your leave request was rejected, because these responsibilities need you:"}
      </p>

      <ul className="flex flex-col gap-0.5 text-sm">
        {lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-muted-foreground">•</span>
            {line}
          </li>
        ))}
      </ul>

      {props.message ? (
        <p className="border-t pt-2 text-sm">{props.message}</p>
      ) : null}
    </div>
  );
}

// One of the two big choice buttons. It is a normal button, only the
// classes change when it is the chosen one.
function AnswerButton(props: {
  isChosen: boolean;
  icon: React.ReactNode;
  label: string;
  chosenClass: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={
        "flex items-center justify-center gap-2 rounded-lg border-2 py-3 text-sm font-medium transition-all " +
        (props.isChosen
          ? props.chosenClass
          : "border-border text-muted-foreground hover:border-foreground/20 hover:bg-muted")
      }
    >
      {props.icon}
      {props.label}
    </button>
  );
}
