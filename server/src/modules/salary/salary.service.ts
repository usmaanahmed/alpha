// Salary rules live here. Amounts remain the values supplied by the form.
import mongoose from "mongoose";
import * as salaryRepository from "./salary.repository.js";
import type {
  Allowance,
  AllowanceInput,
  AllowanceResult,
  SalaryInput,
  SalaryResult,
  SalaryListOptions,
  SalaryFilter,
} from "./salary.types.js";

// Find the employee the form chose, but only inside MY organization.
//
// employee is null when something is wrong, so the controller only has to
// send the message back.
async function findEmployee(organizationId: string, employeeId: string) {
  // A wrong id would crash the database call, so we look at it first.
  if (!mongoose.isValidObjectId(employeeId)) {
    return { employee: null, message: "Please choose an employee" };
  }

  const employee = await salaryRepository.findEmployeeById(organizationId, employeeId);

  if (!employee) {
    return {
      employee: null,
      message: "Please choose an employee of your organization",
    };
  }

  return { employee: employee, message: "" };
}

// Read the allowance rows the form sent and hand back a clean list.
//
// zod has already checked each row on its own (a name is written, the amount
// is not negative). What is left for us is the rule that needs the whole
// list: the same allowance name cannot appear twice in one salary. We check
// it here as well, because the browser is never the real lock.
function readAllowances(sent: AllowanceInput[]): AllowanceResult {
  const allowances: Allowance[] = [];
  const seenNames: string[] = [];

  for (const row of sent) {
    const name = String(row.name || "").trim();
    const key = name.toLowerCase();

    if (seenNames.includes(key)) {
      return {
        allowances: [],
        message: 'The allowance "' + name + '" is written twice',
      };
    }

    seenNames.push(key);

    allowances.push({
      name: name,
      amount: Number(row.amount) || 0,
      description: String(row.description || "").trim(),
    });
  }

  return { allowances: allowances, message: "" };
}

// POST /api/salaries
// Create the salary structure of one employee, with its allowances.
export async function createSalary(
  organizationId: string,
  input: SalaryInput
): Promise<SalaryResult> {
  // We always take the organization id from the login token, never from the
  // request body, so one organization can never touch another one.

  const found = await findEmployee(organizationId, input.employeeId);

  if (!found.employee) {
    return {
      status: "invalid",
      message: found.message,
    };
  }

  // Every employee can have only one salary structure.
  const existingSalary = await salaryRepository.findSalaryByEmployee(
    organizationId,
    String(found.employee._id)
  );

  if (existingSalary) {
    return {
      status: "invalid",
      message:
        found.employee.name +
        " already has a salary structure. Edit that one instead of adding a second.",
    };
  }

  const checked = readAllowances(input.allowances || []);

  if (checked.message) {
    return {
      status: "invalid",
      message: checked.message,
    };
  }

  const salary = await salaryRepository.insertSalary(
    organizationId,
    String(found.employee._id),
    input,
    checked.allowances
  );

  const savedSalary = await salaryRepository.findSalaryDetails(organizationId, String(salary._id));

  return {
    status: "success",
    message: "Salary structure created successfully",
    salary: savedSalary,
  };
}

