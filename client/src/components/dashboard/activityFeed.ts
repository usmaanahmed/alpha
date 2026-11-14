// The workspace has no "activity log" table in the database: nothing writes a
// line somewhere when a task is created or a leave is answered. So the
// timeline is read back from the records themselves.
//
// Every record already carries the moments that matter: when it was made
// (createdAt), when it was finished (completedAt, reviewedAt), and, for the
// meetings and the cheques, a whole little history of status changes. We turn
// those moments into one flat list of events, newest first, and the panel
// draws the first ten to twenty of them.

import {
  UserPlus,
  UserMinus,
  Network,
  UsersRound,
  ClipboardList,
  CheckCircle2,
  CalendarPlus,
  CalendarCheck2,
  CalendarX2,
  Plane,
  ThumbsUp,
  ThumbsDown,
  Wallet,
  Banknote,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Employee } from "@/types/employee.types";
import type { Department } from "@/types/department.types";
import type { Team } from "@/types/team.types";
import type { Task } from "@/types/task.types";
import type { Meeting } from "@/types/meeting.types";
import type { Cheque } from "@/types/cheque.types";
import type { LeaveRequest } from "@/types/hr.types";
import { isApprovedLeave } from "@/lib/leaveStatus";
import { getChequeStatusLabel, formatMoney } from "@/types/cheque.types";

// The five families the filter chips at the top of the panel offer. Every
// event belongs to exactly one of them.
export type ActivityGroup =
  | "people"
  | "tasks"
  | "meetings"
  | "hr"
  | "finance";

// One line of the timeline, ready to draw.
//
// The sentence is split in three pieces on purpose, because the panel writes
// each one in its own weight:
//   actorName   -> "Ahmed Khan"      (bold, with the round picture in front)
//   action      -> "created task"    (normal, grey)
//   subject     -> "Fix the login"   (bold again, this is the record itself)
// detail is the small second line under the sentence, and it may be empty.
export interface ActivityItem {
  id: string;
  group: ActivityGroup;
  icon: LucideIcon;
  // The one colour of this event. It paints the small icon badge, the dot on
  // the rail and the soft glow behind the row.
  color: string;

  actorName: string;
  // The file name of the actor's picture, empty when there is none or when
  // the actor is the organization account.
  actorPhoto: string;

  action: string;
  subject: string;
  detail: string;

  // Where a click on the row lands.
  to: string;
  // The moment the event happened, as the server wrote it.
  at: string;
}

// The chips over the list. "all" is not a group, it only means "do not
// filter", so it is written here and not in the type above.
export const ACTIVITY_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "people", label: "People" },
  { value: "tasks", label: "Tasks" },
  { value: "meetings", label: "Meetings" },
  { value: "hr", label: "HR" },
  { value: "finance", label: "Finance" },
];

// The colours. They are the module colours of the rest of the dashboard, plus
// one green for "something finished well" and one red for "something went
// wrong", so a good and a bad event never look the same.
const COLOR = {
  people: "#6366f1",
  department: "#0ea5e9",
  team: "#06b6d4",
  task: "#8b5cf6",
  meeting: "#f59e0b",
  leave: "#f43f5e",
  money: "#10b981",
  good: "#22c55e",
  bad: "#ef4444",
};

// --- Small helpers ---------------------------------------------------------

// A date we can really sort on. A missing or broken date gives 0, and the
// event that carries it drops to the very bottom of the list instead of
// throwing the whole sort off.
function timeOf(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();

  if (isNaN(time)) {
    return 0;
  }

  return time;
}

