import {
  ArrowRight,
  CalendarRange,
  History,
  ScrollText,
  TriangleAlert,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { LeaveStatusPill } from "@/components/hr/LeaveStatusPill";
import { LeaveDayList } from "@/components/hr/LeaveDayList";
import { LeaveApprovalHistory } from "@/components/hr/LeaveApprovalHistory";
import { LeaveDocumentList } from "@/components/hr/LeaveDocumentList";
import { LeaveReferenceList } from "@/components/hr/LeaveReferenceList";
import { leaveDaysWith } from "@/lib/leaveStatus";
import { formatDay, formatTime } from "@/lib/date";
import type { LeaveRequest } from "@/types/hr.types";

// The full story of one leave request.
//
// This dialog exists to answer one question, and the employee asks it every
// time the two numbers do not match: "I asked for 5 days, why were only 3
// approved?". So it puts the answer in three layers:
//
// 1. the numbers side by side: asked, approved, and the difference,
// 2. the day by day list, where every day that fell out carries its reason,
// 3. the approval history: who did what, when, and with which note.
export function LeaveHistoryDialog(props: {
  request: LeaveRequest | null;
  onClose: () => void;
}) {
  const request = props.request;

  // The days that fell out, split by the reason they fell out for. A rejected
  // day is a decision of a person, an excluded day is a rule.
  const rejectedDays = request ? leaveDaysWith(request.leaveDays, "rejected") : [];
  const excludedDays = request ? leaveDaysWith(request.leaveDays, "excluded") : [];

  return (
    <Dialog open={request !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Leave history</DialogTitle>
          <DialogDescription>
            Everything that happened to this request, and why the approved days
            can be fewer than the days that were asked for.
          </DialogDescription>
        </DialogHeader>

        {request ? (
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <EmployeeAvatar
                  name={request.employee.name}
                  photo={request.employee.photo}
                  subtitle={request.department?.name}
                />

                <LeaveStatusPill status={request.status} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-background px-2 py-1 font-medium">
                  {request.leaveType.name}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-1 tabular-nums">
                  {formatDay(request.fromDate)}
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  {formatDay(request.toDate)}
                </span>

                <span className="rounded-full bg-background px-2 py-1">
                  {request.excludeWeekends
                    ? "Weekends excluded"
                    : "Weekends counted"}
                </span>

                <span className="rounded-full bg-background px-2 py-1">
                  {request.excludeHolidays
                    ? "Holidays excluded"
                    : "Holidays counted"}
                </span>
              </div>

              <p className="mt-3 border-t pt-3 text-sm">{request.reason}</p>
            </div>

            {/* What the approver pointed at while answering. It sits right
                under the request, before any number, because for the employee
                this is the part that needs doing something about. */}
            <ResponsibilityCallout request={request} />

            {/* The papers that were handed in with the request. They stay
                here forever: a document a leave was decided on has to remain
                next to that decision. */}
            <LeaveDocumentList documents={request.documents} />

            {/* The three numbers of the audit trail, next to each other so
                the difference is visible without any counting. */}
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberTile
                value={request.requestedDays}
                label="Days requested"
                className="bg-muted/40"
              />
              <NumberTile
                value={request.approvedDays}
                label="Days approved"
                className="border-emerald-500/30 bg-emerald-500/5"
              />
              <NumberTile
                value={rejectedDays.length + excludedDays.length}
                label="Days not counted"
                className="border-slate-500/30 bg-slate-500/5"
              />
            </div>

            {/* When the request was answered, which is the moment the
                attendance rule was applied. */}
            {request.reviewedAt ? (
              <p className="text-sm text-muted-foreground">
                {"Answered on " +
                  formatDay(request.reviewedAt) +
                  " at " +
                  formatTime(request.reviewedAt) +
                  (request.reviewedByEmployee
                    ? " by " + request.reviewedByEmployee.name
                    : " by your organization") +
                  "."}
              </p>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CalendarRange className="h-4 w-4" />
                Day by day
              </p>

              <LeaveDayList days={request.leaveDays} />
            </div>

            {/* The plain sentence version of the day list, for the days that
                did not make it. A tile is quick to look at, a sentence is
                what a person quotes when they ask about it. */}
            {rejectedDays.length + excludedDays.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <ScrollText className="h-4 w-4" />
                  Why some days were not counted
                </p>

                <ul className="flex flex-col gap-1 rounded-xl border p-3 text-sm">
                  {rejectedDays.concat(excludedDays).map((day) => (
                    <li
                      key={day.date}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <span className="font-medium tabular-nums">
                        {formatDay(day.date)}
                      </span>
                      <span className="text-muted-foreground">
                        {day.reason || "Not counted"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4" />
                Approval history
              </p>

              <LeaveApprovalHistory history={request.approvalHistory || []} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// The commitments the approver pointed at when they answered.
//
// It is drawn from the FINAL decision of the history, and not from a field of
// its own, because that decision is where those references were written and
// keeping a second copy could only ever go out of step with it.
//
// The colour follows the answer, and so do the words: after an approval this
// is a list of things to hand over before going, after a rejection it is the
// reason the days were refused.
function ResponsibilityCallout(props: { request: LeaveRequest }) {
  // The last step of the history that really decided something.
  const decision = [...(props.request.approvalHistory || [])]
    .reverse()
    .find(
      (entry) =>
        entry.action === "approved" ||
        entry.action === "partially_approved" ||
        entry.action === "rejected"
    );

  if (!decision || !decision.references || decision.references.length === 0) {
    return null;
  }

  const wasRejected = decision.action === "rejected";

  return (
    <div
      className={
        "flex min-w-0 flex-col gap-3 rounded-xl border p-4 " +
        (wasRejected
          ? "border-rose-500/40 bg-rose-500/5"
          : "border-amber-500/40 bg-amber-500/5")
      }
    >
      <div className="flex items-start gap-3">
        <TriangleAlert
          className={
            "mt-0.5 h-4 w-4 shrink-0 " +
            (wasRejected
              ? "text-rose-600 dark:text-rose-400"
              : "text-amber-600 dark:text-amber-400")
          }
        />

        <div className="min-w-0">
          <p className="text-sm font-medium">
            {wasRejected
              ? "These responsibilities need you"
              : "Action needed before you go"}
          </p>
          <p className="text-sm text-muted-foreground">
            {wasRejected
              ? decision.actorName +
                " rejected this request because of the work below."
              : decision.actorName +
                " approved this leave, and pointed at the work below. Please finish it or hand it over first."}
          </p>
        </div>
      </div>

      <LeaveReferenceList references={decision.references} />

      {decision.note ? (
        <p className="border-t pt-3 text-sm">{decision.note}</p>
      ) : null}
    </div>
  );
}

// One of the three big numbers at the top.
function NumberTile(props: {
  value: number;
  label: string;
  className: string;
}) {
  return (
    <div className={"rounded-xl border p-4 " + props.className}>
      <p className="text-3xl leading-none font-semibold tabular-nums">
        {props.value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{props.label}</p>
    </div>
  );
}
