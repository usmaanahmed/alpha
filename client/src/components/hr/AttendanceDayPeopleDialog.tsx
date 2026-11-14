import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { AttendanceStatusBadge } from "@/components/hr/AttendanceStatusBadge";
import {
  ATTENDANCE_STATUS_LOOK,
  ATTENDANCE_STATUS_ORDER,
  readEmployeeOf,
} from "@/lib/attendanceStatus";
import { formatTime } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { Attendance } from "@/types/hr.types";

// Everybody of one day, opened by pressing a square of the calendar.
//
// The list is grouped by status, so the answer to "who was absent on
// Monday?" is one block of the dialog and not something to look for.
//
// dayText is "2026-07-30", and null means the dialog is closed.
export function AttendanceDayPeopleDialog(props: {
  dayText: string | null;
  rows: Attendance[];
  onClose: () => void;
}) {
  // The day written the way a person reads it.
  const dayName = props.dayText
    ? new Date(props.dayText + "T00:00:00Z").toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";

  // The statuses that really have somebody on this day, in the usual order.
  const groups = ATTENDANCE_STATUS_ORDER.map((status) => ({
    status: status,
    rows: props.rows.filter((row) => row.status === status),
  })).filter((group) => group.rows.length > 0);

  return (
    <Dialog open={props.dayText !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dayName}</DialogTitle>
          <DialogDescription>
            {props.rows.length === 0
              ? "Nobody was marked on this day."
              : props.rows.length + " employees were marked on this day."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {groups.map((group) => {
            const look = ATTENDANCE_STATUS_LOOK[group.status];

            return (
              <div key={group.status} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AttendanceStatusBadge status={group.status} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {group.rows.length}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  {group.rows.map((row) => {
                    const employee = readEmployeeOf(row);

                    if (!employee) {
                      return null;
                    }

                    return (
                      <div
                        key={row._id}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border-l-2 py-1.5 pr-2 pl-3",
                          look.border
                        )}
                      >
                        <EmployeeAvatar
                          name={employee.name}
                          photo={employee.photo}
                          subtitle={employee.designation}
                        />

                        <div className="shrink-0 text-right">
                          {row.checkIn ? (
                            <p className="text-xs tabular-nums">
                              {formatTime(row.checkIn) +
                                " - " +
                                formatTime(row.checkOut)}
                            </p>
                          ) : null}

                          {row.remarks ? (
                            <p
                              className="max-w-40 truncate text-xs text-muted-foreground"
                              title={row.remarks}
                            >
                              {row.remarks}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
