import * as repository from "./organization.repository.js";
import type {
  CreateOrganizationInput,
  OrganizationIds,
  UpdateOrganizationInput,
  ChangeOrganizationPasswordInput,
  OrganizationModulesInput,
} from "./organization.types.js";
import { hashPassword } from "../../utils/password.util.js";
import { createDefaultRolesForOrganization } from "../../utils/roleSeed.util.js";
import { deleteEmployeePhoto } from "../../middlewares/upload.middleware.js";
import { MODULE_DEFINITIONS, isKnownModule, isKnownFeature } from "../../config/modules.js";

// POST /api/organizations
// Only the saas owner can create an organization and its login password.
export async function createOrganization(input: CreateOrganizationInput) {
  const name = input.name;
  const email = String(input.email).toLowerCase();
  const password = input.password;
  const phone = input.phone || "";
  const address = input.address || "";
  // 1. The email must not be used by another account already.
  const existingUser = await repository.findExistingUser(email);
  if (existingUser) {
    return {
      status: "invalid",
      message: "This email is already used",
    };
  }
  // 2. Create the organization document.
  const organization = await repository.insertOrganization(name, email, phone, address);
  // 3. Create the login account for that organization.
  const hashedPassword = await hashPassword(password);
  await repository.insertUser(name, email, hashedPassword, organization);
  // 4. Give the new organization the roles it starts with (Admin, Manager,
  //    HR and Employee), each one with its permissions already ticked. The
  //    organization can rename them, re-tick them or delete them later: from
  //    now on these roles belong to it and to nobody else.
  await createDefaultRolesForOrganization(String(organization._id));
  return {
    status: "success",
    message: "Organization created successfully",
    data: organization,
  };
}

// GET /api/organizations
// Returns the list of organizations for the table in the admin panel.
export async function getAllOrganizations() {
  const organizations = await repository.findOrganizations();
  return {
    status: "success",
    data: organizations,
  };
}

// GET /api/organizations/:id
export async function getOneOrganization(ids: OrganizationIds) {
  const organization = await repository.findOrganization(ids);
  if (!organization) {
    return {
      status: "not_found",
      message: "Organization not found",
    };
  }
  return {
    status: "success",
    data: organization,
  };
}

// PUT /api/organizations/:id
// The saas owner can change the name, phone, address and status.
export async function updateOrganization(input: UpdateOrganizationInput, ids: OrganizationIds) {
  const organization = await repository.findOrganization(ids);
  if (!organization) {
    return {
      status: "not_found",
      message: "Organization not found",
    };
  }
  organization.name = input.name;
  organization.phone = input.phone || "";
  organization.address = input.address || "";
  organization.status = input.status;
  await repository.saveOrganization(organization);
  // Keep the login account in sync with the organization.
  await repository.updateUserProfile(organization, input);
  return {
    status: "success",
    message: "Organization updated successfully",
    data: organization,
  };
}

// PATCH /api/organizations/:id/password
// The saas owner can set a new password for an organization.
export async function changeOrganizationPassword(
  input: ChangeOrganizationPasswordInput,
  ids: OrganizationIds,
) {
  const organization = await repository.findOrganization(ids);
  if (!organization) {
    return {
      status: "not_found",
      message: "Organization not found",
    };
  }
  const hashedPassword = await hashPassword(input.password);
  await repository.updateUserPassword(organization, hashedPassword);
  return {
    status: "success",
    message: "Password changed successfully",
  };
}

// GET /api/organizations/modules
//
// The switch board itself: every module of the app with the cards and the
// panels that can be switched inside it. It holds no data of any
// organization, it is only "what can be switched at all", and the React app
// draws the dialog of the SaaS owner from it.
//
// It has to stay ABOVE the "/:id" route, otherwise express reads "modules"
// as an organization id.
export async function getModuleCatalog() {
  return {
    status: "success",
    data: MODULE_DEFINITIONS,
  };
}

