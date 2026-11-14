import { OctagonAlert, TriangleAlert, Info, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LeaveWarning } from "@/types/hr.types";

// How the three levels of a warning look.
//
// Every level carries its own ICON and its own WORDS, not only its own
// colour. A person who cannot tell red from amber still reads "Minimum
// workforce threshold exceeded" next to a stop sign, and so does anybody
// looking at a printed copy.
const LEVEL_LOOK: Record<
  string,
  { icon: LucideIcon; box: string; icon_color: string }
> = {
  danger: {
    icon: OctagonAlert,
    box: "border-rose-500/40 bg-rose-500/5",
    icon_color: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    icon: TriangleAlert,
    box: "border-amber-500/40 bg-amber-500/5",
    icon_color: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    box: "border-sky-500/40 bg-sky-500/5",
    icon_color: "text-sky-600 dark:text-sky-400",
  },
};

// The short list of things worth looking at before answering a leave request.
//
// Nothing here BLOCKS anything. The approver is the one who knows whether the
// urgent task can wait a week and whether the meeting can move, so the screen
// says what it can see and then gets out of the way.
// The same component draws two lists: the conflicts of the requested days,
// and the habits found in the leave history of this employee. They are the
// same kind of thing (a title, a sentence, a level) so they get the same
// look, and only the words of the "nothing found" line change.
export function LeaveWarningList(props: {
  warnings: LeaveWarning[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}) {
  if (props.isLoading) {
    return <div className="h-16 animate-pulse rounded-xl border bg-muted/40" />;
  }

  // Nothing found is an answer too, and a useful one: it tells the approver
  // that the system looked and saw no reason to hesitate.
  if (props.warnings.length === 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <p className="text-sm font-medium">
            {props.emptyTitle || "No conflict found"}
          </p>
          <p className="text-sm text-muted-foreground">
            {props.emptyText ||
              "Nobody else of note is away in these days, and this employee has no urgent work or meeting inside them."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {props.warnings.map((warning) => {
        const look = LEVEL_LOOK[warning.level] || LEVEL_LOOK.info;
        const Icon = look.icon;

        return (
          <div
            key={warning.key}
            className={"flex items-start gap-3 rounded-xl border p-3 " + look.box}
          >
            <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + look.icon_color} />

            <div className="min-w-0">
              <p className="text-sm font-medium">{warning.title}</p>
              <p className="text-sm text-muted-foreground">{warning.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
