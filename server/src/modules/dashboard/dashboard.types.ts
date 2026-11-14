export interface DashboardOptions {
  period?: unknown;
  year?: unknown;
  month?: unknown;
}

export type TaskStatusKey = "todo" | "in_progress" | "in_review" | "completed" | "cancelled";

export type ProgressPeriod = "weekly" | "monthly" | "yearly";

export interface ProgressBucket {
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

export interface DepartmentCounts {
  id: string;
  name: string;
  todo: number;
  in_progress: number;
  in_review: number;
  completed: number;
  cancelled: number;
  total: number;
}