// GET /api/organizations/:id/modules
//
// What is switched OFF for this one organization. Together with the catalog
// above, that is everything the dialog needs: it draws a switch per module
// and per feature, and turns it off when its key is in one of these arrays.
export async function getOrganizationModules(ids: OrganizationIds) {
  const organization = await repository.findOrganizationModules(ids);
  if (!organization) {
    return {
      status: "not_found",
      message: "Organization not found",
    };
  }
  return {
    status: "success",
    data: {
      organizationId: String(organization._id),
      organizationName: organization.name,
      disabledModules: organization.disabledModules || [],
      disabledFeatures: organization.disabledFeatures || [],
    },
  };
}

// PUT /api/organizations/:id/modules
//
// Save the whole switch board of one organization in one go: the dialog
// sends the complete list of what is off, and we write exactly that. There
// is no "toggle one" route on purpose, because the SaaS owner flips several
// switches and then presses Save one time.
//
// Anything we do not know is thrown away instead of saved. A forgotten key
// in the database would sit there forever and switch off nothing, so the
// safest answer is to refuse it right here.
export async function updateOrganizationModules(input: OrganizationModulesInput, ids: OrganizationIds) {
  const organization = await repository.findOrganization(ids);
  if (!organization) {
    return {
      status: "not_found",
      message: "Organization not found",
    };
  }
  const sentModules: string[] = input.disabledModules || [];
  const sentFeatures: string[] = input.disabledFeatures || [];
  const unknownModule = sentModules.find((key) => !isKnownModule(key));
  if (unknownModule) {
    return {
      status: "invalid",
      message: "Unknown module: " + unknownModule,
    };
  }
  const unknownFeature = sentFeatures.find((key) => !isKnownFeature(key));
  if (unknownFeature) {
    return {
      status: "invalid",
      message: "Unknown feature: " + unknownFeature,
    };
  }
  // The same key twice would do no harm, but it makes the arrays grow every
  // time the dialog is saved, so we keep each one only once.
  // Keep each module and feature only once, even if the form repeats it.
  const disabledModules: string[] = [];
  for (const moduleKey of sentModules) {
    if (!disabledModules.includes(moduleKey)) {
      disabledModules.push(moduleKey);
    }
  }
  const disabledFeatures: string[] = [];
  for (const featureKey of sentFeatures) {
    if (!disabledFeatures.includes(featureKey)) {
      disabledFeatures.push(featureKey);
    }
  }
  organization.disabledModules = disabledModules;
  organization.disabledFeatures = disabledFeatures;
  await repository.saveOrganization(organization);
  return {
    status: "success",
    message: "Modules updated successfully",
    data: {
      organizationId: String(organization._id),
      organizationName: organization.name,
      disabledModules: organization.disabledModules,
      disabledFeatures: organization.disabledFeatures,
    },
  };
}

// DELETE /api/organizations/:id
export async function deleteOrganization(ids: OrganizationIds) {
  const organization = await repository.findOrganization(ids);
  if (!organization) {
    return {
      status: "not_found",
      message: "Organization not found",
    };
  }
  // Delete everything that belongs to this organization,
  // otherwise those documents would stay in the database forever.
  //
  // The pictures of the employees are files on the disk, not documents, so
  // they have to be thrown away one by one before the employees are gone.
  const employees = await repository.findEmployees(organization);
  for (const employee of employees) {
    deleteEmployeePhoto(employee.photo);
  }
  await repository.removeTask(organization);
  // The HR module.
  await repository.removeLeaveRequest(organization);
  await repository.removeLeaveBalance(organization);
  await repository.removeLeaveType(organization);
  await repository.removeLeavePolicy(organization);
  await repository.removeAttendance(organization);
  await repository.removeHoliday(organization);
  await repository.removeEmployee(organization);
  await repository.removeDepartment(organization);
  // The roles belong to this organization too, so they go with it.
  await repository.removeRole(organization);
  await repository.removeUser(organization);
  await repository.removeOrganization(organization);
  return {
    status: "success",
    message: "Organization deleted successfully",
  };
}
