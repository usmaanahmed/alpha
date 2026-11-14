import { useState } from "react";
import { ChevronDown, Users, Briefcase, LineChart } from "lucide-react";
import { LeaveWarningList } from "@/components/hr/LeaveWarningList";
import { LeaveConflictPanel } from "@/components/hr/LeaveConflictPanel";
import { LeaveWorkloadPanel } from "@/components/hr/LeaveWorkloadPanel";
import { LeaveHistoryPanel } from "@/components/hr/LeaveHistoryPanel";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { LeaveContext } from "@/types/hr.types";

// Everything the approver needs to decide with, in one block.
//
// It is built in two layers on purpose. The WARNINGS are always open: they
// are three or four sentences, and they are the part that really changes an
// answer. The two long panels behind them are folded away, because an
// approver only opens "who else is away" when a warning made them curious,
// and a dialog that shows everything at once shows nothing.
export function LeaveDecisionSupport(props: {
  context: LeaveContext | undefined;
  isLoading: boolean;
  employeeName: string;
}) {
  const [openPanel, setOpenPanel] = useState<
    "none" | "conflict" | "workload" | "history"
  >("none");

  // The SaaS owner can sell the leave module without this help, and then the
  // approver answers the request from the request alone.
  const { hasFeature } = useAuth();

  if (!hasFeature(FEATURES.LEAVES_DECISION_SUPPORT)) {
    return null;
  }

  if (props.isLoading) {
    return <div className="h-20 animate-pulse rounded-xl border bg-muted/40" />;
  }

  // The context could not be read. The approver can still answer the request,
  // they simply do it without this help, so we say so out loud instead of
  // quietly showing nothing, which would look like "no conflict found".
  if (!props.context) {
    return (
      <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
        The leave conflicts and the workload of this employee could not be
        read. You can still answer the request.
      </p>
    );
  }

  const conflict = props.context.conflict;
  const workload = props.context.workload;
  const history = props.context.history;

  // The habits found in the leave history are warnings too, and an approver
  // should not have to open a panel to learn that this is the fourth request
  // in three months. So the two lists are shown together at the top.
  const allWarnings = props.context.warnings.concat(history.patterns);

  // min-w-0 on every block of this feature, here and in the three panels
  // below it.
  //
  // The dialog these live in is a CSS grid, and a grid item is born with
  // "min-width: auto", which means "never get smaller than your content".
  // One long line inside any panel would push the whole dialog wider than the
  // phone and give it a horizontal scrollbar. min-w-0 takes that floor away,
  // and then the wrapping and the truncating inside can do their work.
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <LeaveWarningList warnings={allWarnings} />

      <div className="flex flex-col gap-2">
        <Expander
          isOpen={openPanel === "conflict"}
          onToggle={() =>
            setOpenPanel(openPanel === "conflict" ? "none" : "conflict")
          }
          icon={<Users className="h-4 w-4" />}
          title="Who else is away in these days"
          summary={
            conflict.absentNow +
            (conflict.absentNow === 1 ? " person" : " people") +
            " of " +
            conflict.workforce +
            " already on leave"
          }
        >
          <LeaveConflictPanel context={props.context} />
        </Expander>

        <Expander
          isOpen={openPanel === "workload"}
          onToggle={() =>
            setOpenPanel(openPanel === "workload" ? "none" : "workload")
          }
          icon={<Briefcase className="h-4 w-4" />}
          title={"What " + props.employeeName + " has on"}
          summary={
            workload.tasks.length +
            (workload.tasks.length === 1 ? " task" : " tasks") +
            " and " +
            workload.meetings.length +
            (workload.meetings.length === 1 ? " meeting" : " meetings") +
            " touching these days"
          }
        >
          <LeaveWorkloadPanel
            context={props.context}
            employeeName={props.employeeName}
          />
        </Expander>

        <Expander
          isOpen={openPanel === "history"}
          onToggle={() =>
            setOpenPanel(openPanel === "history" ? "none" : "history")
          }
          icon={<LineChart className="h-4 w-4" />}
          title="Leave history and analytics"
          summary={
            history.overall.requests +
            (history.overall.requests === 1 ? " request" : " requests") +
            " all time · " +
            history.overall.daysApproved +
            " days approved" +
            (history.balance
              ? " · " + history.balance.utilizationPercent + "% of this year used"
              : "")
          }
        >
          <LeaveHistoryPanel
            history={history}
            employeeName={props.employeeName}
          />
        </Expander>
      </div>
    </div>
  );
}

// One folded panel: a row you press to open, and the content under it.
//
// The two are written as one button and one div instead of the <details> tag
// of html, because <details> cannot be styled the same way in every browser
// and the rest of this app already opens things with a piece of state.
function Expander(props: {
  isOpen: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={props.onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <span className="text-muted-foreground">{props.icon}</span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {props.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {props.summary}
          </span>
        </span>

        <ChevronDown
          className={
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform " +
            (props.isOpen ? "rotate-180" : "")
          }
        />
      </button>

      {props.isOpen ? (
        <div className="min-w-0 overflow-x-hidden border-t p-4">
          {props.children}
        </div>
      ) : null}
    </div>
  );
}
