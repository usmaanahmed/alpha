import { useQuery } from "@tanstack/react-query";
import {
  getDashboardStatsRequest,
  getTaskProgressRequest,
  getDepartmentTasksRequest,
} from "@/api/dashboard.api";
import type { ProgressPeriod } from "@/types/dashboard.types";

// The stat cards of the organization dashboard.
//
// There is nothing to invalidate by hand here: react query treats this
// answer as old straight away, so every time the dashboard is opened again
// the numbers are read from the server once more. Adding a task on the task
// page and coming back therefore shows the new count.
// isEnabled is false when the SaaS owner switched the stat cards off. The
// server answers 403 for that organization now, so asking at all would only
// put a failed request in the network tab for numbers nobody draws.
export function useDashboardStats(isEnabled = true) {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: getDashboardStatsRequest,
    enabled: isEnabled,
  });
}

// The bars of the task progress chart: the weeks of a month, the months of
// a year, or the years of the workspace.
//
// The period, the year and the month are all part of the query key, so every
// view the user walks through stays in the cache and coming back to it is
// instant.
export function useTaskProgress(
  period: ProgressPeriod,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: ["task-progress", period, year, month],
    queryFn: () => getTaskProgressRequest(period, year, month),
    // The bars we already have stay on the screen while the next period is
    // on its way, so switching from weekly to monthly does not blink back
    // to the grey placeholder.
    placeholderData: (previous) => previous,
  });
}

// The same tasks, one bar per department. It has its own period, so looking
// at last year here does not move the chart above.
export function useDepartmentTasks(
  period: ProgressPeriod,
  year: number,
  month: number
) {
  return useQuery({
    queryKey: ["department-tasks", period, year, month],
    queryFn: () => getDepartmentTasksRequest(period, year, month),
    placeholderData: (previous) => previous,
  });
}
