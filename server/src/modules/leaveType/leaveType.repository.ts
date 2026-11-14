// Database queries for leave-type operations live here.
import { LeaveType } from "./leaveType.model.js";
import { LeaveRequest } from "../leave/leave.model.js";
import { LeaveBalance } from "../leave/leaveBalance.model.js";
import type { LeaveTypeDocument, LeaveTypeInput } from "./leaveType.types.js";

export async function findAllLeaveTypes(organizationId: string) {
  // 1 sorts names from A to Z.
  return LeaveType.find({ organization: organizationId }).sort({ name: 1 });
}

export async function findActiveLeaveTypes(organizationId: string) {
  return LeaveType.find({
    organization: organizationId,
    status: "active",
  }).sort({ name: 1 });
}

export async function findLeaveTypeById(organizationId: string, leaveTypeId: string) {
  // Both values are required so one organization cannot change another's data.
  return LeaveType.findOne({
    _id: leaveTypeId,
    organization: organizationId,
  });
}

export async function findLeaveTypeByName(organizationId: string, name: string) {
  return LeaveType.findOne({ organization: organizationId, name: name });
}

export async function insertLeaveType(organizationId: string, input: LeaveTypeInput) {
  let description = input.description;

  if (!description) {
    description = "";
  }

  return LeaveType.create({
    name: input.name,
    organization: organizationId,
    daysPerYear: input.daysPerYear,
    isPaid: input.isPaid,
    excludeHolidays: input.excludeHolidays,
    allowDocuments: input.allowDocuments,
    documentRequirement: input.documentRequirement,
    allowedFileKinds: input.allowedFileKinds,
    maxFileSizeMb: input.maxFileSizeMb,
    maxFiles: input.maxFiles,
    description: description,
    status: input.status,
  });
}

export async function saveLeaveType(leaveType: LeaveTypeDocument) {
  return leaveType.save();
}

export async function countLeaveRequests(organizationId: string, leaveTypeId: string) {
  return LeaveRequest.countDocuments({
    organization: organizationId,
    leaveType: leaveTypeId,
  });
}

export async function removeLeaveBalances(leaveTypeId: string) {
  await LeaveBalance.deleteMany({ leaveType: leaveTypeId });
}

export async function removeLeaveType(leaveTypeId: string) {
  await LeaveType.deleteOne({ _id: leaveTypeId });
}
