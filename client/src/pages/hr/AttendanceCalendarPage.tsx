import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceSummaryCards } from "@/components/hr/AttendanceSummaryCards";
import { OrganizationAttendanceCalendar } from "@/components/hr/OrganizationAttendanceCalendar";
import { AttendanceDayPeopleDialog } from "@/components/hr/AttendanceDayPeopleDialog";
import { useAttendanceOfMonth } from "@/hooks/useAttendance";
import { ATTENDANCE_STATUS_LOOK } from "@/lib/attendanceStatus";
import type { AttendanceStatus } from "@/types/hr.types";

// The whole organization for a whole month, drawn as a calendar with the
// people inside the squares.
//
// The tiles at the top do two jobs: they count the month, and pressing one
// of them tells the calendar which people to draw. Pressing "Absent" turns
// every square into the list of the people who were absent on that day.
//
// Only the organization account and an HR can open this page.
export function AttendanceCalendarPage() {
  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  // 1 is January, like everywhere else in the HR module.
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | "all">(
    "absent"
  );
  // The day whose dialog is open, as "2026-07-30". null means no dialog.
  const [openDay, setOpenDay] = useState<string | null>(null);

  const monthQuery = useAttendanceOfMonth({ year: year, month: month });

  const attendances = monthQuery.data?.attendances || [];
  const holidays = monthQuery.data?.holidays || [];

  // The rows of the day the dialog is showing.
  const rowsOfOpenDay = openDay
    ? attendances.filter((row) => row.date.slice(0, 10) === openDay)
    : [];

  // Going back from January must land on December of the year before, and
  // going forward from December on January of the year after.
  function goToPreviousMonth() {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToThisMonth() {
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }

  // The name of the month we are looking at, for example "July 2026".
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  const isThisMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // The sentence under the title, which changes with the chosen tile so it
  // always says what the squares are showing right now.
  const shownLabel =
    selectedStatus === "all"
      ? "everybody, counted per status"
      : "the employees who were " +
        ATTENDANCE_STATUS_LOOK[selectedStatus].label.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      {/* The coloured stripe at the top, the same one the leave pages use. */}
      <div className="relative overflow-hidden rounded-2xl border bg-linear-to-br from-primary/8 via-card to-emerald-500/10 p-4 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="h-4 w-4" />
              Attendance calendar
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {monthName}
            </h1>

            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {"Every square shows " + shownLabel + "."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {!isThisMonth ? (
              <Button variant="ghost" size="sm" onClick={goToThisMonth}>
                This month
              </Button>
            ) : null}

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              // Nobody can have come in a month that has not started yet.
              disabled={isThisMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <AttendanceSummaryCards
        data={attendances}
        selected={selectedStatus}
        onSelect={setSelectedStatus}
      />

      <OrganizationAttendanceCalendar
        attendances={attendances}
        holidays={holidays}
        year={year}
        month={month}
        isLoading={monthQuery.isLoading}
        selectedStatus={selectedStatus}
        onOpenDay={setOpenDay}
      />

      <AttendanceDayPeopleDialog
        dayText={openDay}
        rows={rowsOfOpenDay}
        onClose={() => setOpenDay(null)}
      />
    </div>
  );
}
