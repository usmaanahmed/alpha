import { axiosClient } from "./axiosClient";
import type { Organization } from "@/types/organization.types";
import type {
  ModuleDefinition,
  OrganizationModules,
} from "@/types/module.types";

export interface CreateOrganizationValues {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface UpdateOrganizationValues {
  name: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive";
}

// What the module dialog sends back: the complete list of the keys that are
// switched OFF for this organization, modules and features together.
export interface UpdateOrganizationModulesValues {
  disabledModules: string[];
  disabledFeatures: string[];
}

// Get the list of all organizations.
export async function getOrganizationsRequest() {
  const response = await axiosClient.get("/organizations");
  return response.data.data as Organization[];
}

// Create a new organization with its login password.
export async function createOrganizationRequest(values: CreateOrganizationValues) {
  const response = await axiosClient.post("/organizations", values);
  return response.data;
}

// Update the information of one organization.
export async function updateOrganizationRequest(
  id: string,
  values: UpdateOrganizationValues
) {
  const response = await axiosClient.put("/organizations/" + id, values);
  return response.data;
}

// Set a new password for one organization.
export async function changeOrganizationPasswordRequest(
  id: string,
  password: string
) {
  const response = await axiosClient.patch("/organizations/" + id + "/password", {
    password: password,
  });
  return response.data;
}

// Delete one organization.
export async function deleteOrganizationRequest(id: string) {
  const response = await axiosClient.delete("/organizations/" + id);
  return response.data;
}

// ---------------------------------------------------------------------
// The modules of one organization: what the SaaS owner switched on and off.
// ---------------------------------------------------------------------

// The switch board of the whole app: every module with the cards and the
// panels that can be switched inside it. It is the same for everybody, it
// only says what CAN be switched.
export async function getModuleCatalogRequest() {
  const response = await axiosClient.get("/organizations/modules");
  return response.data.data as ModuleDefinition[];
}

// What is switched OFF for one organization.
export async function getOrganizationModulesRequest(id: string) {
  const response = await axiosClient.get("/organizations/" + id + "/modules");
  return response.data.data as OrganizationModules;
}

// Save the whole switch board of one organization in one go: the dialog
// sends the complete list of what is off, and the server writes exactly that.
export async function updateOrganizationModulesRequest(
  id: string,
  values: UpdateOrganizationModulesValues
) {
  const response = await axiosClient.put(
    "/organizations/" + id + "/modules",
    values
  );
  return response.data;
}