// List options have already been read from the request by the controller.
export async function getAllSalaries(
  organizationId: string,
  options: SalaryListOptions
) {
  const filter: SalaryFilter = { organization: organizationId };

  // Ignore unknown salary types, matching the existing list behavior.
  if (options.salaryType === "monthly" || options.salaryType === "daily" || options.salaryType === "hourly") {
    filter.salaryType = options.salaryType;
  }

  if (options.search !== "") {
    const employees = await salaryRepository.findEmployeesByName(organizationId, options.search);
    const employeeIds: mongoose.Types.ObjectId[] = [];

    for (const employee of employees) {
      employeeIds.push(new mongoose.Types.ObjectId(String(employee._id)));
    }

    filter.employee = { $in: employeeIds };
  }

  let sortOrder: 1 | -1 = -1;

  if (options.sortOrder === "asc") {
    sortOrder = 1;
  }

  const sortableFields = ["basicSalary", "grossSalary", "netSalary", "createdAt"];
  let sortField = "createdAt";

  if (sortableFields.includes(options.sortBy)) {
    sortField = options.sortBy;
  }

  const salaries = await salaryRepository.findSalaries(filter, sortField, sortOrder);

  // Employee names are in another collection, so compare the populated names here.
  // A missing employee uses an empty name and does not crash the list.
  if (options.sortBy === "employeeName") {
    salaries.sort(function (first, second) {
      let firstName = "";
      let secondName = "";

      if (first.employee) {
        firstName = first.employee.name || "";
      }

      if (second.employee) {
        secondName = second.employee.name || "";
      }

      return firstName.localeCompare(secondName) * sortOrder;
    });
  }

  return salaries;
}

// GET /api/salaries/:id
// One salary structure with all its allowances, for the view dialog.
export async function getSalary(
  organizationId: string,
  salaryId: string
): Promise<SalaryResult> {

  // The organization id is part of the search, so nobody can read the salary
  // of another organization by guessing an id.
  const salary = await salaryRepository.findSalaryDetails(organizationId, salaryId);

  if (!salary) {
    return {
      status: "not_found",
      message: "Salary structure not found",
    };
  }

  return {
    status: "success",
    message: "",
    salary: salary,
  };
}

// PUT /api/salaries/:id
// Change the salary information and the allowances of one employee.
export async function updateSalary(
  organizationId: string,
  salaryId: string,
  input: SalaryInput
): Promise<SalaryResult> {

  const salary = await salaryRepository.findSalaryById(organizationId, salaryId);

  if (!salary) {
    return {
      status: "not_found",
      message: "Salary structure not found",
    };
  }

  const found = await findEmployee(organizationId, input.employeeId);

  if (!found.employee) {
    return {
      status: "invalid",
      message: found.message,
    };
  }

  // The salary can move to another employee only if they have no other structure.
  const otherSalary = await salaryRepository.findSalaryByEmployee(
    organizationId,
    String(found.employee._id)
  );

  // The employee can keep this structure, but cannot have a different one too.
  if (otherSalary) {
    if (String(otherSalary._id) !== String(salary._id)) {
      return {
        status: "invalid",
        message:
          found.employee.name +
          " already has a salary structure. Edit that one instead of adding a second.",
      };
    }
  }

  const checked = readAllowances(input.allowances || []);

  if (checked.message) {
    return {
      status: "invalid",
      message: checked.message,
    };
  }

  salary.employee = new mongoose.Types.ObjectId(String(found.employee._id));
  salary.salaryType = input.salaryType;
  salary.basicSalary = input.basicSalary;
  salary.grossSalary = input.grossSalary;
  salary.netSalary = input.netSalary;
  // The whole list is replaced: the form sends the rows exactly as they
  // should be after saving, so the rows the user removed simply are not in
  // it any more.
  salary.allowances = checked.allowances;
  await salaryRepository.saveSalary(salary);

  const savedSalary = await salaryRepository.findSalaryDetails(organizationId, String(salary._id));

  return {
    status: "success",
    message: "Salary structure updated successfully",
    salary: savedSalary,
  };
}

// DELETE /api/salaries/:id
export async function deleteSalary(
  organizationId: string,
  salaryId: string
): Promise<SalaryResult> {

  const salary = await salaryRepository.findSalaryById(organizationId, salaryId);

  if (!salary) {
    return {
      status: "not_found",
      message: "Salary structure not found",
    };
  }

  // The allowances live inside the salary itself, so removing the salary
  // removes them with it and there is nothing else to clean up. The employee
  // keeps their job, they simply have no salary structure any more.
  await salaryRepository.removeSalary(String(salary._id));

  return {
    status: "success",
    message: "Salary structure deleted successfully",
  };
}
