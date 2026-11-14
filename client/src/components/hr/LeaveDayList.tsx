import { Check, X, Minus } from "lucide-react";
import { LEAVE_DAY_LOOK } from "@/lib/leaveStatus";
import type { LeaveDay } from "@/types/hr.types";

// Turn "2026-08-03T00:00:00.000Z" into the two lines of one tile:
// "Mon" on top and "03 Aug" under it.
//
// The dates of the HR module are days and not moments, so they are read as
// UTC. Without that the tile of somebody in a timezone behind UTC would show
// the day before.
function dayParts(value: string) {
  const date = new Date(value);

  return {
    weekday: date.toLocaleDateString(undefined, {
      weekday: "short",
      timeZone: "UTC",
    }),
    dayMonth: date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }),
  };
}

// Every day of one leave request, drawn as a row of small tiles.
//
// The same component does two jobs:
//
// - READING it (onToggle left out): the tiles only show what happened to
//   each day, green for approved, red for rejected, grey for a day a rule
//   took out. This is what the employee sees in the history.
// - CHOOSING with it (onToggle given): the tiles the approver may still tick
//   become buttons, and clicking one takes that day in or out of the answer.
//
// A day a rule already removed is never clickable, whatever the approver
// wants: a Sunday or a public holiday is not something to say yes to, and
// neither is a day whose attendance is already written.
export function LeaveDayList(props: {
  days: LeaveDay[];
  // Given only when the list is being used to choose. The value is the day as
  // the text "2026-08-03".
  onToggle?: (dayText: string) => void;
  // The days that are ticked right now, as texts. Only used while choosing.
  chosenDates?: string[];
}) {
  if (props.days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This request has no day list. It was answered before the day by day
        breakdown existed.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {props.days.map((day) => {
        const dayText = day.date.slice(0, 10);
        const parts = dayParts(day.date);

        // A day a rule took out can never be ticked.
        const isLocked = day.status === "excluded";
        const canClick = props.onToggle !== undefined && !isLocked;

        // While choosing, the colour follows what the approver has ticked
        // right now. While only reading, it follows what really happened.
        const shownStatus = props.chosenDates
          ? isLocked
            ? "excluded"
            : props.chosenDates.includes(dayText)
              ? "approved"
              : "rejected"
          : day.status;

        const look = LEAVE_DAY_LOOK[shownStatus];

        return (
          <button
            key={dayText}
            type="button"
            disabled={!canClick}
            onClick={() => props.onToggle && props.onToggle(dayText)}
            title={day.reason || look.label}
            className={
              "flex min-w-18 flex-col items-start gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition-all " +
              look.border +
              " " +
              look.soft +
              (canClick ? " cursor-pointer hover:shadow-sm" : " cursor-default")
            }
          >
            <span className="flex items-center gap-1 text-[10px] font-medium uppercase opacity-80">
              {shownStatus === "approved" ? (
                <Check className="h-3 w-3" />
              ) : shownStatus === "rejected" ? (
                <X className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {parts.weekday}
            </span>

            <span className="text-sm font-semibold tabular-nums">
              {parts.dayMonth}
            </span>

            {/* The reason is the whole point of an excluded day: without it
                the employee only sees a grey tile and has to guess. */}
            {day.reason && !props.chosenDates ? (
              <span className="max-w-32 truncate text-[10px] opacity-80">
                {day.reason}
              </span>
            ) : null}

            {isLocked && props.chosenDates ? (
              <span className="max-w-32 truncate text-[10px] opacity-80">
                {day.reason}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
