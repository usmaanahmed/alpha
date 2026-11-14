import { ATTENDANCE_STATUS_LOOK } from "@/lib/attendanceStatus";
import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/types/hr.types";

// A small coloured pill with an icon, for example a green "Present".
//
// It does not use the Badge component of the ui folder, because that one
// only knows the grey colours of the theme, and here every status needs
// its own colour to be seen at one glance.
export function AttendanceStatusBadge(props: {
  status: AttendanceStatus;
  className?: string;
}) {
  const look = ATTENDANCE_STATUS_LOOK[props.status];
  const Icon = look.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        look.soft,
        props.className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {look.label}
    </span>
  );
}
