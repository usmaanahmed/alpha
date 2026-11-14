import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Palmtree,
  LogOut,
  HeartPulse,
  CalendarRange,
  CalendarDays,
  SlidersHorizontal,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/common/Avatar";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/employee.types";
import type { LeaveRequest } from "@/types/hr.types";
import { isApprovedLeave } from "@/lib/leaveStatus";

// How many days the timeline shows at once. Two full weeks (Monday to
// Sunday, twice) keeps the weekends in the same columns, like the design.
const DAYS_SHOWN = 14;

// How many employee rows we draw before we stop and point to the full list,
// so the card never grows taller than the screen.
const MAX_ROWS = 6;

// One millisecond count for a whole day, used to count days between dates.
const DAY_MS = 24 * 60 * 60 * 1000;

// The short week day names. getDay() gives 0 for Sunday, so Sunday is first.
const WEEK_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// The diagonal stripes painted inside a weekend cell. It is a plain css
// pattern, so it needs no image file.
const WEEKEND_HATCH = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(100,116,139,0.16) 0px, rgba(100,116,139,0.16) 1.5px, transparent 1.5px, transparent 8px)",
};

// The fourteen equal day columns, given to every grid so the header, the
// cells and the "today" line always share the same column lines.
const GRID_COLUMNS = { gridTemplateColumns: "repeat(14, minmax(0, 1fr))" };

// The width of the left column that holds the person. The header and every
// row use the same value so the day columns line up under each other.
const LABEL_WIDTH = "w-52 sm:w-60";

// --- The look of one kind of absence ---------------------------------------
//
// A leave type made by the organization has a free name, so we look at the
// name for a keyword and pick a colour and an icon from it. Anything we do
// not recognise falls back to the indigo "other" look.
//
// Every kind has two looks: "solid" for an approved leave (a full colour
// bar with white text) and "soft" for a leave that is still waiting (a light
// tinted bar with dark text). The class names are written out in full so
// Tailwind keeps them in the final css.
interface AbsenceLook {
  icon: LucideIcon;
  solid: string; // the whole bar, approved
  soft: string; // the whole bar, waiting
  iconSolid: string; // the round icon badge, approved
  iconSoft: string; // the round icon badge, waiting
  dot: string; // one flat colour, for the small dots on the phone view
}

// The soft (waiting) bars all share one glassy, floating look taken from the
// close up of the "Sick Leave" bar: a light translucent tint, a dark icon on
// a white circle and dark text. Only the tint colour changes per kind.
const SOFT_ICON = "bg-white text-slate-700 shadow-sm";

const ABSENCE_LOOK: Record<string, AbsenceLook> = {
  vacation: {
    icon: Palmtree,
    solid: "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white",
    soft: "bg-gradient-to-br from-emerald-200/90 via-emerald-100/85 to-emerald-50/70 text-slate-700 dark:from-emerald-500/30 dark:via-emerald-500/15 dark:to-emerald-500/10 dark:text-emerald-50",
    iconSolid: "bg-white/25 text-white",
    iconSoft: SOFT_ICON,
    dot: "bg-emerald-500",
  },
  paid: {
    icon: LogOut,
    solid: "bg-gradient-to-r from-violet-500 to-purple-500 text-white",
    soft: "bg-gradient-to-br from-violet-200/90 via-violet-100/85 to-violet-50/70 text-slate-700 dark:from-violet-500/30 dark:via-violet-500/15 dark:to-violet-500/10 dark:text-violet-50",
    iconSolid: "bg-white/25 text-white",
    iconSoft: SOFT_ICON,
    dot: "bg-violet-500",
  },
  sick: {
    icon: HeartPulse,
    solid: "bg-gradient-to-r from-sky-400 to-blue-500 text-white",
    soft: "bg-gradient-to-br from-sky-200/90 via-blue-100/85 to-sky-50/70 text-slate-700 dark:from-sky-500/30 dark:via-blue-500/15 dark:to-sky-500/10 dark:text-sky-50",
    iconSolid: "bg-white/25 text-white",
    iconSoft: SOFT_ICON,
    dot: "bg-sky-500",
  },
  other: {
    icon: CalendarRange,
    solid: "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white",
    soft: "bg-gradient-to-br from-indigo-200/90 via-indigo-100/85 to-indigo-50/70 text-slate-700 dark:from-indigo-500/30 dark:via-indigo-500/15 dark:to-indigo-500/10 dark:text-indigo-50",
    iconSolid: "bg-white/25 text-white",
    iconSoft: SOFT_ICON,
    dot: "bg-indigo-500",
  },
};

