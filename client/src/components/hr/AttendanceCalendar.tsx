import { Card } from "@/components/ui/card";
import {
  ATTENDANCE_STATUS_LOOK,
  ATTENDANCE_STATUS_ORDER,
} from "@/lib/attendanceStatus";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Attendance } from "@/types/hr.types";

// The days of the week, starting on Monday because that is the first
// working day. getUTCDay() gives 0 for Sunday, so Sunday goes to the end.
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The month of the employee drawn as a real calendar.
//
// Every day is a small square, coloured by its status, so a whole month can
// be read in one look: the green squares are the days this person came, the
// red ones the days they did not.
export function AttendanceCalendar(props: {
  data: Attendance[];
  year: number;
  // 1 for January, like everywhere else in the HR module.
  month: number;
  isLoading: boolean;
}) {
  // A Map of "2026-07-30" -> the row of that day, so looking up one square
  // is one step instead of searching the whole list every time.
  const rowByDay = new Map<string, Attendance>();

  for (const row of props.data) {
    rowByDay.set(row.date.slice(0, 10), row);
  }

  // How many days this month has. Day 0 of the next month is the last day
  // of this one, which is the short way of asking "28, 30 or 31?".
  const dayCount = new Date(Date.UTC(props.year, props.month, 0)).getUTCDate();

  // Which square the 1st of the month sits on. getUTCDay() gives 0 for
  // Sunday, and our week starts on Monday, so Sunday becomes 6 and every
  // other day moves one place back.
  const firstWeekDay = new Date(
    Date.UTC(props.year, props.month - 1, 1)
  ).getUTCDay();
  const emptySquares = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

  const today = new Date();
  const todayText =
    today.getFullYear() +
    "-" +
    String(today.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(today.getDate()).padStart(2, "0");

  return (
    <Card className="gap-4 p-4 sm:p-6">
      {props.isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading the month...
        </p>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEK_DAYS.map((name) => (
              <div
                key={name}
                className="pb-1 text-center text-xs font-medium text-muted-foreground"
              >
                {name}
              </div>
            ))}

            {/* The empty squares before the 1st, so the month starts on the
                right day of the week. They have no key problem because
                their index never changes. */}
            {Array.from({ length: emptySquares }).map((_, index) => (
              <div key={"empty-" + index} />
            ))}

            {Array.from({ length: dayCount }).map((_, index) => {
              const dayNumber = index + 1;

              const dayText =
                props.year +
                "-" +
                String(props.month).padStart(2, "0") +
                "-" +
                String(dayNumber).padStart(2, "0");

              const row = rowByDay.get(dayText);
              const look = row ? ATTENDANCE_STATUS_LOOK[row.status] : null;

              // A day with no row is grey: either nothing happened, or the
              // day has not come yet.
              return (
                <div
                  key={dayText}
                  // title is the small box the browser shows when the mouse
                  // stays on the square, so the times are one hover away.
                  title={
                    row
                      ? look?.label +
                        " · " +
                        formatTime(row.checkIn) +
                        " - " +
                        formatTime(row.checkOut)
                      : "No attendance"
                  }
                  className={cn(
                    "flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors",
                    look
                      ? look.soft + " " + look.border
                      : "border-transparent bg-muted/40 text-muted-foreground",
                    // Today gets a ring so the eye finds it at once.
                    dayText === todayText && "ring-2 ring-primary ring-offset-1"
                  )}
                >
                  <span className="font-medium tabular-nums">{dayNumber}</span>
                  {row && row.workedHours > 0 ? (
                    <span className="text-[10px] opacity-80 tabular-nums">
                      {row.workedHours + "h"}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* The legend, so nobody has to guess what a colour means. */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t pt-4">
            {ATTENDANCE_STATUS_ORDER.map((status) => {
              const look = ATTENDANCE_STATUS_LOOK[status];

              return (
                <span
                  key={status}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-sm", look.solid)} />
                  {look.label}
                </span>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}
