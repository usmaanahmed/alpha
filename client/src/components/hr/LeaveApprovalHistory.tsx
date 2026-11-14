import {
  Send,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  CircleDashed,
  XCircle,
  Ban,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LeaveReferenceList } from "@/components/hr/LeaveReferenceList";
import { formatDay, formatTime } from "@/lib/date";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { LeaveApproval } from "@/types/hr.types";

// How one step of the workflow is drawn: the words a person reads and the
// colour of its dot.
interface ActionLook {
  label: string;
  icon: LucideIcon;
  dot: string;
  text: string;
}

// Every action a leave request can carry in its history.
//
// The recommendation of a team lead is deliberately NOT green or red like a
// decision: it is an opinion, and the HR still has to decide. So it gets the
// quiet violet of a note.
const ACTION_LOOK: Record<string, ActionLook> = {
  applied: {
    label: "applied for this leave",
    icon: Send,
    dot: "bg-slate-400",
    text: "text-muted-foreground",
  },
  recommended: {
    label: "recommends this leave",
    icon: ThumbsUp,
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
  },
  not_recommended: {
    label: "does not recommend this leave",
    icon: ThumbsDown,
    dot: "bg-violet-500",
    text: "text-violet-700 dark:text-violet-400",
  },
  approved: {
    label: "approved this leave",
    icon: CheckCircle2,
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  partially_approved: {
    label: "approved some of the days",
    icon: CircleDashed,
    dot: "bg-sky-500",
    text: "text-sky-700 dark:text-sky-400",
  },
  rejected: {
    label: "rejected this leave",
    icon: XCircle,
    dot: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-400",
  },
  cancelled: {
    label: "took this request back",
    icon: Ban,
    dot: "bg-slate-500",
    text: "text-muted-foreground",
  },
};

// The whole story of one leave request, oldest step first.
//
// This is the audit trail: who did what, when, with which note, and how many
// days the request counted after that step. Nothing here is ever changed, so
// an answer given months ago can still be explained today.
export function LeaveApprovalHistory(props: { history: LeaveApproval[] }) {
  const { hasFeature } = useAuth();

  // The SaaS owner can sell the leave module without its paper trail.
  if (!hasFeature(FEATURES.LEAVES_HISTORY)) {
    return null;
  }

  if (props.history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing has happened to this request yet.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-4 pl-6">
      {/* The thin line the dots sit on. It stops before the last dot so the
          timeline does not hang in the air. */}
      <span className="absolute top-2 bottom-2 left-[5px] w-px bg-border" />

      {props.history.map((entry, index) => {
        const look = ACTION_LOOK[entry.action] || ACTION_LOOK.applied;
        const Icon = look.icon;

        return (
          <li key={index} className="relative">
            <span
              className={
                "absolute top-1.5 -left-6 h-2.5 w-2.5 rounded-full ring-4 ring-background " +
                look.dot
              }
            />

            <p className="text-sm">
              <span className="font-medium">{entry.actorName}</span>
              {entry.actorRole ? (
                <span className="text-muted-foreground">
                  {" (" + entry.actorRole + ")"}
                </span>
              ) : null}{" "}
              <span className={look.text}>
                <Icon className="mr-0.5 inline h-3.5 w-3.5 align-[-2px]" />
                {look.label}
              </span>
            </p>

            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {formatDay(entry.at) + " at " + formatTime(entry.at)}
              {/* A step that changed the number of days says so, a note does
                  not, because "0 days" next to a recommendation would read
                  like the lead had refused everything. */}
              {entry.days > 0
                ? " · " + entry.days + (entry.days === 1 ? " day" : " days")
                : ""}
            </p>

            {entry.note ? (
              <p className="mt-1.5 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                {entry.note}
              </p>
            ) : null}

            {/* The work this step pointed at. It belongs in the trail and not
                only in the box at the top: an audit has to be able to ask
                "what exactly was this person told, and when?" */}
            {entry.references && entry.references.length > 0 ? (
              <div className="mt-1.5">
                <LeaveReferenceList references={entry.references} />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
