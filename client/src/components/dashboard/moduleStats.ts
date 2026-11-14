// The dashboard shows the same numbers in three places: the stat card of a
// module, the row of that module in the table, and the bars of the chart.
// They are all worked out here, one time, from the lists the server already
// sent us. That way the card, the row and the bar can never disagree.

import {
  Users,
  Network,
  ClipboardList,
  Video,
  Wallet,
  Plane,
  CalendarCheck,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Employee } from "@/types/employee.types";
import type { Department } from "@/types/department.types";
import type { Task } from "@/types/task.types";
import type { Meeting } from "@/types/meeting.types";
import type { Cheque } from "@/types/cheque.types";
import type { LeaveRequest, Holiday, Attendance } from "@/types/hr.types";
import { isTaskOpen, isTaskLate } from "@/types/task.types";
import { isOpenMeeting, daysUntil } from "@/types/meeting.types";
import { isPending, isDueSoon } from "@/types/cheque.types";
import { isApprovedLeave } from "@/lib/leaveStatus";

// Everything one module needs to be drawn.
//
// The three numbers always mean the same thing:
// - total     : how many records the module holds,
// - active    : how many of them are still in play,
// - closed    : how many of them are finished,
// - attention : how many of them want the user to do something today.
//
// The three labels next to them say what that means for THIS module, because
// "active" is not the same word for a cheque and for an employee.
export interface ModuleStat {
  key: string;
  name: string;
  // Where the "open module" arrow takes the user.
  to: string;
  icon: LucideIcon;
  // The one colour of the module. The icon chip, the progress bar, the bar of
  // the chart and the slice of the donut all read this same value, so a
  // module keeps its colour everywhere on the page.
  color: string;

  total: number;
  totalLabel: string;

  active: number;
  activeLabel: string;

  closed: number;
  closedLabel: string;

  attention: number;
  attentionLabel: string;

  // A number from 0 to 100 and the words that explain what it counts.
  progress: number;
  progressLabel: string;
}

// part of whole as a whole percent. An empty module gives 0 instead of a
// division by zero.
function percent(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }
  return Math.round((part / whole) * 100);
}

// Milliseconds in one day, used to count how many days away something is.
const DAY_MS = 24 * 60 * 60 * 1000;

// Someone who started in the last two months is still a new joiner.
const NEW_JOINER_DAYS = 60;

// A holiday inside the next month is close enough to plan around.
const HOLIDAY_SOON_DAYS = 30;