// Reads the free leave type name and decides which look to use.
function lookForLeaveType(name: string): AbsenceLook {
  const text = name.toLowerCase();

  if (text.includes("sick")) {
    return ABSENCE_LOOK.sick;
  }
  if (text.includes("vacation") || text.includes("annual")) {
    return ABSENCE_LOOK.vacation;
  }
  if (text.includes("paid") || text.includes("casual")) {
    return ABSENCE_LOOK.paid;
  }
  return ABSENCE_LOOK.other;
}

// --- Small date helpers ----------------------------------------------------

// "2026-07-25" -> a fixed number we can subtract to count days between days.
// We read the day as UTC so the answer never moves by one because of the
// timezone of the person looking at the screen.
function dayNumberOf(dayText: string) {
  const parts = dayText.split("-");
  return Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// Today written as "2026-07-25", built from the local clock by hand.
function todayText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

// "2026-07-25" -> "Jul 25", the short way we write a day everywhere.
function shortDate(dayText: string) {
  const date = new Date(dayText + "T00:00:00");

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// "2026-07-25" -> "Saturday, Jul 25", the title over the phone list.
function longDayLabel(dayText: string) {
  const date = new Date(dayText + "T00:00:00");

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

// One day of the strip, ready to draw.
interface StripDay {
  text: string; // "2026-07-25"
  weekDayName: string; // "Mon"
  dayNumber: number; // 25
  isWeekend: boolean;
  isToday: boolean;
}

// Builds the fourteen days we show. We start on the Monday of this week, so
// the two weekends always fall in the same columns (6, 7 and 13, 14) and the
// grid reads like the calendar in the design.
//
// weekOffset moves the whole window by whole weeks: 0 is this week, 1 is one
// week later, -1 is one week earlier. That is what the prev / next buttons
// change.
function buildDays(weekOffset: number): StripDay[] {
  const now = new Date();

  // How many days back from today to reach Monday. getDay() gives 0 for
  // Sunday, so Sunday has to walk six days back, not none.
  const weekDay = now.getDay();
  const backToMonday = weekDay === 0 ? 6 : weekDay - 1;

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - backToMonday + weekOffset * 7
  );
  const today = todayText();

  const days: StripDay[] = [];

  for (let index = 0; index < DAYS_SHOWN; index++) {
    const date = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + index
    );

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const text = year + "-" + month + "-" + day;
    const dow = date.getDay();

    days.push({
      text: text,
      weekDayName: WEEK_DAY_NAMES[dow],
      dayNumber: date.getDate(),
      isWeekend: dow === 0 || dow === 6,
      isToday: text === today,
    });
  }

  return days;
}

// One absence bar already measured for the grid.
interface AbsenceBar {
  id: string;
  startColumn: number; // first column it covers, 0 for the first day
  endColumn: number; // last column it covers
  widthInDays: number;
  leaveTypeName: string;
  isApproved: boolean;
  look: AbsenceLook;
}

// Turns the leaves of one employee into the bars that fit inside the strip.
// We keep only approved and waiting leaves, and cut every bar to the edges
// of the strip so it never sticks out of the fourteen days.
function barsForEmployee(
  employeeId: string,
  leaves: LeaveRequest[],
  days: StripDay[]
): AbsenceBar[] {
  const firstDay = dayNumberOf(days[0].text);
  const lastDay = dayNumberOf(days[days.length - 1].text);

  const bars: AbsenceBar[] = [];

  for (const leave of leaves) {
    if (leave.employee._id !== employeeId) {
      continue;
    }
    if (!isApprovedLeave(leave.status) && leave.status !== "pending") {
      continue;
    }

    const from = dayNumberOf(leave.fromDate.slice(0, 10));
    const to = dayNumberOf(leave.toDate.slice(0, 10));

    // The leave is completely outside our two weeks.
    if (to < firstDay || from > lastDay) {
      continue;
    }

    const clampedFrom = from < firstDay ? firstDay : from;
    const clampedTo = to > lastDay ? lastDay : to;

    const startColumn = Math.round((clampedFrom - firstDay) / DAY_MS);
    const endColumn = Math.round((clampedTo - firstDay) / DAY_MS);

    bars.push({
      id: leave._id,
      startColumn: startColumn,
      endColumn: endColumn,
      widthInDays: endColumn - startColumn + 1,
      leaveTypeName: leave.leaveType.name,
      isApproved: isApprovedLeave(leave.status),
      look: lookForLeaveType(leave.leaveType.name),
    });
  }

  return bars;
}

// --- The phone view --------------------------------------------------------
//
// Fourteen columns of a timeline can only be read on a wide screen. On a
// phone we turn the same data around: one week of tappable days, and under
// the day you picked, the people who are away that day.
//
// One person away on one chosen day, ready to draw as a card.
interface DayAbsence {
  id: string;
  name: string;
  photo: string;
  subtitle: string; // the job title, or the department when there is none
  leaveTypeName: string;
  isApproved: boolean;
  look: AbsenceLook;
  fromText: string; // "2026-07-20"
  toText: string; // "2026-07-24"
  spanDays: number; // how many days the whole leave lasts
  dayInLeave: number; // which of those days the chosen day is, 1 for the first
  reason: string;
}

// Everybody who is away on one single day, sorted by name.
function absencesOnDay(
  dayText: string,
  leaves: LeaveRequest[],
  employees: Employee[]
): DayAbsence[] {
  const day = dayNumberOf(dayText);
  const list: DayAbsence[] = [];

  for (const leave of leaves) {
    if (!isApprovedLeave(leave.status) && leave.status !== "pending") {
      continue;
    }

    const from = dayNumberOf(leave.fromDate.slice(0, 10));
    const to = dayNumberOf(leave.toDate.slice(0, 10));

    // The chosen day is before the leave starts, or after it ends.
    if (day < from || day > to) {
      continue;
    }

    // The employee list carries the job title; the leave itself does not.
    const person = employees.find((one) => one._id === leave.employee._id);

    list.push({
      id: leave._id,
      name: leave.employee.name,
      photo: leave.employee.photo,
      subtitle:
        person && person.designation
          ? person.designation
          : leave.department.name,
      leaveTypeName: leave.leaveType.name,
      isApproved: isApprovedLeave(leave.status),
      look: lookForLeaveType(leave.leaveType.name),
      fromText: leave.fromDate.slice(0, 10),
      toText: leave.toDate.slice(0, 10),
      spanDays: Math.round((to - from) / DAY_MS) + 1,
      dayInLeave: Math.round((day - from) / DAY_MS) + 1,
      reason: leave.reason,
    });
  }

  list.sort((a, b) => a.name.localeCompare(b.name));

  return list;
}

export function PlannedAbsences(props: {
  employees: Employee[];
  leaves: LeaveRequest[];
  isLoading: boolean;
}) {
  // Which two weeks are on the screen. 0 is this week; the prev / next
  // buttons add or take away one.
  const [weekOffset, setWeekOffset] = useState(0);

  // Phone view only: which of the seven days is picked, 0 for Monday. It
  // starts on today, and it keeps the same weekday when the week is changed.
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const thisWeek = buildDays(0);
    const todayIndex = thisWeek.findIndex((day) => day.isToday);

    return todayIndex < 0 ? 0 : todayIndex;
  });

  // Phone view only: which card is open. An empty text means none of them.
  const [openCardId, setOpenCardId] = useState("");

  const days = buildDays(weekOffset);
  const shownEmployees = props.employees.slice(0, MAX_ROWS);

  // Which column is today, so the dashed line and the header card agree. It
  // is -1 when we have scrolled to a week that does not hold today.
  const todayColumn = days.findIndex((day) => day.isToday);

  // The range shown in the top pill, like "Jul 20 – Aug 2, 2026". It follows
  // the buttons, so a person always sees which two weeks they are looking at.
  const firstDate = new Date(days[0].text + "T00:00:00");
  const lastDate = new Date(days[days.length - 1].text + "T00:00:00");
  const rangeLabel =
    firstDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " – " +
    lastDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // The phone view shows one week, not two, so the pill there names only
  // those seven days, like "Jul 20 – Jul 26".
  const weekDays = days.slice(0, 7);
  const shortRangeLabel =
    shortDate(weekDays[0].text) + " – " + shortDate(weekDays[6].text);

  // Everybody away on each of the seven days. The small dots under a day
  // chip and the list under the strip both read this, so they always agree.
  const awayPerDay = weekDays.map((day) =>
    absencesOnDay(day.text, props.leaves, props.employees)
  );
  const selectedDay = weekDays[selectedIndex];
  const selectedAway = awayPerDay[selectedIndex];

  // Picking another day always closes the card that was open, so the list
  // never opens on a person who is not on the new day.
  function pickDay(index: number) {
    setSelectedIndex(index);
    setOpenCardId("");
  }

  // Moving the window a week keeps the same weekday picked, but the people
  // change, so the open card is closed here too.
  function moveWeek(step: number) {
    setWeekOffset(weekOffset + step);
    setOpenCardId("");
  }

  // The look shared by every rounded pill button in the header.
  const pillClass =
    "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent dark:border-slate-700 dark:bg-slate-800";
  const iconButtonClass =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-muted-foreground shadow-sm transition-colors hover:bg-accent dark:border-slate-700 dark:bg-slate-800";

  return (
    <Card className="gap-6 bg-slate-50/70 p-4 dark:bg-card sm:p-7">
      {/* The big title and the controls. On a phone the title takes its own
          line and the week buttons sit under it in one full width row, so
          nothing is squeezed. From sm up it is the old single row again. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Planned Absences
        </h2>

        <div className="flex items-center gap-2 sm:flex-wrap sm:gap-3">
          {/* Move the window one week back. */}
          <button
            type="button"
            onClick={() => moveWeek(-1)}
            title="Previous week"
            className={cn(iconButtonClass, "shrink-0")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* The date range. Pressing it jumps back to the current week. On a
              phone it stretches to fill the row and names one week only. */}
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            title="Back to this week"
            className={cn(
              pillClass,
              "min-w-0 flex-1 justify-center sm:flex-none sm:justify-start"
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate lg:hidden">{shortRangeLabel}</span>
            <span className="hidden lg:inline">{rangeLabel}</span>
          </button>

          {/* Move the window one week forward. */}
          <button
            type="button"
            onClick={() => moveWeek(1)}
            title="Next week"
            className={cn(iconButtonClass, "shrink-0")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Both of these lead to the same page, so on a narrow phone we
              keep only one of them, as an icon, and the list below ends with
              a full width "View all leaves" link. */}
          <Link
            to="/organization/leaves"
            className={cn(pillClass, "hidden sm:inline-flex")}
          >
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            Filter
          </Link>

          <Link
            to="/organization/leaves"
            title="View all"
            className={cn(pillClass, "shrink-0 sm:inline-flex")}
          >
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">View all</span>
          </Link>
        </div>
      </div>

      {/* --- The phone and tablet view: pick a day, read who is away. --- */}
      <div className="lg:hidden">
        {/* The seven days of the week as one row of tappable chips. They are
            an even grid, so all seven fit on the narrowest phone and nothing
            has to be scrolled sideways. */}
        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, index) => {
            const isSelected = index === selectedIndex;
            const awayThatDay = awayPerDay[index];

            return (
              <button
                key={day.text}
                type="button"
                onClick={() => pickDay(index)}
                aria-pressed={isSelected}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors",
                  isSelected
                    ? "border-transparent bg-blue-600 text-white shadow-md shadow-blue-600/30"
                    : day.isToday
                      ? "border-blue-500 bg-white text-blue-600 dark:bg-slate-800"
                      : day.isWeekend
                        ? "border-slate-200/70 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                        : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800"
                )}
              >
                <span
                  className={cn(
                    "text-[10px] leading-none",
                    isSelected ? "text-blue-100" : "text-muted-foreground"
                  )}
                >
                  {day.weekDayName}
                </span>
                <span className="text-base font-semibold tabular-nums leading-tight">
                  {day.dayNumber}
                </span>

                {/* One dot per person away, three at most. The box is always
                    there, even when it is empty, so every chip is the same
                    height. */}
                <span className="flex h-1.5 items-center gap-0.5">
                  {awayThatDay.slice(0, 3).map((one) => (
                    <span
                      key={one.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isSelected ? "bg-white" : one.look.dot
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* The chosen day, and how many people are away on it. */}
        <div className="mt-5 mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{longDayLabel(selectedDay.text)}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
              selectedAway.length === 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                : "bg-slate-200/70 text-slate-600 dark:bg-slate-700 dark:text-slate-200"
            )}
          >
            {selectedAway.length === 0
              ? "Everyone in"
              : selectedAway.length === 1
                ? "1 away"
                : selectedAway.length + " away"}
          </span>
        </div>

        {props.isLoading ? (
          <LoadingRows />
        ) : selectedAway.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-10 dark:border-slate-700">
            <CalendarCheck className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nobody is away on {shortDate(selectedDay.text)}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedAway.slice(0, MAX_ROWS).map((absence) => (
              <AbsenceCard
                key={absence.id}
                absence={absence}
                isOpen={absence.id === openCardId}
                onToggle={() =>
                  setOpenCardId(absence.id === openCardId ? "" : absence.id)
                }
              />
            ))}
          </div>
        )}

        {/* The way out of the card on a narrow phone, where the header has
            room for an icon only. */}
        <Link
          to="/organization/leaves"
          className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3 text-sm font-medium shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          {selectedAway.length > MAX_ROWS
            ? "View all " + selectedAway.length + " absences"
            : "View all leaves"}
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* --- The large screen view: the two week timeline. ---
          Fourteen columns plus the names only fit on a wide screen, so below
          lg the day picker above takes over and this is hidden. On a narrow
          laptop the strip keeps the width it really needs and slides sideways
          inside this box. The scrollbar belongs to the strip alone: the page
          itself must never grow wider than the screen, or every other panel
          on it would drift out of view too. */}
      <div className="-mx-1 hidden overflow-x-auto px-1 lg:block">
        <div className="min-w-240">
          {/* The header: an "Employees" label over the names, then a small
              rounded card for every day. */}
          <div className="mb-3 flex items-end">
            <div className={cn(LABEL_WIDTH, "shrink-0 pl-1")}>
              <span className="text-sm text-muted-foreground">Employees</span>
            </div>

            <div className="grid flex-1 gap-3" style={GRID_COLUMNS}>
              {days.map((day) => (
                <div
                  key={day.text}
                  className={cn(
                    "flex flex-col items-center rounded-2xl border py-2 shadow-md",
                    day.isToday
                      ? "border-transparent bg-blue-500 text-white shadow-blue-500/30"
                      : day.isWeekend
                        ? "border-slate-200/70 bg-slate-200/70 text-slate-500 dark:border-slate-700 dark:bg-slate-700/60 dark:text-slate-300"
                        : "border-slate-200/70 bg-white dark:border-slate-700 dark:bg-slate-800"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs",
                      day.isToday ? "text-blue-100" : "text-muted-foreground"
                    )}
                  >
                    {day.weekDayName}
                  </span>
                  <span className="text-lg font-semibold tabular-nums leading-tight">
                    {day.dayNumber}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The rows, with the blue dashed "today" line laid over them. */}
          <div className="relative">
            {props.isLoading ? (
              <LoadingRows />
            ) : shownEmployees.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No employees yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {shownEmployees.map((employee) => (
                  <EmployeeRow
                    key={employee._id}
                    employee={employee}
                    days={days}
                    bars={barsForEmployee(employee._id, props.leaves, days)}
                  />
                ))}
              </div>
            )}

            {/* The one continuous dashed line down the "today" column. It
                lives in its own grid with the same columns and gap, so it
                sits exactly over the middle of that day. */}
            {todayColumn >= 0 && !props.isLoading && shownEmployees.length > 0 ? (
              <div className="pointer-events-none absolute inset-0 flex">
                <div className={cn(LABEL_WIDTH, "shrink-0")} />
                <div
                  className="grid h-full flex-1 gap-3"
                  style={{ ...GRID_COLUMNS, gridTemplateRows: "1fr" }}
                >
                  <div
                    style={{ gridColumn: todayColumn + 1, gridRow: 1 }}
                    className="flex h-full justify-center"
                  >
                    <span className="h-full border-l-2 border-dashed border-blue-500/70" />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* The legend, so nobody has to guess what a colour means. The closing
          sentence is about the pale bars of the timeline, so it only shows
          where that timeline is. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
        <LegendDot className="bg-emerald-500" label="Vacation" />
        <LegendDot className="bg-violet-500" label="Paid leave" />
        <LegendDot className="bg-sky-500" label="Sick leave" />
        <LegendDot className="bg-indigo-500" label="Other" />
        <span className="ml-auto hidden lg:inline">
          A light bar is still waiting for approval.
        </span>
      </div>
    </Card>
  );
}

// One line: the person card on the left, then their absence bars laid over
// the fourteen day cells on the right.
function EmployeeRow(props: {
  employee: Employee;
  days: StripDay[];
  bars: AbsenceBar[];
}) {
  return (
    <div className="flex items-center gap-4">
      {/* The person, inside their own white card. */}
      <div
        className={cn(
          LABEL_WIDTH,
          "flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-md dark:border-slate-700 dark:bg-slate-800"
        )}
      >
        <Avatar
          name={props.employee.name}
          photo={props.employee.photo}
          size="md"
          className="h-11 w-11 text-sm"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {props.employee.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {props.employee.designation || props.employee.department.name}
          </p>
        </div>
      </div>

      {/* The day area. The empty cells and the absence bars share the same
          fourteen column grid, so a bar that covers columns 3 to 6 sits
          exactly over those four days. */}
      <div className="grid flex-1 items-center gap-3 mb-2" style={GRID_COLUMNS}>
        {/* The background cells: one per day. */}
        {props.days.map((day, index) => (
          <div
            key={day.text}
            style={{ gridColumn: index + 1, gridRow: 1, ...(day.isWeekend ? WEEKEND_HATCH : {}) }}
            className={cn(
              "h-16 rounded-2xl border border-slate-200/60 shadow-md",
              day.isWeekend
                ? "bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/40"
                : "bg-white dark:border-slate-700/60 dark:bg-slate-800/60"
            )}
          />
        ))}

        {/* The bars themselves, placed on top of the cells. */}
        {props.bars.map((bar) => (
          <div
            key={bar.id}
            style={{
              gridColumn: bar.startColumn + 1 + " / " + (bar.endColumn + 2),
              gridRow: 1,
            }}
            className="z-10 flex justify-center px-0.5"
          >
            <AbsencePill bar={bar} />
          </div>
        ))}
      </div>
    </div>
  );
}

// One rounded leave bar: a round icon badge, the leave name, and a white
// status chip on the right.
//
// An approved leave is a single flat, solid bar. A waiting leave is drawn as
// two stacked glass cards, exactly like the design: the bar you read plus a
// lighter rectangle peeking out just behind it at the bottom and the right.
function AbsencePill(props: { bar: AbsenceBar }) {
  const bar = props.bar;
  const Icon = bar.look.icon;

  // The bar itself. It is marked "relative" so, when there is a card behind
  // it, it always paints on top of that card.
  const frontBar = (
    <div
      title={bar.leaveTypeName}
      className={cn(
        "relative flex h-12 w-full items-center gap-2.5 overflow-hidden rounded-2xl pl-1.5 pr-2",
        bar.isApproved
          ? cn(bar.look.solid, "shadow-md")
          : cn(
              bar.look.soft,
              "rotate-6 border border-white/60 shadow-xl shadow-slate-400/25 ring-1 ring-white/40 backdrop-blur-sm"
            )
      )}
    >
      {/* The round icon badge. */}
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          bar.isApproved ? bar.look.iconSolid : bar.look.iconSoft
        )}
      >
        <Icon className="h-5 w-5" />
      </span>

      <span className="truncate text-sm font-medium">{bar.leaveTypeName}</span>

      {/* The status chip only fits on a bar of three days or more. */}
      {bar.widthInDays >= 3 ? (
        <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-200">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              bar.isApproved ? "bg-emerald-500" : "bg-slate-800 dark:bg-slate-300"
            )}
          />
          {bar.isApproved ? "Approved" : "Pending"}
        </span>
      ) : null}
    </div>
  );

  // Approved leave: just the one bar.
  if (bar.isApproved) {
    return frontBar;
  }

  // Waiting leave: the bar plus a lighter card stacked below and to the
  // right, so it reads as two floating glass rectangles. The back card has a
  // faint blue tint (not plain white) so it stays visible against the white
  // day cells behind it, and a soft shadow to lift the pair off the grid.
  return (
    <div className="relative w-full">
      <div
        aria-hidden="true"
        className="absolute inset-0  rounded-2xl bg-gradient-to-b from-sky-100 to-white shadow-lg shadow-slate-500/25 ring-1 ring-white/70 dark:from-slate-700 dark:to-slate-800 dark:ring-white/10"
      />
      {frontBar}
    </div>
  );
}

