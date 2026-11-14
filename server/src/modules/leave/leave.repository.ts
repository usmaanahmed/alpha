import type { LeaveEmployee, LeaveRequestInput, LeaveIds } from "./leave.types.js";
import type { LeavePolicyDocument } from "./leavePolicy.model.js";
import type { LeaveDay, LeaveRequestDocument } from "./leave.model.js";
import type { UploadedFile } from "../../types/service.types.js";
import { LeaveRequest } from "./leave.model.js";
import { LeaveType } from "../leaveType/leaveType.model.js";
import { LeaveBalance } from "./leaveBalance.model.js";
import { Employee } from "../employee/employee.model.js";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import type { LeaveTypeDocument } from "../leaveType/leaveType.model.js";
import mongoose from "mongoose";
import type { LeaveBalanceDocument } from "./leaveBalance.model.js";

export async function findExistingBalance(organizationId: string, employeeId: string, leaveType: {
  _id: mongoose.Types.ObjectId;
  daysPerYear: number;
}, year: number) {
  return LeaveBalance.findOne({
    organization: organizationId,
    employee: employeeId,
    leaveType: leaveType._id,
    year: year,
  });
}

export async function insertLeaveBalance(organizationId: string, employeeId: string, leaveType: {
  _id: mongoose.Types.ObjectId;
  daysPerYear: number;
}, year: number) {
  return LeaveBalance.create({
    organization: organizationId,
    employee: employeeId,
    leaveType: leaveType._id,
    year: year,
    allocated: leaveType.daysPerYear,
    used: 0,
  });
}

export async function findRequests(filter: Record<string, unknown>) {
  return LeaveRequest.find(filter)
    .populate<{ employee: LeaveEmployee | null }>("employee", "name email photo")
    .populate("department", "name")
    .populate("leaveType", "name isPaid excludeHolidays")
    .populate("reviewedByEmployee", "name email photo")
    .sort({ createdAt: -1 })
    .lean();
}

export async function findLeaveTypes(organizationId: string) {
  return LeaveType.find({
    organization: organizationId,
    status: "active",
  }).sort({ name: 1 });
}

export async function findLeaveType(input: LeaveRequestInput, organizationId: string) {
  return LeaveType.findOne({
    _id: input.leaveType,
    organization: organizationId,
    status: "active",
  });
}

export async function findOverlappingRequest(
  organizationId: string,
  me: LoggedInEmployee,
  toDate: Date,
  fromDate: Date,
) {
  return LeaveRequest.findOne({
    organization: organizationId,
    employee: me.employee._id,
    status: { $in: ["pending", "approved", "partially_approved"] },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  });
}

export async function insertLeaveRequest(
  organizationId: string,
  me: LoggedInEmployee,
  leaveType: LeaveTypeDocument,
  fromDate: Date,
  toDate: Date,
  requestedDays: number,
  plan: LeaveDay[],
  input: LeaveRequestInput,
  files: UploadedFile[],
) {
  return LeaveRequest.create({
    organization: organizationId,
    employee: me.employee._id,
    // The department of a request is always the department of the employee.
    department: me.employee.department,
    leaveType: leaveType._id,
    fromDate: fromDate,
    toDate: toDate,
    requestedDays: requestedDays,
    approvedDays: 0,
    // While the request waits, the number every page shows is the asked one.
    totalDays: requestedDays,
    leaveDays: plan,
    excludeWeekends: true,
    excludeHolidays: leaveType.excludeHolidays,
    reason: input.reason,
    // The papers the employee sent. They are written here and never touched
    // again, so the approvers and the audit read exactly what was handed in.
    documents: files.map((file) => ({
      fileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: me.employee._id,
      uploadedByType: "employee",
      uploadedAt: new Date(),
    })),
    status: "pending",
    approvalHistory: [
      {
        actorEmployee: me.employee._id,
        actorName: me.employee.name,
        actorRole: "Employee",
        action: "applied",
        note: input.reason,
        days: requestedDays,
        at: new Date(),
      },
    ],
  });
}

export async function findLeaveRequest(ids: LeaveIds, organizationId: string) {
  return LeaveRequest.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function findEmployeeOfRequest(leaveRequest: LeaveRequestDocument) {
  return Employee.findById(leaveRequest.employee);
}

export async function savePolicy(policy: LeavePolicyDocument) {
  return policy.save();
}

export async function saveLeaveRequest(leaveRequest: LeaveRequestDocument) {
  return leaveRequest.save();
}

export async function findRequestLeaveType(leaveRequest: LeaveRequestDocument) {
  return LeaveType.findById(leaveRequest.leaveType);
}

export async function saveBalance(balance: LeaveBalanceDocument) {
  return balance.save();
}

export async function findEmployeeLeaveRequest(ids: LeaveIds, organizationId: string, me: LoggedInEmployee) {
  return LeaveRequest.findOne({
    _id: ids.id,
    organization: organizationId,
    employee: me.employee._id,
  });
}
