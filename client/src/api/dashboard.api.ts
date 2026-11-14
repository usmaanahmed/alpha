import { axiosClient } from "./axiosClient";
import type {
  DashboardStats,
  DepartmentTasks,
  ProgressPeriod,
  TaskProgress,
} from "@/types/dashboard.types";

// The numbers of the whole organization, counted by the server.
export async function getDashboardStatsRequest() {
  const response = await axiosClient.get("/dashboard/stats");
  return response.data.data as DashboardStats;
}

// The tasks of one stretch of time, bar by bar and status by status. The
// database counts them, so the chart never downloads the tasks themselves.
//
// The yearly view ignores year and month — it always runs from the oldest
// task up to today — but we send them anyway, because one request that
// always looks the same is easier to follow than three different ones.
export async function getTaskProgressRequest(
  period: ProgressPeriod,
  year: number,
  month: number
) {
  const response = await axiosClient.get("/dashboard/task-progress", {
    params: { period: period, year: year, month: month },
  });
  return response.data.data as TaskProgress;
}

// The same tasks cut by department instead of by date. It takes the same
// three parameters, so the two charts can talk about the same stretch of
// time when they are asked to.
export async function getDepartmentTasksRequest(
  period: ProgressPeriod,
  year: number,
  month: number
) {
  const response = await axiosClient.get("/dashboard/department-tasks", {
    params: { period: period, year: year, month: month },
  });
  return response.data.data as DepartmentTasks;
}
