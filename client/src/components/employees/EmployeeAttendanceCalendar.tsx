import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  ATTENDANCE_STATUS_LOOK,
  ATTENDANCE_STATUS_ORDER,
} from "@/lib/attendanceStatus";
import { cn } from "@/lib/utils";
import type { Attendance, AttendanceStatus } from "@/types/hr.types";

// The days of the week the snapshot uses, starting on Sunday.
const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

// The light fill each status paints behind a day number. These are written
// out in full (never joined from pieces) because Tailwind reads this file to
// know which classes to keep in the final css.
const STATUS_PILL: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  half_day: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  on_leave: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  holiday: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

// The compact month calendar from the snapshot: a tidy grid of small day
// numbers, each one tinted by its attendance status, and a little legend
// of counts under it.
//
// The month itself is owned by the page (so the same arrows also load the
// attendance of that month), and is passed in here together with the two
// functions the arrows call.
export function EmployeeAttendanceCalendar(props: {
  data: Attendance[];
  year: number;
  // 1 for January, like everywhere else in the HR module.
  month: number;
  isLoading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  // The next arrow is switched off on the current month, because a month
  // that has not happened yet has nothing to show.
  canGoNext: boolean;
}) {
  // A Map of "2026-07-30" -> the row of that day, so looking up one square is
  // one step instead of searching the whole list every time.
  const rowByDay = new Map<string, Attendance>();
  for (const row of props.data) {
    rowByDay.set(row.date.slice(0, 10), row);
  }

  // How many days this month has. Day 0 of the next month is the last day of
  // this one, the short way of asking "28, 30 or 31?".
  const dayCount = new Date(Date.UTC(props.year, props.month, 0)).getUTCDate();

  // The last month, used to fill the greyed-out days before the 1st.
  const prevDayCount = new Date(
    Date.UTC(props.year, props.month - 1, 0)
  ).getUTCDate();

  // Which square the 1st sits on. getUTCDay() gives 0 for Sunday, and our
  // week starts on Sunday, so the 1st simply moves that many places in.
  const firstWeekDay = new Date(
    Date.UTC(props.year, props.month - 1, 1)
  ).getUTCDay();

  // We always draw whole weeks, so the grid stays a clean rectangle. This is
  // how many squares that takes: the blanks before the 1st, plus the days,
  // rounded up to the next multiple of 7.
  const totalCells = Math.ceil((firstWeekDay + dayCount) / 7) * 7;

  const monthName = new Date(
    Date.UTC(props.year, props.month - 1, 1)
  ).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const today = new Date();
  const todayText =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  // Count how many days of the month have each status, for the legend.
  const counts = ATTENDANCE_STATUS_ORDER.map((status) => ({
    status: status,
    count: props.data.filter((row) => row.status === status).length,
  }));

  return (
    <Card className="gap-4 p-5">
      {/* The header: the month on the left, two round arrows on the right. */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 font-semibold">
          {monthName}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={props.onPrevious}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors hover:bg-accent/70"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={props.onNext}
            disabled={!props.canGoNext}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors hover:bg-accent/70 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {props.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading the month...
        </p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-y-1.5 text-center text-sm">
            {/* The weekday letters. The keys carry the index because two
                letters repeat (S and T), so the letter alone is not unique. */}
            {WEEK_DAYS.map((letter, index) => (
              <div
                key={index}
                className="pb-1 text-xs font-medium text-muted-foreground"
              >
                {letter}
              </div>
            ))}

            {/* Every square of the grid, week by week. */}
            {Array.from({ length: totalCells }).map((_, cellIndex) => {
              // Where this square is relative to the 1st of the month.
              // Negative before the 1st, 0..dayCount-1 inside, then over.
              const dayOffset = cellIndex - firstWeekDay;

              // The greyed-out days that belong to the month before.
              if (dayOffset < 0) {
                const number = prevDayCount + dayOffset + 1;
                return <FadedDay key={"prev-" + cellIndex} number={number} />;
              }

              // The greyed-out days that belong to the month after.
              if (dayOffset >= dayCount) {
                const number = dayOffset - dayCount + 1;
                return <FadedDay key={"next-" + cellIndex} number={number} />;
              }

              const dayNumber = dayOffset + 1;
              const dayText =
                props.year +
                "-" +
                String(props.month).padStart(2, "0") +
                "-" +
                String(dayNumber).padStart(2, "0");

              const row = rowByDay.get(dayText);
              const isToday = dayText === todayText;

              return (
                <div key={dayText} className="flex justify-center">
                  <span
                    title={
                      row
                        ? ATTENDANCE_STATUS_LOOK[row.status].label
                        : "No attendance"
                    }
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
                      // Today is the strong filled circle, like the snapshot.
                      isToday && "rounded-full bg-primary font-semibold text-primary-foreground",
                      // A normal day with attendance gets its soft tint.
                      !isToday && row && STATUS_PILL[row.status],
                      // A day with nothing is just the plain number.
                      !isToday && !row && "text-foreground"
                    )}
                  >
                    {dayNumber}
                  </span>
                </div>
              );
            })}
          </div>

          {/* The legend of counts under the grid: a small coloured bar, the
              status name, and how many days had it this month. */}
          <div className="flex flex-wrap gap-x-5 gap-y-3 border-t pt-4">
            {counts.map((item) => {
              const look = ATTENDANCE_STATUS_LOOK[item.status];
              return (
                <div key={item.status} className="flex items-center gap-2">
                  <span className={cn("h-6 w-1 rounded-full", look.solid)} />
                  <div className="leading-tight">
                    <p className="text-xs text-muted-foreground">
                      {look.label}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      {item.count}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

// One greyed-out day from the month before or after. It keeps the same size
// as a real day so the grid stays perfectly even.
function FadedDay(props: { number: number }) {
  return (
    <div className="flex justify-center">
      <span className="flex h-8 w-8 items-center justify-center text-sm tabular-nums text-muted-foreground/40">
        {props.number}
      </span>
    </div>
  );
}
