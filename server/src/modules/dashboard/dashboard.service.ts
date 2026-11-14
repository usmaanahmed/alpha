import type {
  TaskStatusKey,
  ProgressPeriod,
  ProgressBucket,
  DepartmentCounts,
  DashboardOptions,
} from "./dashboard.types.js";
import * as repository from "./dashboard.repository.js";
import type { ServiceActor } from "../../types/service.types.js";
import { todayStart } from "../../utils/date.util.js";
import { syncLeaveAttendance } from "../../utils/leaveAttendance.util.js";

// GET /api/dashboard/stats
//
// The numbers of the whole workspace, counted by the database itself.
//
// The dashboard used to work these out in the browser from the module lists
// it had already downloaded. That was fine while an organization was small,
// but "how many tasks are completed" should not need every task to travel to
// the browser first. Here we ask the database to count, so the answer is one
// small object no matter how big the organization gets.
export async function getDashboardStats(actor: ServiceActor) {
  // The organization id always comes from the login token, never from the
  // request, so one organization can never read another one's numbers.
  const organizationId = String(actor.user?.organizationId);
  const today = todayStart();
  // Somebody with an approved leave for today does not have an attendance
  // row until a page asks for that day. We make those rows first, exactly
  // like the attendance page does, so "on leave today" and "absent today"
  // below count the same days the HR sees in the attendance table.
  await syncLeaveAttendance(organizationId, today, today);
  // --- People, departments and teams --------------------------------------
  const totalEmployees = await repository.countTotalEmployees(organizationId);
  // The people who still work here. It is shown as the small line under the
  // headcount, because "12 employees" means something else when 3 of them
  // have left.
  const activeEmployees = await repository.countActiveEmployees(organizationId);
  const totalDepartments = await repository.countTotalDepartments(organizationId);
  const totalTeams = await repository.countTotalTeams(organizationId);
  // --- Tasks ---------------------------------------------------------------
  const totalTasks = await repository.countTotalTasks(organizationId);
  // A task nobody has started yet.
  const pendingTasks = await repository.countPendingTasks(organizationId);
  const inProgressTasks = await repository.countInProgressTasks(organizationId);
  const completedTasks = await repository.countCompletedTasks(organizationId);
  // A task can also be waiting for a review or be cancelled. Those two are
  // not cards of their own, but without them the four task numbers above
  // would not add up to the total, and the page would look wrong.
  const inReviewTasks = await repository.countInReviewTasks(organizationId);
  const cancelledTasks = await repository.countCancelledTasks(organizationId);
  // --- Leave and attendance of today --------------------------------------
  // We count the attendance rows and not the leave requests, because one
  // employee can have two approved leaves that touch the same day, and that
  // person is still only one person who is away today.
  const employeesOnLeaveToday = await repository.countEmployeesOnLeaveToday(organizationId, today);
  const pendingLeaveRequests = await repository.countPendingLeaveRequests(organizationId);
  // "Absent" is the day the HR marked as absent. A day nobody marked yet is
  // not an absence, it is simply a day that is still open.
  const absentEmployees = await repository.countAbsentEmployees(organizationId, today);
  return {
    status: "success",
    data: {
      totalEmployees: totalEmployees,
      activeEmployees: activeEmployees,
      totalDepartments: totalDepartments,
      totalTeams: totalTeams,
      totalTasks: totalTasks,
      pendingTasks: pendingTasks,
      inProgressTasks: inProgressTasks,
      completedTasks: completedTasks,
      inReviewTasks: inReviewTasks,
      cancelledTasks: cancelledTasks,
      employeesOnLeaveToday: employeesOnLeaveToday,
      pendingLeaveRequests: pendingLeaveRequests,
      absentEmployees: absentEmployees,
    },
  };
}

// The five statuses a task can be in, in the order of the workflow.
//
// This is the SAME list as the enum of the task model. The chart on the
// dashboard must never invent a status of its own, so the months we send
// back always carry exactly these five keys and nothing else.
const TASK_STATUSES = [
  "todo",
  "in_progress",
  "in_review",
  "completed",
  "cancelled",
] as const;

// How wide one bar of the chart is.
// One bar of the chart: what it is called, and the five counts inside it.
//
// startsAt is the first moment of the bar, written as an ISO text. It is
// only there to match a row that comes back from the database with the bar
// it belongs to; the chart itself never shows it.
const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const LONG_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "30 Jun" — the short way we write one day.
function shortDay(date: Date) {
  return date.getUTCDate() + " " + SHORT_MONTHS[date.getUTCMonth()];
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

// The Monday of the week this day is in, at midnight UTC.
//
// getUTCDay() gives 0 for Sunday, so Sunday has to walk back six days and
// not zero. Every other day walks back day - 1.
function startOfWeek(date: Date) {
  const day = date.getUTCDay();
  const stepsBack = day === 0 ? 6 : day - 1;
  return addDays(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())), -stepsBack);
}

