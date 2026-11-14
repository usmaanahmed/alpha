import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { CheckInOutCard } from "@/components/hr/CheckInOutCard";
import { AttendanceSummaryCards } from "@/components/hr/AttendanceSummaryCards";
import { AttendanceCalendar } from "@/components/hr/AttendanceCalendar";
import { MyAttendanceTable } from "@/components/hr/MyAttendanceTable";
import { useMyAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { cn } from "@/lib/utils";

// The page of the employee: the check in / check out card at the top, then
// the month, shown either as a calendar or as a list.
export function MyAttendancePage() {
  // Checking yourself in is a section of its own: an organization can be
  // sold the attendance module while only a manager writes the days.
  const { hasFeature } = useAuth();

  const now = new Date();

  const [year, setYear] = useState(now.getFullYear());
  // 1 is January, like everywhere else in the HR module.
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState<"calendar" | "list">("calendar");

  const attendanceQuery = useMyAttendance({ year: year, month: month });
  const days = attendanceQuery.data || [];

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

  // The name of the month we are looking at, for example "July 2026".
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
    undefined,
    { month: "long", year: "numeric", timeZone: "UTC" }
  );

  // We cannot see a month that has not happened yet.
  const isThisMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  // All the hours of the month added together.
  const totalHours = days.reduce((sum, day) => sum + day.workedHours, 0);

  return (
    <div>
      <PageHeader
        title="My attendance"
        description={
          hasFeature(FEATURES.ATTENDANCE_SELF_CHECKIN)
            ? "Check in when you start and check out when you finish. Your hours are counted from those two times."
            : "The days your organization wrote for you, month by month."
        }
      />

      {hasFeature(FEATURES.ATTENDANCE_SELF_CHECKIN) ? (
        <div className="mb-6">
          <CheckInOutCard />
        </div>
      ) : null}

      {/* The month bar: arrows on the left, the two views on the right. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="min-w-32 text-center text-sm font-medium sm:min-w-40">
            {monthName}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            disabled={isThisMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <span className="w-full text-sm text-muted-foreground sm:ml-3 sm:w-auto">
            {/* Math.round(x * 10) / 10 keeps one number after the point. */}
            {Math.round(totalHours * 10) / 10 + " hours this month"}
          </span>
        </div>

        {/* Two buttons that look like one switch. */}
        <div className="flex rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              view === "calendar"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              view === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>
      </div>

      <div className="mb-6">
        <AttendanceSummaryCards data={days} />
      </div>

      {view === "calendar" ? (
        <AttendanceCalendar
          data={days}
          year={year}
          month={month}
          isLoading={attendanceQuery.isLoading}
        />
      ) : (
        <MyAttendanceTable
          data={days}
          isLoading={attendanceQuery.isLoading}
          isFetching={attendanceQuery.isFetching}
        />
      )}
    </div>
  );
}
