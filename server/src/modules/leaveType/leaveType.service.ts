// Leave-type rules live here, without HTTP requests or responses.
import * as leaveTypeRepository from "./leaveType.repository.js";
import type { LeaveTypeInput, LeaveTypeResult } from "./leaveType.types.js";

export async function getAllLeaveTypes(
  organizationId: string,
  canViewInactiveTypes: boolean
) {
  // Editors can see inactive types. Other employees only need active types
  // for the leave application dropdown.
  if (canViewInactiveTypes) {
    return leaveTypeRepository.findAllLeaveTypes(organizationId);
  }

  return leaveTypeRepository.findActiveLeaveTypes(organizationId);
}

export async function createLeaveType(
  organizationId: string,
  input: LeaveTypeInput
): Promise<LeaveTypeResult> {
  const existingLeaveType = await leaveTypeRepository.findLeaveTypeByName(
    organizationId,
    input.name
  );

  if (existingLeaveType) {
    return {
      status: "invalid",
      message: "A leave type with this name already exists",
    };
  }

  const leaveType = await leaveTypeRepository.insertLeaveType(organizationId, input);

  return {
    status: "success",
    message: "Leave type added successfully",
    leaveType: leaveType,
  };
}

export async function updateLeaveType(
  organizationId: string,
  leaveTypeId: string,
  input: LeaveTypeInput
): Promise<LeaveTypeResult> {
  const leaveType = await leaveTypeRepository.findLeaveTypeById(
    organizationId,
    leaveTypeId
  );

  if (!leaveType) {
    return {
      status: "not_found",
      message: "Leave type not found",
    };
  }

  const leaveTypeWithSameName = await leaveTypeRepository.findLeaveTypeByName(
    organizationId,
    input.name
  );

  // Keeping this type's current name is allowed. Only a different type
  // with that name blocks the update. Compare MongoDB ids as text.
  if (leaveTypeWithSameName) {
    const existingLeaveTypeId = String(leaveTypeWithSameName._id);
    const currentLeaveTypeId = String(leaveType._id);

    if (existingLeaveTypeId !== currentLeaveTypeId) {
      return {
        status: "invalid",
        message: "A leave type with this name already exists",
      };
    }
  }

  let description = input.description;

  if (!description) {
    description = "";
  }

  leaveType.name = input.name;
  leaveType.daysPerYear = input.daysPerYear;
  leaveType.isPaid = input.isPaid;
  leaveType.excludeHolidays = input.excludeHolidays;
  leaveType.allowDocuments = input.allowDocuments;
  leaveType.documentRequirement = input.documentRequirement;
  leaveType.allowedFileKinds = input.allowedFileKinds;
  leaveType.maxFileSizeMb = input.maxFileSizeMb;
  leaveType.maxFiles = input.maxFiles;
  leaveType.description = description;
  leaveType.status = input.status;
  await leaveTypeRepository.saveLeaveType(leaveType);

  // Existing employee balances keep their allowance for the year.
  // Only balances created later use the new daysPerYear value.
  return {
    status: "success",
    message: "Leave type updated successfully",
    leaveType: leaveType,
  };
}

export async function deleteLeaveType(
  organizationId: string,
  leaveTypeId: string
): Promise<LeaveTypeResult> {
  const leaveType = await leaveTypeRepository.findLeaveTypeById(
    organizationId,
    leaveTypeId
  );

  if (!leaveType) {
    return {
      status: "not_found",
      message: "Leave type not found",
    };
  }

  const currentLeaveTypeId = String(leaveType._id);
  const requestCount = await leaveTypeRepository.countLeaveRequests(
    organizationId,
    currentLeaveTypeId
  );

  // Used types must remain so existing requests can still read their settings.
  if (requestCount > 0) {
    return {
      status: "invalid",
      message:
        "This leave type is already used in leave requests. Make it inactive instead.",
    };
  }

  // Remove unused balances first, then the leave type itself.
  await leaveTypeRepository.removeLeaveBalances(currentLeaveTypeId);
  await leaveTypeRepository.removeLeaveType(currentLeaveTypeId);

  return {
    status: "success",
    message: "Leave type deleted successfully",
  };
}
