import * as repository from "./employee.repository.js";
import * as employeeService from "./employee.service.js";
import type { ServiceActor } from "../../types/service.types.js";

// One employee that the bulk action could not touch, and why.
interface BulkFailure {
  name: string;
  message: string;
}

// POST /api/employees/bulk-delete
// Every employee goes through the normal delete, so the same rules apply:
// somebody with tasks, leave requests or a team to lead is not deleted.
// The others are deleted, and the answer says who was skipped and why.
export async function bulkDeleteEmployees(actor: ServiceActor, ids: string[]) {
  const organizationId = String(actor.user?.organizationId);
  let deletedCount = 0;
  const failures: BulkFailure[] = [];

  for (const id of ids) {
    // Nobody can delete the account they are logged in with.
    if (id === actor.user?.employeeId) {
      failures.push({ name: "You", message: "You cannot delete your own account" });
      continue;
    }

    const employee = await repository.findEmployeeDocument({ id: id }, organizationId);
    const name = employee ? employee.name : "Unknown employee";

    const result = await employeeService.deleteEmployee(actor, { id: id });
    if (result.status === "success") {
      deletedCount++;
    } else {
      failures.push({ name: name, message: result.message || "Could not delete" });
    }
  }

  return {
    status: "success",
    message: deletedCount + " employee(s) deleted",
    data: { doneCount: deletedCount, failures: failures },
  };
}

// PATCH /api/employees/bulk-status
// Makes every selected employee active or inactive. An inactive employee
// cannot login, so the login account follows the employee.
export async function bulkChangeStatus(
  actor: ServiceActor,
  ids: string[],
  status: "active" | "inactive",
) {
  const organizationId = String(actor.user?.organizationId);
  let changedCount = 0;
  const failures: BulkFailure[] = [];

  for (const id of ids) {
    const employee = await repository.findEmployeeDocument({ id: id }, organizationId);
    if (!employee) {
      failures.push({ name: "Unknown employee", message: "Employee not found" });
      continue;
    }
    if (id === actor.user?.employeeId && status === "inactive") {
      failures.push({ name: employee.name, message: "You cannot make your own account inactive" });
      continue;
    }

    employee.status = status;
    await repository.saveEmployee(employee);
    await repository.updateUserProfile(employee);
    changedCount++;
  }

  return {
    status: "success",
    message: changedCount + " employee(s) set to " + status,
    data: { doneCount: changedCount, failures: failures },
  };
}
