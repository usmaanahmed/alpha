import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ThumbsUp, ThumbsDown, ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { LeaveDocumentList } from "@/components/hr/LeaveDocumentList";
import { LeaveDecisionSupport } from "@/components/hr/LeaveDecisionSupport";
import { leaveRecommendSchema } from "@/validators/hr.schema";
import type { LeaveRecommendFormValues } from "@/validators/hr.schema";
import { useRecommendLeaveRequest, useLeaveContext } from "@/hooks/useLeaves";
import { formatDay } from "@/lib/date";
import type { LeaveRequest } from "@/types/hr.types";

// The first level of the leave workflow: the team lead says what it thinks
// about the request of one of its own members.
//
// This is not a decision, and the dialog says so in as many words. The lead
// works with that person every day and knows whether the team can miss them
// those days; the HR or the organization then reads this note and makes the
// real call.
export function LeaveRecommendDialog(props: {
  request: LeaveRequest | null;
  onClose: () => void;
}) {
  const recommendLeaveRequest = useRecommendLeaveRequest();

  // Who else of the company is away in these same days, and what this member
  // has on their plate then. Read only while this dialog is open.
  const contextQuery = useLeaveContext(props.request?._id || null);

  const form = useForm<LeaveRecommendFormValues>({
    resolver: zodResolver(leaveRecommendSchema),
    defaultValues: { recommendation: "approve", note: "" },
  });

  useEffect(() => {
    if (props.request) {
      form.reset({ recommendation: "approve", note: "" });
    }
  }, [props.request, form]);

  const answer = form.watch("recommendation");

  function onSubmit(values: LeaveRecommendFormValues) {
    if (!props.request) {
      return;
    }

    recommendLeaveRequest.mutate(
      { id: props.request._id, values: values },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.request !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recommend this leave</DialogTitle>
          <DialogDescription>
            You are the team lead of this employee, so the request came to you
            too.
          </DialogDescription>
        </DialogHeader>

        {props.request ? (
          <div className="rounded-xl border bg-muted/40 p-4">
            <EmployeeAvatar
              name={props.request.employee.name}
              photo={props.request.employee.photo}
              subtitle={props.request.department?.name}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-background px-2 py-1 font-medium">
                {props.request.leaveType.name}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-1 tabular-nums">
                {formatDay(props.request.fromDate)}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                {formatDay(props.request.toDate)}
              </span>

              <span className="rounded-full bg-background px-2 py-1 font-medium tabular-nums">
                {props.request.requestedDays +
                  (props.request.requestedDays === 1 ? " day" : " days")}
              </span>
            </div>

            <p className="mt-3 border-t pt-3 text-sm">{props.request.reason}</p>
          </div>
        ) : null}

        {/* The papers the employee handed in. The team lead reads them too:
            that is exactly what the request was routed to them for. */}
        {props.request ? (
          <LeaveDocumentList documents={props.request.documents} />
        ) : null}

        {/* The same picture the HR gets. A team lead is the person who really
            knows whether the team can miss somebody that week, so they should
            not have to guess who else is already away. */}
        {props.request ? (
          <LeaveDecisionSupport
            context={contextQuery.data}
            isLoading={contextQuery.isLoading}
            employeeName={props.request.employee.name}
          />
        ) : null}

        <div className="flex items-start gap-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <p>
            This does not approve or reject anything and takes no days from the
            balance. Your note goes into the approval history, and the HR or
            your organization reads it before deciding.
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Your recommendation</Label>

            <div className="grid grid-cols-2 gap-3">
              <ChoiceButton
                isChosen={answer === "approve"}
                icon={<ThumbsUp className="h-5 w-5" />}
                label="Recommend"
                chosenClass="border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                onClick={() => form.setValue("recommendation", "approve")}
              />

              <ChoiceButton
                isChosen={answer === "reject"}
                icon={<ThumbsDown className="h-5 w-5" />}
                label="Do not recommend"
                chosenClass="border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                onClick={() => form.setValue("recommendation", "reject")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="recommend-note">Note (optional)</Label>
            <Textarea
              id="recommend-note"
              rows={3}
              placeholder="What should the HR know before deciding?"
              {...form.register("note")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={recommendLeaveRequest.isPending}>
              {recommendLeaveRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save recommendation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// One of the two big choice buttons. It is a normal button, only the
// classes change when it is the chosen one.
function ChoiceButton(props: {
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
