import type { EmployeeIds } from "./employee.types.js";
import { Employee } from "./employee.model.js";
import { Task } from "../task/task.model.js";
import type { TaskStatus } from "../task/task.model.js";
import { Meeting } from "../meeting/meeting.model.js";
import type { MeetingStatus } from "../meeting/meeting.model.js";
import { Attendance } from "../attendance/attendance.model.js";
import { LeaveRequest, APPROVED_LEAVE_STATUSES } from "../leave/leave.model.js";
import mongoose from "mongoose";

export async function findEmployee(ids: EmployeeIds, organizationId: string) {
  return Employee.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function findAttendanceToday(
  organizationId: string,
  employeeId: mongoose.Types.ObjectId,
  today: Date,
) {
  return Attendance.findOne({
    organization: organizationId,
    employee: employeeId,
    date: today,
  });
}

export async function findLeaveToday(
  organizationId: string,
  employeeId: mongoose.Types.ObjectId,
  today: Date,
) {
  return LeaveRequest.findOne({
    organization: organizationId,
    employee: employeeId,
    status: { $in: APPROVED_LEAVE_STATUSES },
    fromDate: { $lte: today },
    toDate: { $gte: today },
  }).populate("leaveType", "name");
}

export async function findUpcomingLeave(
  organizationId: string,
  employeeId: mongoose.Types.ObjectId,
  today: Date,
) {
  return LeaveRequest.findOne({
    organization: organizationId,
    employee: employeeId,
    status: { $in: APPROVED_LEAVE_STATUSES },
    fromDate: { $gt: today },
  })
    .populate("leaveType", "name")
    .sort({ fromDate: 1 });
}

export async function countPendingLeaveRequests(organizationId: string, employeeId: mongoose.Types.ObjectId) {
  return LeaveRequest.countDocuments({
    organization: organizationId,
    employee: employeeId,
    status: "pending",
  });
}

export async function findOpenTasks(
  organizationId: string,
  employeeId: mongoose.Types.ObjectId,
  OPEN_TASK_STATUSES: Array<TaskStatus>,
) {
  return Task.find({
    organization: organizationId,
    assignedTo: employeeId,
    status: { $in: OPEN_TASK_STATUSES },
  });
}

export async function countCompletedThisWeek(
  organizationId: string,
  employeeId: mongoose.Types.ObjectId,
  sevenDaysAgo: Date,
) {
  return Task.countDocuments({
    organization: organizationId,
    assignedTo: employeeId,
    status: "completed",
    completedAt: { $gte: sevenDaysAgo },
  });
}

export async function findMeetingsToday(organizationId: string, dayStart: Date, dayEnd: Date, inThisMeeting: {
  $or: Array<{
    "attendees.employee": mongoose.Types.ObjectId;
    organizedByEmployee?: undefined;
  } | {
    organizedByEmployee: mongoose.Types.ObjectId;
    "attendees.employee"?: undefined;
  }>;
}) {
  return Meeting.find({
    organization: organizationId,
    startAt: { $gte: dayStart, $lt: dayEnd },
    ...inThisMeeting,
  }).sort({ startAt: 1 });
}

export async function findNextMeeting(
  organizationId: string,
  now: Date,
  OPEN_MEETING_STATUSES: Array<MeetingStatus>,
  inThisMeeting: {
  $or: Array<{
    "attendees.employee": mongoose.Types.ObjectId;
    organizedByEmployee?: undefined;
  } | {
    organizedByEmployee: mongoose.Types.ObjectId;
    "attendees.employee"?: undefined;
  }>;
},
) {
  return Meeting.findOne({
    organization: organizationId,
    endAt: { $gte: now },
    status: { $in: OPEN_MEETING_STATUSES },
    ...inThisMeeting,
  }).sort({ startAt: 1 });
}

export async function findRecentTasks(
  organizationId: string,
  employeeId: mongoose.Types.ObjectId,
  MAX_TIMELINE: 8,
) {
  return Task.find({
    organization: organizationId,
    assignedTo: employeeId,
  })
    .sort({ updatedAt: -1 })
    .limit(MAX_TIMELINE);
}

export async function findRecentMeetings(organizationId: string, inThisMeeting: {
  $or: Array<{
    "attendees.employee": mongoose.Types.ObjectId;
    organizedByEmployee?: undefined;
  } | {
    organizedByEmployee: mongoose.Types.ObjectId;
    "attendees.employee"?: undefined;
  }>;
}, MAX_TIMELINE: 8) {
  return Meeting.find({
    organization: organizationId,
    ...inThisMeeting,
  })
    .sort({ updatedAt: -1 })
    .limit(MAX_TIMELINE);
}

export async function findRecentLeaves(organizationId: string, employeeId: mongoose.Types.ObjectId) {
  return LeaveRequest.find({
    organization: organizationId,
    employee: employeeId,
  })
    .populate("leaveType", "name")
    .sort({ updatedAt: -1 })
    .limit(4);
}
