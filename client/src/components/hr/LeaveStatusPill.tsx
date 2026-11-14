import { LEAVE_STATUS_LOOK } from "@/lib/leaveStatus";
import type { LeaveRequestStatus } from "@/types/hr.types";

// The coloured pill that shows the status of one leave request.
// The colours and the icon come from LEAVE_STATUS_LOOK, so a status looks
// the same on every page of the module.
export function LeaveStatusPill(props: { status: LeaveRequestStatus }) {
  const look = LEAVE_STATUS_LOOK[props.status];
  const Icon = look.icon;

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
        look.soft
      }
    >
      <Icon className="h-3.5 w-3.5" />
      {look.label}
    </span>
  );
}