export function buildModuleStats(input: {
  employees: Employee[];
  departments: Department[];
  tasks: Task[];
  meetings: Meeting[];
  cheques: Cheque[];
  leaves: LeaveRequest[];
  holidays: Holiday[];
  attendanceToday: Attendance[];
}): ModuleStat[] {
  const now = Date.now();
  const todayText = new Date().toISOString().slice(0, 10);

  // --- Employees ---------------------------------------------------------
  const activeEmployees = input.employees.filter(
    (employee) => employee.status === "active"
  );

  const newJoiners = input.employees.filter((employee) => {
    if (!employee.joiningDate) {
      return false;
    }

    const daysSince = (now - new Date(employee.joiningDate).getTime()) / DAY_MS;
    // A date in the future is a typo, so we skip it.
    return daysSince >= 0 && daysSince <= NEW_JOINER_DAYS;
  });

  // --- Departments -------------------------------------------------------
  const activeDepartments = input.departments.filter(
    (department) => department.status === "active"
  );

  // A department nobody works in yet. We look at the active people only,
  // because a department whose only member left is empty too.
  const emptyDepartments = input.departments.filter((department) => {
    const hasSomebody = activeEmployees.some(
      (employee) => employee.department?._id === department._id
    );
    return !hasSomebody;
  });

  // --- Tasks -------------------------------------------------------------
  const openTasks = input.tasks.filter((task) => isTaskOpen(task));
  const completedTasks = input.tasks.filter((task) => task.status === "completed");
  const lateTasks = input.tasks.filter((task) => isTaskLate(task));

  // --- Meetings ----------------------------------------------------------
  const openMeetings = input.meetings.filter((meeting) => isOpenMeeting(meeting));
  const completedMeetings = input.meetings.filter(
    (meeting) => meeting.status === "completed"
  );
  const meetingsToday = openMeetings.filter((meeting) => daysUntil(meeting) === 0);

  // --- Cheques -----------------------------------------------------------
  const pendingCheques = input.cheques.filter((cheque) => isPending(cheque));
  const clearedCheques = input.cheques.filter(
    (cheque) => cheque.status === "cleared"
  );
  // A cheque due in the next week, and every bounced one, needs an answer.
  const chequesToWatch = input.cheques.filter(
    (cheque) => isDueSoon(cheque) || cheque.status === "bounced"
  );

  // --- Leave requests ----------------------------------------------------
  const pendingLeaves = input.leaves.filter((leave) => leave.status === "pending");
  // A partly approved leave belongs here too: some of its days were said yes
  // to, so it is not a request that is still waiting for an answer.
  const approvedLeaves = input.leaves.filter((leave) =>
    isApprovedLeave(leave.status)
  );

  // --- Holidays ----------------------------------------------------------
  const upcomingHolidays = input.holidays.filter(
    (holiday) => holiday.date.slice(0, 10) >= todayText
  );
  const passedHolidays = input.holidays.filter(
    (holiday) => holiday.date.slice(0, 10) < todayText
  );
  const holidaysSoon = upcomingHolidays.filter((holiday) => {
    const days =
      (new Date(holiday.date.slice(0, 10) + "T00:00:00Z").getTime() - now) /
      DAY_MS;
    return days <= HOLIDAY_SOON_DAYS;
  });

  // --- Attendance of today -----------------------------------------------
  // Everybody who works here is expected today, so the total is the active
  // headcount and not the number of rows already marked.
  const expectedToday = activeEmployees.length;
  const presentToday = input.attendanceToday.filter(
    (row) => row.status === "present" || row.status === "half_day"
  );
  const onLeaveToday = input.attendanceToday.filter(
    (row) => row.status === "on_leave" || row.status === "holiday"
  );
  const absentToday = input.attendanceToday.filter(
    (row) => row.status === "absent"
  );

  return [
    {
      key: "employees",
      name: "Employees",
      to: "/organization/employees",
      icon: Users,
      color: "#6366f1",
      total: input.employees.length,
      totalLabel: "People",
      active: activeEmployees.length,
      activeLabel: "Active",
      closed: input.employees.length - activeEmployees.length,
      closedLabel: "Left",
      attention: newJoiners.length,
      attentionLabel: "New joiners",
      progress: percent(activeEmployees.length, input.employees.length),
      progressLabel: "of the team is active",
    },
    {
      key: "departments",
      name: "Departments",
      to: "/organization/departments",
      icon: Network,
      color: "#0ea5e9",
      total: input.departments.length,
      totalLabel: "Departments",
      active: activeDepartments.length,
      activeLabel: "Active",
      closed: input.departments.length - activeDepartments.length,
      closedLabel: "Closed",
      attention: emptyDepartments.length,
      attentionLabel: "Nobody in them",
      progress: percent(activeDepartments.length, input.departments.length),
      progressLabel: "of the departments are active",
    },
    {
      key: "tasks",
      name: "Tasks",
      to: "/organization/tasks",
      icon: ClipboardList,
      color: "#8b5cf6",
      total: input.tasks.length,
      totalLabel: "Tasks",
      active: openTasks.length,
      activeLabel: "Open",
      closed: completedTasks.length,
      closedLabel: "Completed",
      attention: lateTasks.length,
      attentionLabel: "Overdue",
      progress: percent(completedTasks.length, input.tasks.length),
      progressLabel: "of the tasks are done",
    },
    {
      key: "meetings",
      name: "Meetings",
      to: "/organization/meetings",
      icon: Video,
      color: "#f59e0b",
      total: input.meetings.length,
      totalLabel: "Meetings",
      active: openMeetings.length,
      activeLabel: "Upcoming",
      closed: completedMeetings.length,
      closedLabel: "Held",
      attention: meetingsToday.length,
      attentionLabel: "Today",
      progress: percent(completedMeetings.length, input.meetings.length),
      progressLabel: "of the meetings were held",
    },
    {
      key: "cheques",
      name: "Cheques",
      to: "/organization/cheques",
      icon: Wallet,
      color: "#10b981",
      total: input.cheques.length,
      totalLabel: "Cheques",
      active: pendingCheques.length,
      activeLabel: "Pending",
      closed: clearedCheques.length,
      closedLabel: "Cleared",
      attention: chequesToWatch.length,
      attentionLabel: "Due or bounced",
      progress: percent(clearedCheques.length, input.cheques.length),
      progressLabel: "of the cheques cleared",
    },
    {
      key: "leaves",
      name: "Leave requests",
      to: "/organization/leaves",
      icon: Plane,
      color: "#f43f5e",
      total: input.leaves.length,
      totalLabel: "Requests",
      active: pendingLeaves.length,
      activeLabel: "Waiting",
      closed: approvedLeaves.length,
      closedLabel: "Approved",
      attention: pendingLeaves.length,
      attentionLabel: "To answer",
      progress: percent(
        input.leaves.length - pendingLeaves.length,
        input.leaves.length
      ),
      progressLabel: "of the requests are answered",
    },
    {
      key: "attendance",
      name: "Attendance",
      to: "/organization/attendance",
      icon: CalendarCheck,
      color: "#06b6d4",
      total: expectedToday,
      totalLabel: "Expected today",
      active: presentToday.length,
      activeLabel: "Present",
      closed: onLeaveToday.length,
      closedLabel: "Away",
      attention: absentToday.length,
      attentionLabel: "Absent",
      progress: percent(presentToday.length, expectedToday),
      progressLabel: "of the team is in today",
    },
    {
      key: "holidays",
      name: "Holidays",
      to: "/organization/holidays",
      icon: CalendarDays,
      color: "#d946ef",
      total: input.holidays.length,
      totalLabel: "This year",
      active: upcomingHolidays.length,
      activeLabel: "Still to come",
      closed: passedHolidays.length,
      closedLabel: "Passed",
      attention: holidaysSoon.length,
      attentionLabel: "Within a month",
      progress: percent(passedHolidays.length, input.holidays.length),
      progressLabel: "of the year's holidays passed",
    },
  ];
}
