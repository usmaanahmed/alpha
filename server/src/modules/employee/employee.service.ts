import type {
  HrProfile,
  UpdateEmployeeInput,
  CreateEmployeeInput,
  EmployeeIds,
  EmployeeOptions,
  ChangeEmployeePasswordInput,
} from "./employee.types.js";
import * as repository from "./employee.repository.js";
import type { ServiceActor, UploadedFile } from "../../types/service.types.js";
import { hashPassword } from "../../utils/password.util.js";
import { deleteEmployeePhoto } from "../../middlewares/upload.middleware.js";
import { toDayStart } from "../../utils/date.util.js";
import { syncLeaveAttendance } from "../../utils/leaveAttendance.util.js";
import { notifyAboutMyAccount } from "../../utils/notification.util.js";

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// All the HR profile fields, read from the form and made ready for the
// database. The three dates arrive as text like "2026-07-30", and an empty
// text means "no date", so toDayStart gives back null.
function readHrProfileFields(input: UpdateEmployeeInput): HrProfile {
  return {
    designation: input.designation || "",
    qualification: input.qualification || "",
    employmentType: input.employmentType,
    joiningDate: toDayStart(input.joiningDate),
    dateOfBirth: toDayStart(input.dateOfBirth),
    gender: input.gender || "",
    address: input.address || "",
    exitDate: toDayStart(input.exitDate),
    exitReason: input.exitReason || "",
  };
}

// Multer saves the picture on the disk before the controller runs, so when
// we stop the request with an error the file is already there and nobody
// will ever use it. This helper answers with the error and throws that
// unused file away in the same moment.
function failWith(uploadedFile: UploadedFile | undefined, message: string) {
  if (uploadedFile) {
    deleteEmployeePhoto(uploadedFile.filename);
  }
  return {
    status: "invalid",
    message: message,
    data: undefined,
  };
}

// POST /api/employees
// The organization adds an employee, choosing one of its own departments
// and one of the active roles created by the SaaS owner.
// Every employee also gets a login account, so an employee (and a manager)
// can login and work on the tasks.
export async function createEmployee(
  actor: ServiceActor,
  input: CreateEmployeeInput,
  uploadedFile: UploadedFile | undefined,
) {
  const organizationId = String(actor.user?.organizationId);
  const email = String(input.email).toLowerCase();
  // 1. The email must be free inside this organization.
  const existingEmployee = await repository.findExistingEmployee(organizationId, email);
  if (existingEmployee) {
    return failWith(uploadedFile, "An employee with this email already exists");
  }
  // 2. The email is also the login email, and one login email is used
  //    only one time in the whole application.
  const existingUser = await repository.findExistingUser(email);
  if (existingUser) {
    return failWith(uploadedFile, "This email is already used as a login email");
  }
  // 3. The department must belong to this organization.
  const department = await repository.findDepartment(input.departmentId, organizationId);
  if (!department) {
    return failWith(uploadedFile, "Please choose a department of your organization");
  }
  // 4. The role must be an active role OF MY OWN ORGANIZATION, so nobody can
  //    send the id of a role that belongs to another company.
  const role = await repository.findRole(input.roleId, organizationId);
  if (!role) {
    return failWith(uploadedFile, "This role is not available");
  }
  const employee = await repository.insertEmployee(input, email, organizationId, department, role, uploadedFile, readHrProfileFields(input));
  // 5. Create the login account of this employee.
  const hashedPassword = await hashPassword(input.password);
  await repository.insertUser(input, email, hashedPassword, organizationId, employee);
  return {
    status: "success",
    message: "Employee added successfully",
    data: employee,
  };
}

// GET /api/employees
// populate() replaces the department id and the role id with the
// real documents, so the table can show their names.
export async function getAllEmployees(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const employees = await repository.findEmployees(organizationId);
  return {
    status: "success",
    data: employees,
  };
}

