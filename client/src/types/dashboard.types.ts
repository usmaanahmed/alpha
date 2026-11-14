// The numbers the server counts for the dashboard cards.
//
// Every field here is counted by the database in
// GET /api/dashboard/stats, so this page never has to download a whole
// module list only to find out how long it is.
export interface DashboardStats {
  totalEmployees: number;
  // How many of those people still work here.
  activeEmployees: number;

  totalDepartments: number;
  totalTeams: number;

  totalTasks: number;
  // A task nobody has started yet.
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  // Not cards of their own. They are written under "Total Tasks", so the
  // four task numbers always add up to the total.
  inReviewTasks: number;
  cancelledTasks: number;

  // Today, counted from the attendance of today.
  employeesOnLeaveToday: number;
  absentEmployees: number;

  // Leave requests still waiting for an answer, of any day.
  pendingLeaveRequests: number;
}

// How wide one bar of the task progress chart is.
//
// - weekly  -> one bar per week, over one month
// - monthly -> one bar per month, over one year
// - yearly  -> one bar per year, from the oldest task up to today
export type ProgressPeriod = "weekly" | "monthly" | "yearly";

// One bar of the task progress chart, as the server counts it in
// GET /api/dashboard/task-progress.
//
// The five counts are the five statuses of the task module, and nothing
// else: the chart never invents a status the app does not have. They always
// add up to total, because a task is in exactly one status.
export interface TaskProgressBucket {
  // The first moment of the bar, as an ISO text. React uses it as the key
  // of the list; nothing on the screen shows it.
  startsAt: string;
  // The short name under the bar: "30 Jun", "Jan", "2026".
  label: string;
  // The long name inside the tooltip: "30 Jun – 6 Jul", "January 2026".
  rangeLabel: string;
  todo: number;
  in_progress: number;
  in_review: number;
  completed: number;
  cancelled: number;
  total: number;
}

// The whole answer: which period was asked for, the sentence to write under
// the title, and the bars themselves. A bar with no task at all is still in
// the list, as a row of zeros, so the chart never skips a week or a month.
export interface TaskProgress {
  period: ProgressPeriod;
  year: number;
  // 1 for January, 12 for December. Only the weekly view uses it.
  month: number;
  // "July 2026", "2026", "2024 – 2026".
  rangeTitle: string;
  buckets: TaskProgressBucket[];
}

// One bar of the department chart: a department, and the tasks its people
// were given in the stretch of time we are looking at.
//
// The five counts are the same five statuses again, so a status keeps its
// meaning and its colour whichever chart it is drawn in.
export interface DepartmentTasksBar {
  id: string;
  name: string;
  todo: number;
  in_progress: number;
  in_review: number;
  completed: number;
  cancelled: number;
  total: number;
}

// The whole answer of GET /api/dashboard/department-tasks.
//
// The departments come back busiest first. One with no task in the period is
// still in the list, as a row of zeros, because "this department was given
// nothing" is an answer too.
export interface DepartmentTasks {
  period: ProgressPeriod;
  year: number;
  month: number;
  rangeTitle: string;
  departments: DepartmentTasksBar[];
}
