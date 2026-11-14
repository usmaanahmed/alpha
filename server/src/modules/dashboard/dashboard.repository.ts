import type { ProgressPeriod, ProgressBucket } from "./dashboard.types.js";
import mongoose from "mongoose";
import { Employee } from "../employee/employee.model.js";
import { Department } from "../department/department.model.js";
import { Team } from "../team/team.model.js";
import { Task } from "../task/task.model.js";
import { LeaveRequest } from "../leave/leave.model.js";
import { Attendance } from "../attendance/attendance.model.js";

export async function countTotalEmployees(organizationId: string) {
  return Employee.countDocuments({
    organization: organizationId,
  });
}

export async function countActiveEmployees(organizationId: string) {
  return Employee.countDocuments({
    organization: organizationId,
    status: "active",
  });
}

export async function countTotalDepartments(organizationId: string) {
  return Department.countDocuments({
    organization: organizationId,
  });
}

export async function countTotalTeams(organizationId: string) {
  return Team.countDocuments({
    organization: organizationId,
  });
}

export async function countTotalTasks(organizationId: string) {
  return Task.countDocuments({
    organization: organizationId,
  });
}

export async function countPendingTasks(organizationId: string) {
  return Task.countDocuments({
    organization: organizationId,
    status: "todo",
  });
}

export async function countInProgressTasks(organizationId: string) {
  return Task.countDocuments({
    organization: organizationId,
    status: "in_progress",
  });
}

export async function countCompletedTasks(organizationId: string) {
  return Task.countDocuments({
    organization: organizationId,
    status: "completed",
  });
}

export async function countInReviewTasks(organizationId: string) {
  return Task.countDocuments({
    organization: organizationId,
    status: "in_review",
  });
}

export async function countCancelledTasks(organizationId: string) {
  return Task.countDocuments({
    organization: organizationId,
    status: "cancelled",
  });
}

export async function countEmployeesOnLeaveToday(organizationId: string, today: Date) {
  return Attendance.countDocuments({
    organization: organizationId,
    date: today,
    status: "on_leave",
  });
}

export async function countPendingLeaveRequests(organizationId: string) {
  return LeaveRequest.countDocuments({
    organization: organizationId,
    status: "pending",
  });
}

export async function countAbsentEmployees(organizationId: string, today: Date) {
  return Attendance.countDocuments({
    organization: organizationId,
    date: today,
    status: "absent",
  });
}

export async function findOldestTask(organizationId: string) {
  return Task.findOne({ organization: organizationId })
    .sort({ createdAt: 1 })
    .select("createdAt");
}

export async function readTaskProgressCounts(organizationId: string, window: {
  period: ProgressPeriod;
  year: number;
  month: number;
  rangeTitle: string;
  buckets: Array<ProgressBucket>;
  from: Date;
  to: Date;
}, unit: "week" | "year" | "month") {
  return Task.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: window.from, $lt: window.to },
      },
    },
    {
      $group: {
        _id: {
          bucket: {
            $dateTrunc: {
              date: "$createdAt",
              unit: unit,
              // Our weeks start on Monday, like the ones we built above.
              startOfWeek: "monday",
              timezone: "UTC",
            },
          },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
  ]);
}

export async function findDepartments(organizationId: string) {
  return Department.find({
    organization: organizationId,
  })
    .sort({ name: 1 })
    .select("name");
}

export async function readDepartmentTaskCounts(organizationId: string, window: {
  period: ProgressPeriod;
  year: number;
  month: number;
  rangeTitle: string;
  buckets: Array<ProgressBucket>;
  from: Date;
  to: Date;
}) {
  return Task.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        createdAt: { $gte: window.from, $lt: window.to },
      },
    },
    {
      $group: {
        _id: { department: "$department", status: "$status" },
        count: { $sum: 1 },
      },
    },
  ]);
}
