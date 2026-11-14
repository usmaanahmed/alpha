// Only this file talks to the database for department operations.
import { Department } from "./department.model.js";
import type { DepartmentDocument } from "./department.types.js";
import type { DepartmentInput } from "./department.types.js";
import { Employee } from "../employee/employee.model.js";
import { Team } from "../team/team.model.js";

export async function findDepartmentById(
  organizationId: string,
  departmentId: string
) {
  // Include the organization so another workspace's department cannot be used.
  return Department.findOne({
    _id: departmentId,
    organization: organizationId,
  });
}

export async function findDepartmentByName(organizationId: string, name: string) {
  return Department.findOne({
    organization: organizationId,
    name: name,
  });
}

export async function findAllDepartments(organizationId: string) {
  // -1 puts the newest departments first.
  return Department.find({
    organization: organizationId,
  }).sort({ createdAt: -1 });
}

export async function findActiveDepartments(organizationId: string) {
  // 1 sorts department names from A to Z for dropdowns.
  return Department.find({
    organization: organizationId,
    status: "active",
  }).sort({ name: 1 });
}

export async function insertDepartment(organizationId: string, input: DepartmentInput) {
  let description = input.description;

  if (!description) {
    description = "";
  }

  return Department.create({
    name: input.name,
    description: description,
    status: input.status,
    organization: organizationId,
  });
}

export async function saveDepartment(department: DepartmentDocument) {
  return department.save();
}

export async function countDepartmentEmployees(departmentId: string) {
  return Employee.countDocuments({ department: departmentId });
}

export async function countDepartmentTeams(
  organizationId: string,
  departmentId: string
) {
  return Team.countDocuments({
    organization: organizationId,
    department: departmentId,
  });
}

export async function removeDepartment(departmentId: string) {
  await Department.deleteOne({ _id: departmentId });
}
