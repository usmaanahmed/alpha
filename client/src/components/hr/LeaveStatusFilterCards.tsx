import { LEAVE_STATUS_LOOK, LEAVE_STATUS_ORDER } from "@/lib/leaveStatus";
import type { LeaveRequestStatus } from "@/types/hr.types";

// The five tiles above the table. They do two jobs at the same time: they
// show how many requests have each status, and clicking one keeps only
// those rows in the table.
//
// Clicking the tile that is already chosen goes back to "all", so a person
// never gets stuck inside one filter.
export function LeaveStatusFilterCards(props: {
  counts: Record<LeaveRequestStatus, number>;
  // "all" means no filter at all.
  selected: LeaveRequestStatus | "all";
  onSelect: (status: LeaveRequestStatus | "all") => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {LEAVE_STATUS_ORDER.map((status) => {
        const look = LEAVE_STATUS_LOOK[status];
        const Icon = look.icon;
        const isSelected = props.selected === status;

        return (
          <button
            key={status}
            type="button"
            onClick={() => props.onSelect(isSelected ? "all" : status)}
            className={
              "flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-md " +
              (isSelected
                ? look.border + " " + look.tint + " shadow-sm"
                : "bg-card hover:border-foreground/20")
            }
          >
            <span
              className={
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " +
                look.soft
              }
            >
              <Icon className="h-5 w-5" />
            </span>

            <span className="min-w-0">
              <span className="block text-2xl leading-none font-semibold tabular-nums">
                {props.counts[status]}
              </span>
              <span className="block text-xs text-muted-foreground">
                {look.label}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