// One person away, drawn as a card on the phone view.
//
// The whole top half is one big button, so a thumb can open it anywhere. It
// folds open to show how far the leave has run, why it was asked for, and a
// way into the leaves page.
function AbsenceCard(props: {
  absence: DayAbsence;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const absence = props.absence;
  const Icon = absence.look.icon;

  // How much of the leave is already behind us, as a percent, for the thin
  // bar in the open half.
  const progress = Math.round((absence.dayInLeave / absence.spanDays) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* The colour of the leave kind, as a stripe down the left edge. */}
      <span
        aria-hidden="true"
        className={cn("absolute left-0 top-0 h-full w-1.5", absence.look.dot)}
      />

      <button
        type="button"
        onClick={props.onToggle}
        aria-expanded={props.isOpen}
        className="flex w-full items-center gap-3 py-3 pl-5 pr-3 text-left"
      >
        <Avatar
          name={absence.name}
          photo={absence.photo}
          size="md"
          className="h-11 w-11 text-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {absence.name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {absence.subtitle}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* The leave kind, in its own colour. A solid chip is approved,
                a pale one is still waiting, the same as on the timeline. */}
            <span
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                absence.isApproved ? absence.look.solid : absence.look.soft
              )}
            >
              <Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{absence.leaveTypeName}</span>
            </span>

            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-200">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  absence.isApproved
                    ? "bg-emerald-500"
                    : "bg-slate-400 dark:bg-slate-300"
                )}
              />
              {absence.isApproved ? "Approved" : "Pending"}
            </span>
          </div>
        </div>

        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            props.isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      {props.isOpen ? (
        <div className="border-t border-slate-200/70 py-3 pl-5 pr-3 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-medium">
              {shortDate(absence.fromText)} – {shortDate(absence.toText)}
            </span>
            <span className="text-muted-foreground">
              Day {absence.dayInLeave} of {absence.spanDays}
            </span>
          </div>

          {/* How far the leave has run by the chosen day. */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className={cn("h-full rounded-full", absence.look.dot)}
              style={{ width: progress + "%" }}
            />
          </div>

          {absence.reason ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {absence.reason}
            </p>
          ) : null}

          <Link
            to="/organization/leaves"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400"
          >
            Open in Leaves
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// The grey placeholder rows shown while the data is still loading.
function LoadingRows() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
      ))}
    </div>
  );
}

// One small square and a word, used in the legend under the strip.
function LegendDot(props: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-sm", props.className)} />
      {props.label}
    </span>
  );
}
