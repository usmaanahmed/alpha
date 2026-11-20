import type { HrProfile, CreateEmployeeInput, EmployeeIds } from "./employee.types.js";
import type { EmployeeDocument } from "./employee.model.js";
import type { UploadedFile } from "../../types/service.types.js";
import { Employee } from "./employee.model.js";
import { Department } from "../department/department.model.js";
import { Role } from "../role/role.model.js";
import { Task } from "../task/task.model.js";
import { Team } from "../team/team.model.js";
import { User } from "../user/user.model.js";
import { LeaveRequest } from "../leave/leave.model.js";
import { Attendance } from "../attendance/attendance.model.js";
import { LeaveBalance } from "../leave/leaveBalance.model.js";
import type { DepartmentDocument } from "../department/department.model.js";
import type { RoleDocument } from "../role/role.model.js";

export async function findExistingEmployee(organizationId: string, email: string) {
  return Employee.findOne({
    organization: organizationId,
    email: email,
  });
}

export async function findExistingUser(email: string) {
  return User.findOne({ email: email });
}

export async function findDepartment(departmentId: string, organizationId: string) {
  return Department.findOne({
    _id: departmentId,
    organization: organizationId,
  });
}

export async function findRole(roleId: string, organizationId: string) {
  return Role.findOne({
    _id: roleId,
    organization: organizationId,
    status: "active",
  });
}

export async function insertEmployee(
  input: CreateEmployeeInput,
  email: string,
  organizationId: string,
  department: DepartmentDocument,
  role: RoleDocument,
  uploadedFile: UploadedFile | undefined,
  hrProfile: HrProfile,
) {
  return Employee.create({
    name: input.name,
    email: email,
    phone: input.phone || "",
    organization: organizationId,
    department: department._id,
    role: role._id,
    status: input.status,
    // multer put the picture on the disk and gives us its file name here.
    // No picture sent means the employee simply has no picture.
    photo: uploadedFile ? uploadedFile.filename : "",
    ...hrProfile,
  });
}

export async function insertUser(
  input: CreateEmployeeInput,
  email: string,
  hashedPassword: string,
  organizationId: string,
  employee: EmployeeDocument,
) {
  return User.create({
    name: input.name,
    email: email,
    password: hashedPassword,
    role: "employee",
    organization: organizationId,
    employee: employee._id,
    isActive: input.status === "active",
  });
}

export async function findEmployees(organizationId: string) {
  return Employee.find({ organization: organizationId })
    .populate("department", "name")
    .populate("role", "name status")
    .sort({ createdAt: -1 });
}

export async function findEmployee(ids: EmployeeIds, organizationId: string) {
  return Employee.findOne({
    _id: ids.id,
    organization: organizationId,
  })
    .populate("department", "name")
    .populate("role", "name status");
}

export async function findEmployeeDocument(ids: EmployeeIds, organizationId: string) {
  return Employee.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function findAttendances(
  organizationId: string,
  employee: EmployeeDocument,
  firstDay: Date,
  firstDayOfNextMonth: Date,
) {
  return Attendance.find({
    organization: organizationId,
    employee: employee._id,
    date: { $gte: firstDay, $lt: firstDayOfNextMonth },
  }).sort({ date: -1 });
}

export async function findLeaves(organizationId: string, employee: EmployeeDocument) {
  return LeaveRequest.find({
    organization: organizationId,
    employee: employee._id,
  })
    .populate("leaveType", "name isPaid")
    .populate("reviewedByEmployee", "name email photo")
    .sort({ createdAt: -1 });
}

export async function findBalances(organizationId: string, employee: EmployeeDocument, year: number) {
  return LeaveBalance.find({
    organization: organizationId,
    employee: employee._id,
    year: year,
  })
    .populate("leaveType", "name isPaid")
    .sort({ createdAt: 1 });
}

export async function findEmployeeWithSameEmail(
  organizationId: string,
  email: string,
  employee: EmployeeDocument,
) {
  return Employee.findOne({
    organization: organizationId,
    email: email,
    _id: { $ne: employee._id },
  });
}

export async function findUserWithSameEmail(email: string, employee: EmployeeDocument) {
  return User.findOne({
    email: email,
    employee: { $ne: employee._id },
  });
}

export async function countLedTeams(organizationId: string, employee: EmployeeDocument) {
  return Team.countDocuments({
    organization: organizationId,
    teamLead: employee._id,
  });
}

export async function removeEmployeeFromTeams(organizationId: string, employee: EmployeeDocument) {
  return Team.updateMany({ organization: organizationId }, { $pull: { members: employee._id } });
}

export async function saveEmployee(employee: EmployeeDocument) {
  return employee.save();
}

export async function updateUserProfile(employee: EmployeeDocument) {
  return User.updateOne({ employee: employee._id }, {
    name: employee.name,
    email: employee.email,
    isActive: employee.status === "active",
  });
}

export async function updateUserPassword(employee: EmployeeDocument, hashedPassword: string) {
  return User.updateOne({ employee: employee._id }, { password: hashedPassword });
}

export async function countEmployeeTasks(organizationId: string, employee: EmployeeDocument) {
  return Task.countDocuments({
    organization: organizationId,
    $or: [{ assignedTo: employee._id }, { assignedByEmployee: employee._id }],
  });
}

export async function countEmployeeLeaves(organizationId: string, employee: EmployeeDocument) {
  return LeaveRequest.countDocuments({
    organization: organizationId,
    employee: employee._id,
  });
}

export async function removeAttendance(employee: EmployeeDocument) {
  return Attendance.deleteMany({ employee: employee._id });
}

export async function removeLeaveBalance(employee: EmployeeDocument) {
  return LeaveBalance.deleteMany({ employee: employee._id });
}

export async function removeUser(employee: EmployeeDocument) {
  return User.deleteOne({ employee: employee._id });
}

export async function removeEmployee(employee: EmployeeDocument) {
  return Employee.deleteOne({ _id: employee._id });
}

// ---------------------------------------------------------------------------
// Used by the Excel import
// ---------------------------------------------------------------------------

// Every department of the organization, so the import can match the
// department names of the sheet without asking the database for every row.
export async function findAllDepartments(organizationId: string) {
  return Department.find({ organization: organizationId });
}

// A department that was written in the sheet but does not exist yet.
export async function insertDepartment(organizationId: string, name: string) {
  return Department.create({
    name: name,
    organization: organizationId,
  });
}

// The active roles of the organization, matched by name in the import.
export async function findActiveRoles(organizationId: string) {
  return Role.find({
    organization: organizationId,
    status: "active",
  });
}

// Every employee with its department and role names, for the export.
export async function findEmployeesForExport(organizationId: string) {
  return Employee.find({ organization: organizationId })
    .populate("department", "name")
    .populate("role", "name")
    .sort({ name: 1 });
}
