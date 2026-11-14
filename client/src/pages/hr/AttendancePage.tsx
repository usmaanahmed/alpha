import { useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/common/PageHeader";
import { AttendanceSummaryCards } from "@/components/hr/AttendanceSummaryCards";
import { AttendanceDayTable } from "@/components/hr/AttendanceDayTable";
import type { EmployeeDayRow } from "@/components/hr/AttendanceDayTable";
import { MarkAttendanceDialog } from "@/components/hr/MarkAttendanceDialog";
import { useAttendanceOfDay, useMarkAttendance } from "@/hooks/useAttendance";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import { todayInputValue, toTimeInputValue } from "@/lib/date";
import { readEmployeeOf } from "@/lib/attendanceStatus";
import type { Attendance, AttendanceStatus } from "@/types/hr.types";

// Move a date text like "2026-07-30" forward or back by some days.
// We build a Date from the text, change the day, and cut the text back out
// of it. Date does the hard part: 31 July plus one day is 1 August.
function shiftDay(dayText: string, howManyDays: number) {
  const date = new Date(dayText + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + howManyDays);
  return date.toISOString().slice(0, 10);
}

// The attendance of the whole organization for one day.
//
// The page is opened by "attendance.view_all". Fixing a day is a second
// permission, "attendance.edit": without it the same table is shown with
// every switch, time and pencil turned off, so somebody can read the day
// without being able to change it.
export function AttendancePage() {
  const { can } = useAuth();
  const canEdit = can(PERMISSIONS.ATTENDANCE_EDIT);

  const today = todayInputValue();

  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "all">(
    "all"
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [attendanceToEdit, setAttendanceToEdit] = useState<Attendance | null>(
    null
  );
  // The employee the dialog opens with when the day has no row yet.
  const [employeeToMark, setEmployeeToMark] = useState("");
  // The switch we are saving right now, so only that one line waits.
  const [savingEmployeeId, setSavingEmployeeId] = useState<string | null>(null);

  const attendanceQuery = useAttendanceOfDay(date);
  const employeesQuery = useEmployees();
  const markAttendance = useMarkAttendance();

  const attendanceRows = attendanceQuery.data || [];

  const activeEmployees = (employeesQuery.data || []).filter(
    (employee) => employee.status === "active"
  );

  // The table shows every active employee, so we put the attendance of the
  // day next to each of them. Somebody nobody marked yet gets null.
  const employeeRows: EmployeeDayRow[] = activeEmployees.map((employee) => {
    const attendance = attendanceRows.find(
      (row) => readEmployeeOf(row)?._id === employee._id
    );

    return {
      employeeId: employee._id,
      name: employee.name,
      photo: employee.photo,
      designation: employee.designation,
      departmentName: employee.department?.name || "",
      attendance: attendance || null,
    };
  });

  // How many active employees have no row at all on this day.
  const notMarkedCount = employeeRows.filter(
    (row) => row.attendance === null
  ).length;

  // The tiles filter by status. The search box and the department filter are
  // inside the table itself, so they are not repeated here.
  const shownRows = employeeRows.filter((row) => {
    if (statusFilter !== "all" && row.attendance?.status !== statusFilter) {
      return false;
    }

    return true;
  });

  function openCreateForm() {
    setAttendanceToEdit(null);
    setEmployeeToMark("");
    setIsFormOpen(true);
  }

  // Opened from the "Mark Attendance" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, canEdit);

  // The pencil of one line. When that day has no row yet, the dialog opens
  // empty but with this employee already chosen.
  function openEditForm(row: EmployeeDayRow) {
    setAttendanceToEdit(row.attendance);
    setEmployeeToMark(row.employeeId);
    setIsFormOpen(true);
  }

  // The switch of one line. Present and absent are the two everyday
  // answers, so they are saved straight from the table. Everything else
  // (a half day, a leave, the times, the remarks) stays in the dialog.
  //
  // The server writes the whole row again every time, so we send the times
  // and the remarks it already has back with it. Marking somebody absent
  // clears the times, because an absent day has no hours.
  function togglePresent(row: EmployeeDayRow, isPresent: boolean) {
    setSavingEmployeeId(row.employeeId);

    markAttendance.mutate(
      {
        employee: row.employeeId,
        date: date,
        status: isPresent ? "present" : "absent",
        checkIn: isPresent ? toTimeInputValue(row.attendance?.checkIn) : "",
        checkOut: isPresent ? toTimeInputValue(row.attendance?.checkOut) : "",
        remarks: row.attendance?.remarks || "",
      },
      { onSettled: () => setSavingEmployeeId(null) }
    );
  }

  // One of the two times of a line was changed. We send both times back
  // together, because the server counts the hours from the pair of them
  // and writes the whole row again every time.
  function changeTime(
    row: EmployeeDayRow,
    field: "checkIn" | "checkOut",
    time: string
  ) {
    const checkIn =
      field === "checkIn" ? time : toTimeInputValue(row.attendance?.checkIn);
    const checkOut =
      field === "checkOut" ? time : toTimeInputValue(row.attendance?.checkOut);

    // Writing a time means the person was here, so a line nobody marked yet
    // and a line marked absent both become present. A half day, a leave and
    // a holiday are left alone, because somebody chose them on purpose.
    let status: AttendanceStatus = row.attendance?.status || "absent";

    if (time !== "" && status === "absent") {
      status = "present";
    }

    setSavingEmployeeId(row.employeeId);

    markAttendance.mutate(
      {
        employee: row.employeeId,
        date: date,
        status: status,
        checkIn: checkIn,
        checkOut: checkOut,
        remarks: row.attendance?.remarks || "",
      },
      { onSettled: () => setSavingEmployeeId(null) }
    );
  }

  // The day we are looking at, written the way a person reads it.
  const dayName = new Date(date + "T00:00:00Z").toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Who came on this day. Press the switch on a line to mark somebody present or absent, or open the pencil for the times and the remarks."
        action={
          canEdit ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Mark Attendance
            </Button>
          ) : null
        }
      />

      {/* The day bar: arrows, the day itself, and a jump back to today. */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(shiftDay(date, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDate(shiftDay(date, 1))}
            // Nobody can have come on a day that has not happened yet.
            disabled={date >= today}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mr-auto">
          <p className="text-sm font-medium">{dayName}</p>
          <p className="text-xs text-muted-foreground">
            {date === today ? "Today" : "Past day"}
          </p>
        </div>

        {date !== today ? (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Back to today
          </Button>
        ) : null}

        <Input
          type="date"
          value={date}
          max={today}
          onChange={(event) => setDate(event.target.value)}
          className="w-full sm:w-44"
        />
      </div>

      <div className="mb-6">
        <AttendanceSummaryCards
          data={attendanceRows}
          extraTile={{ label: "Not marked", value: notMarkedCount }}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
      </div>

      {/* The search box and the department filter live inside the table now,
          in its own toolbar. The tiles above stay here, because they also
          count the day. */}
      <AttendanceDayTable
        rows={shownRows}
        isLoading={attendanceQuery.isLoading || employeesQuery.isLoading}
        isFetching={attendanceQuery.isFetching || employeesQuery.isFetching}
        onEdit={openEditForm}
        onTogglePresent={togglePresent}
        onChangeTime={changeTime}
        savingEmployeeId={savingEmployeeId}
        canEdit={canEdit}
      />

      <MarkAttendanceDialog
        isOpen={isFormOpen}
        attendance={attendanceToEdit}
        employeeId={employeeToMark}
        date={date}
        onClose={() => setIsFormOpen(false)}
      />
    </div>
  );
}
