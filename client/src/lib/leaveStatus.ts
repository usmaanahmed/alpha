import { Clock4, CheckCircle2, CircleDashed, XCircle, Ban } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveDay,
} from "@/types/hr.types";

// What we keep about one leave status.
interface StatusLook {
  label: string;
  icon: LucideIcon;
  // The soft background of a pill.
  soft: string;
  // The same colour but full, used for the small dots and bars.
  solid: string;
  // The very light tint painted behind a whole card or a row.
  tint: string;
  border: string;
}

// Everything about how one leave status looks lives here: the word a person
// reads, the icon, and the colours. This is the same idea as
// ATTENDANCE_STATUS_LOOK, so the two HR modules feel like one app.
//
// The class names must be written in full here and never built by joining
// pieces of text, because Tailwind reads this file to know which classes to
// put in the final css file. "bg-" + colour would give it nothing to find.
export const LEAVE_STATUS_LOOK: Record<LeaveRequestStatus, StatusLook> = {
  pending: {
    label: "Waiting",
    icon: Clock4,
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    solid: "bg-amber-500",
    tint: "bg-amber-500/5",
    border: "border-amber-500/30",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    solid: "bg-emerald-500",
    tint: "bg-emerald-500/5",
    border: "border-emerald-500/30",
  },
  // Some days yes, some days no. It gets a colour of its own, between the
  // green of a full yes and the red of a full no, because for the employee
  // it really is a third answer and not a shade of one of the other two.
  partially_approved: {
    label: "Partly approved",
    icon: CircleDashed,
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    solid: "bg-sky-500",
    tint: "bg-sky-500/5",
    border: "border-sky-500/30",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    solid: "bg-rose-500",
    tint: "bg-rose-500/5",
    border: "border-rose-500/30",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    soft: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
    solid: "bg-slate-500",
    tint: "bg-slate-500/5",
    border: "border-slate-500/30",
  },
};

// The five statuses in the order we always want to show them.
export const LEAVE_STATUS_ORDER: LeaveRequestStatus[] = [
  "pending",
  "approved",
  "partially_approved",
  "rejected",
  "cancelled",
];

// Counts how many requests of the list have each status.
export function countByStatus(requests: LeaveRequest[]) {
  const counts: Record<LeaveRequestStatus, number> = {
    pending: 0,
    approved: 0,
    partially_approved: 0,
    rejected: 0,
    cancelled: 0,
  };

  for (const request of requests) {
    counts[request.status] = counts[request.status] + 1;
  }

  return counts;
}

// Are the days of this leave really taken?
//
// Two statuses mean yes, so every chart, every counter and every calendar of
// the app asks this one question instead of writing === "approved" and
// quietly forgetting the leaves that were only partly approved.
export function isApprovedLeave(status: LeaveRequestStatus) {
  return status === "approved" || status === "partially_approved";
}

// The days of one leave that got a given answer.
// Used by the review dialog and the history dialog to draw the three lists:
// requested, approved and rejected.
export function leaveDaysWith(days: LeaveDay[], status: string) {
  return days.filter((day) => day.status === status);
}

// How the three answers of a single day look. The same colours as the
// statuses above, so the day list and the status pill feel like one thing.
export const LEAVE_DAY_LOOK = {
  approved: {
    label: "Approved",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-500/40",
  },
  rejected: {
    label: "Rejected",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    border: "border-rose-500/40",
  },
  excluded: {
    label: "Not counted",
    soft: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
    border: "border-slate-500/40",
  },
};

// The colours the balance cards and the leave type cards use.
//
// A leave type is added by the organization, so we cannot know its name in
// advance and cannot give it a fixed colour. Instead every card takes the
// colour of this list that sits at its own place, and starts again from the
// first one when the list is finished. Same order of types, same colours.
const CARD_COLORS = [
  {
    ring: "stroke-sky-500",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    glow: "from-sky-500/10",
  },
  {
    ring: "stroke-violet-500",
    soft: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    glow: "from-violet-500/10",
  },
  {
    ring: "stroke-emerald-500",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    glow: "from-emerald-500/10",
  },
  {
    ring: "stroke-amber-500",
    soft: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    glow: "from-amber-500/10",
  },
  {
    ring: "stroke-rose-500",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    glow: "from-rose-500/10",
  },
  {
    ring: "stroke-cyan-500",
    soft: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    glow: "from-cyan-500/10",
  },
];

// The colour of the card that sits at this place in the grid.
// The % keeps the number inside the list even when there are more cards
// than colours: place 6 gets the colour of place 0 again.
export function cardColorAt(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}