// An empty bar, ready to be filled by the rows of the database.
function emptyBucket(startsAt: Date, label: string, rangeLabel: string) {
  return {
    startsAt: startsAt.toISOString(),
    label: label,
    rangeLabel: rangeLabel,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  };
}

// --- The bars of each period ------------------------------------------------
//
// Every one of these three gives back the same shape: the empty bars, and
// the window of time they cover together. The window is what we ask the
// database for, so we never read a task that has no bar to sit in.
// Weekly: the weeks of one month. A week is Monday to Sunday, and the first
// week of the month is the one the 1st falls in — so it usually starts in
// the month before, which is why the label carries the day and not a number.
function buildWeeklyBuckets(year: number, month: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const buckets: ProgressBucket[] = [];
  let weekStart = startOfWeek(monthStart);
  const from = weekStart;
  while (weekStart.getTime() < monthEnd.getTime()) {
    const weekEnd = addDays(weekStart, 6);
    buckets.push(emptyBucket(weekStart, shortDay(weekStart), shortDay(weekStart) + " – " + shortDay(weekEnd)));
    weekStart = addDays(weekStart, 7);
  }
  return { buckets: buckets, from: from, to: weekStart };
}

// Monthly: the twelve months of one year.
function buildMonthlyBuckets(year: number) {
  const buckets: ProgressBucket[] = [];
  for (let month = 0; month < 12; month++) {
    buckets.push(emptyBucket(new Date(Date.UTC(year, month, 1)), SHORT_MONTHS[month], LONG_MONTHS[month] + " " + year));
  }
  return {
    buckets: buckets,
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

// Yearly: one bar per year, from the year of the oldest task up to now.
//
// We never draw more than ten bars, because a workspace that has been
// running for thirty years would otherwise get thirty bars nobody can read.
function buildYearlyBuckets(firstYear: number, lastYear: number) {
  const buckets: ProgressBucket[] = [];
  let startYear = firstYear;
  if (lastYear - startYear > 9) {
    startYear = lastYear - 9;
  }
  for (let year = startYear; year <= lastYear; year++) {
    buckets.push(emptyBucket(new Date(Date.UTC(year, 0, 1)), String(year), String(year)));
  }
  return {
    buckets: buckets,
    from: new Date(Date.UTC(startYear, 0, 1)),
    to: new Date(Date.UTC(lastYear + 1, 0, 1)),
  };
}

// Everything the two charts need to know about the stretch of time the
// browser asked for: which period, which bars, and which sentence to write
// under the title.
//
// Both the task progress chart and the department chart read the same three
// query parameters and cover the same stretch of time, so the reading and
// the checking of those parameters lives here, one single time.
async function readProgressWindow(options: DashboardOptions, organizationId: string) {
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  // Anything we do not understand falls back on the monthly view, which is
  // the one the dashboard opens on.
  const asked = String(options.period || "monthly");
  const period: ProgressPeriod = asked === "weekly" || asked === "yearly" ? asked : "monthly";
  // A year we cannot read, or one far outside the life of the app, becomes
  // the current year. The same for a month outside 1..12.
  let year = Number(options.year);
  if (!year || year < 2000 || year > thisYear + 1) {
    year = thisYear;
  }
  let month = Number(options.month);
  if (!month || month < 1 || month > 12) {
    month = now.getUTCMonth() + 1;
  }
  // Yearly starts at the oldest task of this organization, so a workspace
  // that opened last year does not get ten empty bars in front of it.
  let firstYear = thisYear;
  if (period === "yearly") {
    const oldestTask = await repository.findOldestTask(organizationId);
    if (oldestTask) {
      firstYear = oldestTask.createdAt.getUTCFullYear();
    }
  }
  // The empty bars, and the stretch of time they cover together.
  const window = period === "weekly"
    ? buildWeeklyBuckets(year, month)
    : period === "yearly"
      ? buildYearlyBuckets(firstYear, thisYear)
      : buildMonthlyBuckets(year);
  // The sentence the chart writes under its title. A workspace whose tasks
  // all live in the same year gets "2026" and not "2026 – 2026".
  let rangeTitle = String(year);
  if (period === "weekly") {
    rangeTitle = LONG_MONTHS[month - 1] + " " + year;
  }
  if (period === "yearly") {
    const firstBar = window.buckets[0];
    const lastBar = window.buckets[window.buckets.length - 1];
    if (!firstBar) {
      rangeTitle = String(thisYear);
    }
    else if (firstBar.label === lastBar.label) {
      rangeTitle = firstBar.label;
    }
    else {
      rangeTitle = firstBar.label + " – " + lastBar.label;
    }
  }
  return {
    period: period,
    year: year,
    month: month,
    rangeTitle: rangeTitle,
    buckets: window.buckets,
    from: window.from,
    to: window.to,
  };
}

// GET /api/dashboard/task-progress?period=monthly&year=2026&month=7
//
// The tasks of one stretch of time, bar by bar, split by the status they are
// in right now. The dashboard draws it as one stacked bar per bar we send.
//
// period says how wide one bar is:
// - weekly  -> one bar per week, over the month asked for (year + month)
// - monthly -> one bar per month, over the year asked for (year)
// - yearly  -> one bar per year, from the oldest task up to today
//
// The database does the whole count in one question: $dateTrunc rounds the
// day a task was created down to the start of its week, month or year, and
// we group on that together with the status. So the browser receives a
// handful of small rows instead of every task of the period.
//
// A task belongs to the bar it was CREATED in. That way every task appears
// exactly one time on the chart, and a bar never changes height again once
// its week (or month, or year) is over — only the colours inside it move, as
// the tasks walk through the workflow.
export async function getTaskProgress(actor: ServiceActor, options: DashboardOptions) {
  const organizationId = String(actor.user?.organizationId);
  const window = await readProgressWindow(options, organizationId);
  const period = window.period;
  const buckets = window.buckets;
  // $dateTrunc rounds a date down to the start of the unit it is given.
  // Those are exactly the dates we built the bars from, so the two match.
  const unit = period === "weekly" ? "week" : period === "yearly" ? "year" : "month";
  const rows = await repository.readTaskProgressCounts(organizationId, window, unit);
  rows.forEach((row) => {
    const startsAt = new Date(row._id.bucket).toISOString();
    const bucket = buckets.find((item) => item.startsAt === startsAt);
    const status = row._id.status as TaskStatusKey;
    // A row whose status is not one of our five would be a task saved by an
    // older version of the app. We leave it out instead of drawing a status
    // this app does not know.
    if (!bucket || !TASK_STATUSES.includes(status)) {
      return;
    }
    bucket[status] += row.count;
    bucket.total += row.count;
  });
  return {
    status: "success",
    data: {
      period: window.period,
      year: window.year,
      month: window.month,
      rangeTitle: window.rangeTitle,
      buckets: buckets,
    },
  };
}

// One bar of the department chart: a department, and the five counts of the
// tasks its people were given in the stretch of time we are looking at.
// GET /api/dashboard/department-tasks?period=monthly&year=2026&month=7
//
// The same tasks as the chart above, cut a different way: not by WHEN they
// were opened but by WHICH department they landed in. The dashboard draws it
// as one horizontal stacked bar per department.
//
// The three query parameters are the same three, and they mean the same
// thing, so the two charts always talk about the same stretch of time.
//
// A department with no task in that stretch is still in the answer, as a row
// of zeros: "this department was given nothing this month" is an answer, and
// dropping the row would quietly hide it.
export async function getDepartmentTasks(actor: ServiceActor, options: DashboardOptions) {
  const organizationId = String(actor.user?.organizationId);
  const window = await readProgressWindow(options, organizationId);
  // Every department of this organization, in the order the department page
  // shows them.
  const departments = await repository.findDepartments(organizationId);
  const bars: DepartmentCounts[] = departments.map((department) => ({
    id: String(department._id),
    name: department.name,
    todo: 0,
    in_progress: 0,
    in_review: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
  }));
  // One question again: group the tasks of the period by (department,
  // status) and count each group.
  const rows = await repository.readDepartmentTaskCounts(organizationId, window);
  rows.forEach((row) => {
    const bar = bars.find((item) => item.id === String(row._id.department));
    const status = row._id.status as TaskStatusKey;
    // A task whose department was deleted, or whose status this app does not
    // know, has no bar to sit in. We leave it out instead of inventing one.
    if (!bar || !TASK_STATUSES.includes(status)) {
      return;
    }
    bar[status] += row.count;
    bar.total += row.count;
  });
  // The busiest department first, so the chart reads top to bottom. Two
  // departments with the same load stay in alphabetical order.
  bars.sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.name.localeCompare(b.name);
  });
  return {
    status: "success",
    data: {
      period: window.period,
      year: window.year,
      month: window.month,
      rangeTitle: window.rangeTitle,
      departments: bars,
    },
  };
}
