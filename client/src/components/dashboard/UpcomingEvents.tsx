import { Link } from "react-router-dom";
import { CalendarDays, Gift, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDay } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Holiday } from "@/types/hr.types";

// How many events we list. Three fills the column without making it taller
// than the two cards next to it.
const MAX_EVENTS = 3;

// Milliseconds in one day, used to count how many days away an event is.
const DAY_MS = 24 * 60 * 60 * 1000;

// "In 3 days", "Tomorrow" or "Today" for a holiday that has not passed yet.
// We read both dates as UTC days so the count never moves by one because of
// the timezone.
function daysAwayLabel(dateText: string) {
  const eventDay = new Date(dateText.slice(0, 10) + "T00:00:00Z").getTime();

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const daysAway = Math.round((eventDay - todayUtc) / DAY_MS);

  if (daysAway <= 0) {
    return "Today";
  }
  if (daysAway === 1) {
    return "Tomorrow";
  }
  return "In " + daysAway + " days";
}

// The upcoming holidays of the organization, shown as a short "what is
// coming" list. The very first one is painted yellow so the next event
// always stands out, exactly like the design.
export function UpcomingEvents(props: {
  holidays: Holiday[];
  isLoading: boolean;
}) {
  // Keep only the holidays that have not passed yet, put the nearest one
  // first, and take the first few.
  const todayText = new Date().toISOString().slice(0, 10);

  const upcoming = props.holidays
    .filter((holiday) => holiday.date.slice(0, 10) >= todayText)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, MAX_EVENTS);

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Future Events</h2>

        <Link
          to="/organization/holidays"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {props.isLoading ? (
        <LoadingCards />
      ) : upcoming.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No upcoming holidays.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((holiday, index) => (
            <EventCard
              key={holiday._id}
              holiday={holiday}
              // Only the very first card gets the bright yellow look.
              isNext={index === 0}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

// One event in the list.
function EventCard(props: { holiday: Holiday; isNext: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        props.isNext
          ? "border-amber-400/50 bg-gradient-to-br from-amber-300/80 to-amber-200/60 text-amber-950 dark:from-amber-400/25 dark:to-amber-300/10 dark:text-amber-100"
          : "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{props.holiday.name}</p>
          {props.holiday.description ? (
            <p
              className={cn(
                "mt-0.5 truncate text-sm",
                props.isNext ? "text-amber-900/80 dark:text-amber-100/80" : "text-muted-foreground"
              )}
            >
              {props.holiday.description}
            </p>
          ) : null}
        </div>

        {/* The "In N days" pill on the right. */}
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
            props.isNext
              ? "bg-amber-950/10 dark:bg-amber-100/15"
              : "bg-muted text-muted-foreground"
          )}
        >
          {daysAwayLabel(props.holiday.date)}
        </span>
      </div>

      {/* The date, and a small "optional" note when the holiday is optional. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
            props.isNext ? "bg-amber-950/10 dark:bg-amber-100/15" : "bg-muted"
          )}
        >
          <CalendarDays className="h-3.5 w-3.5" />
          {formatDay(props.holiday.date)}
        </span>

        {props.holiday.isOptional ? (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium",
              props.isNext ? "bg-amber-950/10 dark:bg-amber-100/15" : "bg-muted"
            )}
          >
            <Gift className="h-3.5 w-3.5" />
            Optional
          </span>
        ) : null}
      </div>
    </div>
  );
}

// The grey placeholder cards shown while the holidays are loading.
function LoadingCards() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </div>
  );
}
