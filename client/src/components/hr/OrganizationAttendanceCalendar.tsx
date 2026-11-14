import { PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PersonChip } from "@/components/hr/PersonChip";
import {
  ATTENDANCE_STATUS_LOOK,
  ATTENDANCE_STATUS_ORDER,
  readEmployeeOf,
} from "@/lib/attendanceStatus";
import { cn } from "@/lib/utils";
import type { Attendance, AttendanceStatus, Holiday } from "@/types/hr.types";

// The days of the week, starting on Monday because that is the first
// working day. getUTCDay() gives 0 for Sunday, so Sunday goes to the end.
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// How many people fit inside one square before we stop and only say how
// many more there are. Three keeps every square the same height.
const CHIPS_PER_SQUARE = 3;

// "2026-07-30" for one day of the month we are drawing.
function dayTextOf(year: number, month: number, dayNumber: number) {
  return (
    year +
    "-" +
    String(month).padStart(2, "0") +
    "-" +
    String(dayNumber).padStart(2, "0")
  );
}

// The whole organization for one month, drawn as a real calendar where the
// people themselves are inside the squares.
//
// selectedStatus decides what a square shows:
// - "all" shows a small counter for every status of that day,
// - one status shows the face and the name of everybody who was in that
//   status on that day. That is what makes "who was absent on Monday?" a
//   question you answer by looking, not by reading a table.
export function OrganizationAttendanceCalendar(props: {
  attendances: Attendance[];
  holidays: Holiday[];
  year: number;
  // 1 for January, like everywhere else in the HR module.
  month: number;
  isLoading: boolean;
  selectedStatus: AttendanceStatus | "all";
  onOpenDay: (dayText: string) => void;
}) {
  // All the rows of one day together, so a square is one lookup instead of
  // a search through the whole month.
  const rowsByDay = new Map<string, Attendance[]>();

  for (const row of props.attendances) {
    const dayText = row.date.slice(0, 10);
    const rowsOfDay = rowsByDay.get(dayText) || [];

    rowsOfDay.push(row);
    rowsByDay.set(dayText, rowsOfDay);
  }

  // The same idea for the holidays: "2026-07-30" -> "Independence Day".
  const holidayByDay = new Map<string, Holiday>();

  for (const holiday of props.holidays) {
    holidayByDay.set(holiday.date.slice(0, 10), holiday);
  }

  // How many days this month has. Day 0 of the next month is the last day
  // of this one, which is the short way of asking "28, 30 or 31?".
  const dayCount = new Date(Date.UTC(props.year, props.month, 0)).getUTCDate();

  // The tallest single bar of the whole month. Every little bar chart is
  // measured against this one number, so a bar of the same height means the
  // same count of people on any day. Without it each day would scale to
  // itself and "3" on a quiet day would look as tall as "30" on a busy one.
  // It is at least 1, so we never divide by zero on an empty month.
  let maxDailyCount = 1;

  for (const rowsOfOneDay of rowsByDay.values()) {
    for (const status of ATTENDANCE_STATUS_ORDER) {
      const count = rowsOfOneDay.filter(
        (row) => row.status === status
      ).length;

      if (count > maxDailyCount) {
        maxDailyCount = count;
      }
    }
  }

  // Which square the 1st of the month sits on. getUTCDay() gives 0 for
  // Sunday, and our week starts on Monday, so Sunday becomes 6 and every
  // other day moves one place back.
  const firstWeekDay = new Date(
    Date.UTC(props.year, props.month - 1, 1)
  ).getUTCDay();
  const emptySquares = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

  const now = new Date();
  const todayText = dayTextOf(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  if (props.isLoading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-lg bg-muted/50"
            />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-4 p-4 sm:p-6">
      {/* Seven columns never fit on a phone, so on a small screen the
          calendar keeps its width and slides sideways instead of being
          squeezed until nothing can be read. */}
      <div className="overflow-x-auto">
        <div className="min-w-3xl">
          <div className="grid grid-cols-7 gap-2">
            {WEEK_DAYS.map((name) => (
              <div
                key={name}
                className="pb-1 text-center text-xs font-medium text-muted-foreground"
              >
                {name}
              </div>
            ))}

            {/* The empty squares before the 1st, so the month starts on the
                right day of the week. */}
            {Array.from({ length: emptySquares }).map((_, index) => (
              <div key={"empty-" + index} />
            ))}

            {Array.from({ length: dayCount }).map((_, index) => {
              const dayNumber = index + 1;
              const dayText = dayTextOf(props.year, props.month, dayNumber);

              const rowsOfDay = rowsByDay.get(dayText) || [];
              const holiday = holidayByDay.get(dayText);

              // Saturday and Sunday, the same rule the server uses.
              const weekDay = new Date(dayText + "T00:00:00Z").getUTCDay();
              const isWeekend = weekDay === 0 || weekDay === 6;

              // What this square really shows: everybody, or only the
              // people of the status that is selected above.
              const shownRows =
                props.selectedStatus === "all"
                  ? rowsOfDay
                  : rowsOfDay.filter(
                      (row) => row.status === props.selectedStatus
                    );

              return (
                <button
                  key={dayText}
                  type="button"
                  onClick={() => props.onOpenDay(dayText)}
                  className={cn(
                    "flex h-32 flex-col gap-1 rounded-lg border p-2 text-left transition-colors hover:border-primary/50 hover:bg-accent/50",
                    isWeekend && "bg-muted/40",
                    holiday && "border-violet-500/30 bg-violet-500/5",
                    dayText === todayText && "border-primary ring-1 ring-primary"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        isWeekend && "text-muted-foreground"
                      )}
                    >
                      {dayNumber}
                    </span>

                    {props.selectedStatus !== "all" && shownRows.length > 0 ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] font-semibold tabular-nums",
                          ATTENDANCE_STATUS_LOOK[props.selectedStatus].soft
                        )}
                      >
                        {shownRows.length}
                      </span>
                    ) : null}
                  </div>

                  {holiday ? (
                    <span className="flex items-center gap-1 truncate text-[10px] text-violet-700 dark:text-violet-400">
                      <PartyPopper className="h-3 w-3 shrink-0" />
                      {holiday.name}
                    </span>
                  ) : null}

                  {/* The body of the square. */}
                  {props.selectedStatus === "all" ? (
                    <DayBarChart rows={rowsOfDay} maxCount={maxDailyCount} />
                  ) : (
                    <DayPeople
                      rows={shownRows}
                      status={props.selectedStatus}
                      isWeekend={isWeekend}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
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

        <span className="ml-auto text-xs text-muted-foreground">
          Press a day to see everybody of that day.
        </span>
      </div>
    </Card>
  );
}

// What one square shows when no status is selected: a tiny bar chart with
// one bar per status, each in its own colour, so the whole month can be
// read as a picture of "many green, a little red" without any numbers.
//
// maxCount is the tallest bar of the month (see the parent), and every bar
// is drawn as a part of it, so a bar of the same height always means the
// same number of people on any day of the month.
function DayBarChart(props: { rows: Attendance[]; maxCount: number }) {
  const bars = ATTENDANCE_STATUS_ORDER.map((status) => ({
    status: status,
    count: props.rows.filter((row) => row.status === status).length,
  }));

  const totalPeople = bars.reduce((sum, bar) => sum + bar.count, 0);

  // A day nobody was marked on stays empty instead of showing five flat
  // bars, so an empty day and a busy day never look the same.
  if (totalPeople === 0) {
    return null;
  }

  return (
    <div className="mt-auto flex flex-col gap-1">
      {/* The numbers, each one over its own bar, in one straight row so a
          day with a few people still reads as exact numbers, not only as
          shapes. */}
      <div className="flex items-end justify-between gap-1">
        {bars.map((bar) => (
          <span
            key={bar.status}
            className="flex-1 text-center text-[9px] leading-none font-semibold text-muted-foreground tabular-nums"
          >
            {bar.count > 0 ? bar.count : ""}
          </span>
        ))}
      </div>

      {/* The bars themselves: one thin coloured column per status, standing
          on a hairline baseline. A status with nobody shows only a faint
          dot of its colour, so the row keeps its shape and its colours
          without five empty boxes shouting for attention. */}
      <div className="flex h-9 items-end justify-between gap-1 border-b border-border">
        {bars.map((bar) => {
          const look = ATTENDANCE_STATUS_LOOK[bar.status];

          // The height as a part of the tallest bar of the whole month, so
          // a bar of the same height always means the same count of people.
          const heightPercent = (bar.count / props.maxCount) * 100;

          return (
            <div
              key={bar.status}
              title={look.label + ": " + bar.count}
              className="flex flex-1 justify-center"
            >
              {bar.count > 0 ? (
                <div
                  className={cn(
                    "w-1.5 rounded-full transition-all",
                    look.solid
                  )}
                  // A real bar never gets so short it disappears: it keeps
                  // at least a small stub so its colour stays readable.
                  style={{ height: "max(12%, " + heightPercent + "%)" }}
                />
              ) : (
                // Nobody in this status today: a faint dot on the baseline.
                <div
                  className={cn(
                    "h-1.5 w-1.5 self-end rounded-full opacity-25",
                    look.solid
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// What one square shows when a status is selected: the people themselves.
function DayPeople(props: {
  rows: Attendance[];
  status: AttendanceStatus;
  isWeekend: boolean;
}) {
  if (props.rows.length === 0) {
    return (
      <span className="mt-auto text-[10px] text-muted-foreground">
        {props.isWeekend ? "" : "Nobody"}
      </span>
    );
  }

  const look = ATTENDANCE_STATUS_LOOK[props.status];
  const shownRows = props.rows.slice(0, CHIPS_PER_SQUARE);
  const hiddenCount = props.rows.length - shownRows.length;

  return (
    <div className="flex flex-col gap-1 overflow-hidden">
      {shownRows.map((row) => {
        const employee = readEmployeeOf(row);

        if (!employee) {
          return null;
        }

        return (
          <PersonChip
            key={row._id}
            name={employee.name}
            photo={employee.photo}
            colorClass={look.soft}
            title={employee.name + " · " + look.label}
          />
        );
      })}

      {hiddenCount > 0 ? (
        <span className="pl-1 text-[10px] font-medium text-muted-foreground">
          {"+" + hiddenCount + " more"}
        </span>
      ) : null}
    </div>
  );
}
