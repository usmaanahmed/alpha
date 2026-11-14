import type { OrganizationIds, UpdateOrganizationInput } from "./organization.types.js";
import { Organization } from "./organization.model.js";
import { User } from "../user/user.model.js";
import { Department } from "../department/department.model.js";
import { Employee } from "../employee/employee.model.js";
import { Task } from "../task/task.model.js";
import { LeaveRequest } from "../leave/leave.model.js";
import { LeaveBalance } from "../leave/leaveBalance.model.js";
import { LeaveType } from "../leaveType/leaveType.model.js";
import { LeavePolicy } from "../leave/leavePolicy.model.js";
import { Attendance } from "../attendance/attendance.model.js";
import { Holiday } from "../holiday/holiday.model.js";
import { Role } from "../role/role.model.js";
import type { OrganizationDocument } from "./organization.model.js";

export async function findExistingUser(email: string) {
  return User.findOne({ email: email });
}

export async function insertOrganization(name: string, email: string, phone: string, address: string) {
  return Organization.create({
    name: name,
    email: email,
    phone: phone,
    address: address,
    status: "active",
  });
}

export async function insertUser(
  name: string,
  email: string,
  hashedPassword: string,
  organization: OrganizationDocument,
) {
  return User.create({
    name: name,
    email: email,
    password: hashedPassword,
    role: "organization",
    organization: organization._id,
    isActive: true,
  });
}

export async function findOrganizations() {
  return Organization.find().sort({ createdAt: -1 });
}

export async function findOrganization(ids: OrganizationIds) {
  return Organization.findById(ids.id);
}

export async function saveOrganization(organization: OrganizationDocument) {
  return organization.save();
}

export async function updateUserProfile(organization: OrganizationDocument, input: UpdateOrganizationInput) {
  return User.updateOne({ organization: organization._id }, {
    name: input.name,
    isActive: input.status === "active",
  });
}

export async function updateUserPassword(organization: OrganizationDocument, hashedPassword: string) {
  return User.updateOne({ organization: organization._id }, { password: hashedPassword });
}

export async function findOrganizationModules(ids: OrganizationIds) {
  return Organization.findById(ids.id).select("name disabledModules disabledFeatures");
}

export async function findEmployees(organization: OrganizationDocument) {
  return Employee.find({
    organization: organization._id,
  }).select("photo");
}

export async function removeTask(organization: OrganizationDocument) {
  return Task.deleteMany({ organization: organization._id });
}

export async function removeLeaveRequest(organization: OrganizationDocument) {
  return LeaveRequest.deleteMany({ organization: organization._id });
}

export async function removeLeaveBalance(organization: OrganizationDocument) {
  return LeaveBalance.deleteMany({ organization: organization._id });
}

export async function removeLeaveType(organization: OrganizationDocument) {
  return LeaveType.deleteMany({ organization: organization._id });
}

export async function removeLeavePolicy(organization: OrganizationDocument) {
  return LeavePolicy.deleteMany({ organization: organization._id });
}

export async function removeAttendance(organization: OrganizationDocument) {
  return Attendance.deleteMany({ organization: organization._id });
}

export async function removeHoliday(organization: OrganizationDocument) {
  return Holiday.deleteMany({ organization: organization._id });
}

export async function removeEmployee(organization: OrganizationDocument) {
  return Employee.deleteMany({ organization: organization._id });
}

export async function removeDepartment(organization: OrganizationDocument) {
  return Department.deleteMany({ organization: organization._id });
}

export async function removeRole(organization: OrganizationDocument) {
  return Role.deleteMany({ organization: organization._id });
}

export async function removeUser(organization: OrganizationDocument) {
  return User.deleteMany({ organization: organization._id });
}

export async function removeOrganization(organization: OrganizationDocument) {
  return Organization.deleteOne({ _id: organization._id });
}