// GET /api/employees/:id
// One employee with all its details, used by the employee detail page.
// We always check the employee belongs to the logged in organization, so
// one organization can never read the employees of another one by guessing
// an id.
export async function getOneEmployee(actor: ServiceActor, ids: EmployeeIds) {
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployee(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  return {
    status: "success",
    data: employee,
  };
}

// GET /api/employees/:id/attendance?year=2026&month=7
// The attendance of one employee for one month. This is the same answer as
// the "my attendance" page of the employee, but read by the organization
// for somebody else. month is 1 for January.
export async function getEmployeeAttendance(actor: ServiceActor, options: EmployeeOptions, ids: EmployeeIds) {
  const organizationId = String(actor.user?.organizationId);
  // The employee must belong to this organization.
  const employee = await repository.findEmployeeDocument(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  const now = new Date();
  const year = Number(options.year) || now.getUTCFullYear();
  const month = Number(options.month) || now.getUTCMonth() + 1;
  // From the first day of that month up to (but not including) the first
  // day of the next month. Date.UTC(2026, 12, 1) is January 2027 by itself,
  // so December needs no special case.
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfNextMonth = new Date(Date.UTC(year, month, 1));
  // The last day of the month, which the sync wants as the end of the period.
  const lastDay = new Date(firstDayOfNextMonth);
  lastDay.setUTCDate(lastDay.getUTCDate() - 1);
  // Turn the approved leaves of this month into "on leave" rows first, so
  // the calendar and the table show them like any other day.
  await syncLeaveAttendance(organizationId, firstDay, lastDay, String(employee._id));
  const attendances = await repository.findAttendances(organizationId, employee, firstDay, firstDayOfNextMonth);
  return {
    status: "success",
    data: attendances,
  };
}

// GET /api/employees/:id/leaves
// Every leave request of one employee, newest first, for the detail page.
export async function getEmployeeLeaves(actor: ServiceActor, ids: EmployeeIds) {
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployeeDocument(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  const leaves = await repository.findLeaves(organizationId, employee);
  return {
    status: "success",
    data: leaves,
  };
}

// GET /api/employees/:id/leave-balance?year=2026
// How many days of every leave type this employee still has for the year.
// remaining is never saved, it is always allocated - used.
export async function getEmployeeLeaveBalance(
  actor: ServiceActor,
  options: EmployeeOptions,
  ids: EmployeeIds,
) {
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployeeDocument(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  const year = Number(options.year) || new Date().getUTCFullYear();
  const balances = await repository.findBalances(organizationId, employee, year);
  // Add the computed "remaining" to every row, the same way the employee's
  // own balance page does.
  const balancesWithRemaining = balances.map((balance) => ({
    _id: String(balance._id),
    leaveType: balance.leaveType,
    year: balance.year,
    allocated: balance.allocated,
    used: balance.used,
    remaining: balance.allocated - balance.used,
  }));
  return {
    status: "success",
    data: balancesWithRemaining,
  };
}

// PUT /api/employees/:id
export async function updateEmployee(
  actor: ServiceActor,
  input: UpdateEmployeeInput,
  ids: EmployeeIds,
  uploadedFile: UploadedFile | undefined,
) {
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployeeDocument(ids, organizationId);
  if (!employee) {
    // The employee is gone, so a picture sent with this request is useless.
    if (uploadedFile) {
      deleteEmployeePhoto(uploadedFile.filename);
    }
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  const email = String(input.email).toLowerCase();
  // Another employee of this organization must not use the same email.
  const employeeWithSameEmail = await repository.findEmployeeWithSameEmail(organizationId, email, employee);
  if (employeeWithSameEmail) {
    return failWith(uploadedFile, "An employee with this email already exists");
  }
  // The email must also be free on the login accounts of everybody else.
  const userWithSameEmail = await repository.findUserWithSameEmail(email, employee);
  if (userWithSameEmail) {
    return failWith(uploadedFile, "This email is already used as a login email");
  }
  const department = await repository.findDepartment(input.departmentId, organizationId);
  if (!department) {
    return failWith(uploadedFile, "Please choose a department of your organization");
  }
  // The role must be an active role of my own organization.
  const role = await repository.findRole(input.roleId, organizationId);
  if (!role) {
    return failWith(uploadedFile, "This role is not available");
  }
  // A team and its people always live in the same department, so moving
  // somebody to another department takes them out of their team.
  const departmentChanged = String(employee.department) !== String(department._id);
  if (departmentChanged) {
    const ledTeamCount = await repository.countLedTeams(organizationId, employee);
    if (ledTeamCount > 0) {
      return failWith(uploadedFile, "This employee leads a team in the old department. Choose another team lead first.");
    }
    await repository.removeEmployeeFromTeams(organizationId, employee);
  }
  employee.name = input.name;
  employee.email = email;
  employee.phone = input.phone || "";
  employee.department = department._id;
  employee.role = role._id;
  employee.status = input.status;
  const hrFields = readHrProfileFields(input);
  employee.designation = hrFields.designation;
  employee.qualification = hrFields.qualification;
  employee.employmentType = hrFields.employmentType;
  employee.joiningDate = hrFields.joiningDate;
  employee.dateOfBirth = hrFields.dateOfBirth;
  employee.gender = hrFields.gender;
  employee.address = hrFields.address;
  employee.exitDate = hrFields.exitDate;
  employee.exitReason = hrFields.exitReason;
  // A new picture replaces the old one, and the old file is thrown away so
  // the uploads folder does not fill up with pictures nobody uses.
  // No new picture means we simply keep the one that is already there.
  if (uploadedFile) {
    const oldPhoto = employee.photo;
    employee.photo = uploadedFile.filename;
    deleteEmployeePhoto(oldPhoto);
  }
  await repository.saveEmployee(employee);
  // Keep the login account in sync. An inactive employee cannot login.
  await repository.updateUserProfile(employee);
  // The workspace hears "an employee was updated" from the middleware. This
  // is the line the middleware cannot write: the one to the person whose
  // record it actually was.
  const me = actor.employee;
  await notifyAboutMyAccount({
    organizationId: organizationId,
    employeeId: String(employee._id),
    title: "Your details were updated",
    message: "Somebody changed the details on your employee record",
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Employee updated successfully",
    data: employee,
  };
}

// PATCH /api/employees/:id/password
// The organization sets a new login password for one of its employees.
export async function changeEmployeePassword(
  actor: ServiceActor,
  input: ChangeEmployeePasswordInput,
  ids: EmployeeIds,
) {
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployeeDocument(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  const hashedPassword = await hashPassword(input.password);
  await repository.updateUserPassword(employee, hashedPassword);
  // The one notification nobody should ever miss. Somebody who is not the
  // owner of this account just changed the way into it, and because the bell
  // is live the owner sees it the same second it happens.
  const me = actor.employee;
  await notifyAboutMyAccount({
    organizationId: organizationId,
    employeeId: String(employee._id),
    title: "Your password was changed",
    message: "The password of your account was changed for you",
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Password changed successfully",
  };
}

// DELETE /api/employees/:id
export async function deleteEmployee(actor: ServiceActor, ids: EmployeeIds) {
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployeeDocument(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  // An employee who still has tasks cannot be deleted, otherwise those
  // tasks would point to somebody who does not exist any more.
  // It is the same idea as "a role that is used cannot be deleted".
  const taskCount = await repository.countEmployeeTasks(organizationId, employee);
  if (taskCount > 0) {
    return {
      status: "invalid",
      message: "This employee still has tasks. Delete those tasks first, or make the employee inactive instead.",
    };
  }
  // The same idea for the HR data: a leave request must never point to
  // somebody who does not exist any more.
  const leaveCount = await repository.countEmployeeLeaves(organizationId, employee);
  if (leaveCount > 0) {
    return {
      status: "invalid",
      message: "This employee has leave requests. Make the employee inactive instead of deleting.",
    };
  }
  // A team without its lead has nobody to give the work, so we ask the
  // organization to choose another lead before deleting this person.
  const ledTeamCount = await repository.countLedTeams(organizationId, employee);
  if (ledTeamCount > 0) {
    return {
      status: "invalid",
      message: "This employee is the lead of " +
        ledTeamCount +
        " team(s). Choose another team lead first.",
    };
  }
  // Being a member of a team is not a reason to stop: the person simply
  // leaves that team, so we take their name out of every member list.
  await repository.removeEmployeeFromTeams(organizationId, employee);
  // The attendance rows and the leave balances belong only to this employee,
  // so they go away together with it. The picture file on the disk too.
  await repository.removeAttendance(employee);
  await repository.removeLeaveBalance(employee);
  deleteEmployeePhoto(employee.photo);
  // The employee and the login account of that employee go away together.
  await repository.removeUser(employee);
  await repository.removeEmployee(employee);
  return {
    status: "success",
    message: "Employee deleted successfully",
  };
}
