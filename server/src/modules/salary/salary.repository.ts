// Salary and employee database queries for this module belong here.
import { Salary } from "./salary.model.js";
import { Employee } from "../employee/employee.model.js";
import type {
  SalaryDocument,
  SalaryInput,
  SalaryEmployee,
  SalaryFilter,
  Allowance,
} from "./salary.types.js";

const EMPLOYEE_FIELDS = "name email photo designation status";

export async function findEmployeeById(organizationId: string, employeeId: string) {
  return Employee.findOne({ _id: employeeId, organization: organizationId });
}

export async function findEmployeesByName(organizationId: string, search: string) {
  // Escape regex characters so a search such as "a.b" matches that exact text.
  const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Employee.find({
    organization: organizationId,
    name: { $regex: escapedSearch, $options: "i" },
  }).select("_id");
}

export async function findSalaryByEmployee(organizationId: string, employeeId: string) {
  return Salary.findOne({ organization: organizationId, employee: employeeId });
}

export async function findSalaryById(organizationId: string, salaryId: string) {
  // Always include the organization to protect another workspace's salary.
  return Salary.findOne({ _id: salaryId, organization: organizationId });
}

export async function findSalaryDetails(organizationId: string, salaryId: string) {
  // This simple type tells TypeScript that populate replaces the employee id
  // with employee fields (or null if that employee no longer exists).
  return Salary.findOne({ _id: salaryId, organization: organizationId })
    .populate<{ employee: SalaryEmployee | null }>("employee", EMPLOYEE_FIELDS);
}

export async function findSalaries(
  filter: SalaryFilter,
  sortField: string,
  sortOrder: 1 | -1
) {
  // lean() returns plain data so the service can also sort by employee name.
  return Salary.find(filter)
    .populate<{ employee: SalaryEmployee | null }>("employee", EMPLOYEE_FIELDS)
    .sort({ [sortField]: sortOrder })
    .lean();
}

export async function insertSalary(
  organizationId: string,
  employeeId: string,
  input: SalaryInput,
  allowances: Allowance[]
) {
  return Salary.create({
    organization: organizationId,
    employee: employeeId,
    salaryType: input.salaryType,
    basicSalary: input.basicSalary,
    grossSalary: input.grossSalary,
    netSalary: input.netSalary,
    allowances: allowances,
  });
}

export async function saveSalary(salary: SalaryDocument) {
  await salary.save();
}

export async function removeSalary(salaryId: string) {
  await Salary.deleteOne({ _id: salaryId });
}