// "2026-07-30T09:15:00.000Z" -> "30 Jul 2026". Used inside the small grey
// second line, never for the "2h ago" pill (the panel builds that one).
function shortDay(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

// --- The builder -----------------------------------------------------------

export function buildRecentActivity(input: {
  employees: Employee[];
  departments: Department[];
  teams: Team[];
  tasks: Task[];
  meetings: Meeting[];
  cheques: Cheque[];
  leaves: LeaveRequest[];
  // The name shown when the organization account itself did something, since
  // an organization is not an employee and has no picture.
  organizationName: string;
  // How many lines the panel wants. Everything older than that is dropped.
  limit: number;
}): ActivityItem[] {
  const events: ActivityItem[] = [];
  const org = input.organizationName || "Organization";

  // --- People ------------------------------------------------------------

  input.employees.forEach((employee) => {
    // Somebody new. The actor is the person themselves, so the row shows
    // their picture, which is the nicest line of the whole timeline.
    events.push({
      id: "employee-joined-" + employee._id,
      group: "people",
      icon: UserPlus,
      color: COLOR.people,
      actorName: employee.name,
      actorPhoto: employee.photo,
      action: "joined",
      subject: employee.department ? employee.department.name : "the team",
      detail: employee.designation,
      to: "/organization/employees/" + employee._id,
      at: employee.createdAt,
    });

    // Somebody left. Only a real exit date counts: a person can be inactive
    // without anybody ever writing down the day they went.
    if (employee.exitDate) {
      events.push({
        id: "employee-left-" + employee._id,
        group: "people",
        icon: UserMinus,
        color: COLOR.bad,
        actorName: employee.name,
        actorPhoto: employee.photo,
        action: "left",
        subject: employee.department ? employee.department.name : "the team",
        detail: employee.exitReason,
        to: "/organization/employees/" + employee._id,
        at: employee.exitDate,
      });
    }
  });

  input.departments.forEach((department) => {
    events.push({
      id: "department-" + department._id,
      group: "people",
      icon: Network,
      color: COLOR.department,
      actorName: org,
      actorPhoto: "",
      action: "opened the department",
      subject: department.name,
      detail: department.description,
      to: "/organization/departments",
      at: department.createdAt,
    });
  });

  input.teams.forEach((team) => {
    events.push({
      id: "team-" + team._id,
      group: "people",
      icon: UsersRound,
      color: COLOR.team,
      actorName: org,
      actorPhoto: "",
      action: "created the team",
      subject: team.name,
      detail:
        (team.department ? team.department.name : "No department") +
        " · " +
        (team.members ? team.members.length : 0) +
        " members",
      to: "/organization/teams",
      at: team.createdAt,
    });
  });

  // --- Tasks -------------------------------------------------------------

  input.tasks.forEach((task) => {
    // Who gave the task out. A task created by the organization account has
    // no employee behind it, so the organization signs it.
    events.push({
      id: "task-created-" + task._id,
      group: "tasks",
      icon: ClipboardList,
      color: COLOR.task,
      actorName: task.assignedByEmployee ? task.assignedByEmployee.name : org,
      actorPhoto: task.assignedByEmployee ? task.assignedByEmployee.photo : "",
      action: "created task",
      subject: task.title,
      detail: task.assignedTo
        ? "Assigned to " + task.assignedTo.name
        : "Not assigned yet",
      to: "/organization/tasks",
      at: task.createdAt,
    });

    // And who finished it. Old tasks that were completed before the app
    // started writing completedAt simply do not add this second line.
    if (task.status === "completed" && task.completedAt) {
      events.push({
        id: "task-completed-" + task._id,
        group: "tasks",
        icon: CheckCircle2,
        color: COLOR.good,
        actorName: task.assignedTo ? task.assignedTo.name : org,
        actorPhoto: task.assignedTo ? task.assignedTo.photo : "",
        action: "completed task",
        subject: task.title,
        detail: task.department ? task.department.name : "",
        to: "/organization/tasks",
        at: task.completedAt,
      });
    }
  });

  // --- Meetings ----------------------------------------------------------

  input.meetings.forEach((meeting) => {
    const attendees = meeting.attendees || [];

    events.push({
      id: "meeting-created-" + meeting._id,
      group: "meetings",
      icon: CalendarPlus,
      color: COLOR.meeting,
      actorName: meeting.organizedByEmployee
        ? meeting.organizedByEmployee.name
        : org,
      actorPhoto: meeting.organizedByEmployee
        ? meeting.organizedByEmployee.photo
        : "",
      action: "scheduled",
      subject: meeting.title,
      detail:
        shortDay(meeting.startAt) + " · " + attendees.length + " invited",
      to: "/organization/meetings",
      at: meeting.createdAt,
    });

    // A meeting keeps its own history, so the end of it is a real event with
    // a real moment and a real author. We take the last line of that history
    // when the meeting is over, and nothing while it is still open.
    if (meeting.status === "completed" || meeting.status === "cancelled") {
      const history = meeting.statusHistory || [];
      let lastEntry = null;

      for (const entry of history) {
        if (entry.status === meeting.status) {
          lastEntry = entry;
        }
      }

      const isDone = meeting.status === "completed";

      events.push({
        id: "meeting-" + meeting.status + "-" + meeting._id,
        group: "meetings",
        icon: isDone ? CalendarCheck2 : CalendarX2,
        color: isDone ? COLOR.good : COLOR.bad,
        actorName:
          lastEntry && lastEntry.byEmployee ? lastEntry.byEmployee.name : org,
        actorPhoto:
          lastEntry && lastEntry.byEmployee ? lastEntry.byEmployee.photo : "",
        action: isDone ? "wrapped up" : "cancelled",
        subject: meeting.title,
        detail: lastEntry ? lastEntry.note : "",
        to: "/organization/meetings",
        // The history line knows the exact moment. Without one we fall back
        // to the last time anybody touched the meeting.
        at: lastEntry ? lastEntry.at : meeting.updatedAt,
      });
    }
  });

  // --- Leave requests ----------------------------------------------------

  input.leaves.forEach((leave) => {
    events.push({
      id: "leave-asked-" + leave._id,
      group: "hr",
      icon: Plane,
      color: COLOR.leave,
      actorName: leave.employee.name,
      actorPhoto: leave.employee.photo,
      action: "requested",
      subject: leave.leaveType.name,
      detail:
        leave.totalDays +
        " days · " +
        shortDay(leave.fromDate) +
        " – " +
        shortDay(leave.toDate),
      to: "/organization/leaves",
      at: leave.createdAt,
    });

    // The answer. A cancelled request was pulled back by the employee, so it
    // is not an answer and does not belong here.
    if (
      leave.reviewedAt &&
      (isApprovedLeave(leave.status) || leave.status === "rejected")
    ) {
      const isApproved = isApprovedLeave(leave.status);

      events.push({
        id: "leave-answered-" + leave._id,
        group: "hr",
        icon: isApproved ? ThumbsUp : ThumbsDown,
        color: isApproved ? COLOR.good : COLOR.bad,
        actorName: leave.reviewedByEmployee
          ? leave.reviewedByEmployee.name
          : org,
        actorPhoto: leave.reviewedByEmployee
          ? leave.reviewedByEmployee.photo
          : "",
        // A partly approved leave is its own answer, and saying only
        // "approved" there would hide that some days were refused.
        action:
          leave.status === "partially_approved"
            ? "approved some days of the leave of"
            : isApproved
              ? "approved the leave of"
              : "rejected the leave of",
        subject: leave.employee.name,
        detail: leave.leaveType.name + " · " + leave.totalDays + " days",
        to: "/organization/leaves",
        at: leave.reviewedAt,
      });
    }
  });

  // --- Cheques -----------------------------------------------------------

  input.cheques.forEach((cheque) => {
    const money = formatMoney(cheque.amount);

    events.push({
      id: "cheque-added-" + cheque._id,
      group: "finance",
      icon: Wallet,
      color: COLOR.money,
      actorName: org,
      actorPhoto: "",
      action: "added cheque",
      subject: "#" + cheque.chequeNumber,
      detail: money + " · " + cheque.partyName,
      to: "/organization/cheques",
      at: cheque.createdAt,
    });

    // A cheque also keeps its history. The first line of it is the status it
    // was created in, which we already wrote above, so only a later line is
    // worth a second row.
    const history = cheque.statusHistory || [];

    if (history.length > 1) {
      const lastEntry = history[history.length - 1];
      const isBad =
        lastEntry.status === "bounced" ||
        lastEntry.status === "cancelled" ||
        lastEntry.status === "expired" ||
        lastEntry.status === "returned";

      events.push({
        id: "cheque-status-" + cheque._id,
        group: "finance",
        icon: isBad ? AlertTriangle : Banknote,
        color: isBad
          ? COLOR.bad
          : lastEntry.status === "cleared"
            ? COLOR.good
            : COLOR.money,
        actorName: org,
        actorPhoto: "",
        action: "updated cheque",
        subject: "#" + cheque.chequeNumber,
        detail:
          getChequeStatusLabel(lastEntry.status) +
          " · " +
          money +
          " · " +
          cheque.partyName,
        to: "/organization/cheques",
        at: lastEntry.at,
      });
    }
  });

  // Newest first, then cut to the size the panel asked for. Everything the
  // user cares about happened in the last few days, so the tail is dropped.
  events.sort((a, b) => timeOf(b.at) - timeOf(a.at));

  return events.slice(0, input.limit);
}

// How long ago the event was, in the short way a feed writes it: "just now",
// "12m ago", "5h ago", "3d ago", and a plain date once it is older than a
// week.
//
// "now" is the current moment, and it is given from the outside instead of
// being read from the clock in here. That is what makes the labels grow old
// on the screen: the panel keeps the moment in a state, so when the moment
// changes React really knows the rows have to be drawn again. A Date.now()
// hidden inside this function would change without React ever noticing, and
// the label would stay frozen on "1m ago".
export function timeAgo(value: string, now: number) {
  const time = new Date(value).getTime();

  if (isNaN(time)) {
    return "";
  }

  const seconds = Math.round((now - time) / 1000);

  // A clock that runs a little ahead on the server would give a negative
  // number here, and "in -3 seconds" reads like a bug, so it is "just now".
  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes + "m ago";
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + "h ago";
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days + "d ago";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

// True while the event is the "just now" of timeAgo above, that is, less than
// a minute old. The panel asks this to make the fresh rows blink, so the same
// minute decides the word and the blinking.
//
// "now" is given from the outside for the same reason as above.
export function isJustNow(value: string, now: number) {
  const time = new Date(value).getTime();

  if (isNaN(time)) {
    return false;
  }

  const seconds = (now - time) / 1000;

  // A clock a little ahead on the server gives a small negative number here,
  // and that event has certainly just happened too.
  return seconds < 60;
}

// The name of the day an event belongs to, used as the small divider between
// the groups of rows: "Today", "Yesterday", or "Mon, 27 Jul".
export function dayLabel(value: string) {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return "Earlier";
  }

  // Both days are cut down to "year, month, day" so two moments of the same
  // day always land on the same label, whatever the hour.
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const dayMs = 24 * 60 * 60 * 1000;
  const daysApart = Math.round((today.getTime() - day.getTime()) / dayMs);

  if (daysApart === 0) {
    return "Today";
  }
  if (daysApart === 1) {
    return "Yesterday";
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}
