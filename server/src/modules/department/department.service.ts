// Services apply department rules. They do not read HTTP requests or send responses.
import * as departmentRepository from "./department.repository.js";
import type { DepartmentInput, DepartmentResult } from "./department.types.js";

export async function createDepartment(
  organizationId: string,
  input: DepartmentInput
): Promise<DepartmentResult> {
  // A name can be reused in another organization, but not in the same one.
  const existingDepartment = await departmentRepository.findDepartmentByName(
    organizationId,
    input.name
  );

  if (existingDepartment) {
    return {
      status: "invalid",
      message: "This department already exists",
    };
  }

  const department = await departmentRepository.insertDepartment(
    organizationId,
    input
  );
  return {
    status: "success",
    message: "Department created successfully",
    department: department,
  };
}

export async function getAllDepartments(organizationId: string) {
  return departmentRepository.findAllDepartments(organizationId);
}

export async function getActiveDepartments(organizationId: string) {
  return departmentRepository.findActiveDepartments(organizationId);
}

export async function updateDepartment(
  organizationId: string,
  departmentId: string,
  input: DepartmentInput
): Promise<DepartmentResult> {
  const department = await departmentRepository.findDepartmentById(
    organizationId,
    departmentId
  );

  if (!department) {
    return {
      status: "not_found",
      message: "Department not found",
    };
  }

  const departmentWithSameName = await departmentRepository.findDepartmentByName(
    organizationId,
    input.name
  );

  // Keeping this department's current name is allowed. Only another
  // department with that name should block the update. MongoDB ids are
  // objects, so compare their text values instead of the objects themselves.
  if (departmentWithSameName) {
    const existingDepartmentId = String(departmentWithSameName._id);
    const currentDepartmentId = String(department._id);

    if (existingDepartmentId !== currentDepartmentId) {
      return {
        status: "invalid",
        message: "This department already exists",
      };
    }
  }

  let description = input.description;

  if (!description) {
    description = "";
  }

  department.name = input.name;
  department.description = description;
  department.status = input.status;
  await departmentRepository.saveDepartment(department);

  return {
    status: "success",
    message: "Department updated successfully",
    department: department,
  };
}

export async function deleteDepartment(
  organizationId: string,
  departmentId: string
): Promise<DepartmentResult> {
  const department = await departmentRepository.findDepartmentById(
    organizationId,
    departmentId
  );

  if (!department) {
    return {
      status: "not_found",
      message: "Department not found",
    };
  }

  // Check employees first, then teams. Deleting a department while either
  // still belongs to it would leave those records without their department.
  const employeeCount = await departmentRepository.countDepartmentEmployees(
    departmentId
  );

  if (employeeCount > 0) {
    return {
      status: "invalid",
      message:
        "This department has " +
        employeeCount +
        " employee(s). Move or delete them first.",
    };
  }

  const teamCount = await departmentRepository.countDepartmentTeams(
    organizationId,
    departmentId
  );

  if (teamCount > 0) {
    return {
      status: "invalid",
      message: "This department has " + teamCount + " team(s). Delete them first.",
    };
  }

  await departmentRepository.removeDepartment(departmentId);
  return {
    status: "success",
    message: "Department deleted successfully",
  };
}
