import {
  CheckCircle2,
  XCircle,
  Clock4,
  Plane,
  PartyPopper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Attendance, AttendanceStatus } from "@/types/hr.types";

// What we keep about one status.
interface StatusLook {
  label: string;
  icon: LucideIcon;
  // The soft background of a pill or a calendar day.
  soft: string;
  // The same colour but full, used for the small dots and bars.
  solid: string;
  border: string;
}

// Everything about how one attendance status looks lives here: the words a
// person reads, the icon, and the colours.
//
// The theme of the app is grey on purpose, so the statuses bring their own
// colours. Every colour is written twice: once for the light theme and once
// for the dark one, so both stay easy to read.
//
// The class names must be written in full here and never built by joining
// pieces of text, because Tailwind reads this file to know which classes to
// put in the final css file. "bg-" + colour would give it nothing to find.
export const ATTENDANCE_STATUS_LOOK: Record<AttendanceStatus, StatusLook> = {
  present: {
    label: "Present",
    icon: CheckCircle2,
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    solid: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  absent: {
    label: "Absent",
    icon: XCircle,
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    solid: "bg-rose-500",
    border: "border-rose-500/30",
  },
  half_day: {
    label: "Half day",
    icon: Clock4,
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    solid: "bg-amber-500",
    border: "border-amber-500/30",
  },
  on_leave: {
    label: "On leave",
    icon: Plane,
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    solid: "bg-sky-500",
    border: "border-sky-500/30",
  },
  holiday: {
    label: "Holiday",
    icon: PartyPopper,
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    solid: "bg-violet-500",
    border: "border-violet-500/30",
  },
};

// The five statuses in the order we always want to show them.
export const ATTENDANCE_STATUS_ORDER: AttendanceStatus[] = [
  "present",
  "absent",
  "half_day",
  "on_leave",
  "holiday",
];

// A normal working day is 8 hours. The progress bars use this to know
// what "a full day" means.
export const FULL_WORK_DAY_HOURS = 8;

// The employee of an attendance row.
//
// On the pages of the organization the server fills the employee in, so it
// is a whole object with the name and the photo. On the page where somebody
// reads its own month it stays only an id, because the name is already at
// the top of the screen. This tells the two apart and gives null for the
// second one.
export function readEmployeeOf(attendance: Attendance) {
  if (typeof attendance.employee === "string") {
    return null;
  }

  return attendance.employee;
}
