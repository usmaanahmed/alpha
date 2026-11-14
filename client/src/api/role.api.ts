import { axiosClient } from "./axiosClient";
import type {
  Role,
  PermissionGroup,
  RoleTemplate,
} from "@/types/role.types";

export interface RoleValues {
  name: string;
  description: string;
  permissions: string[];
  status: "active" | "inactive";
}

// The list of everything a role can be allowed to do, grouped by module.
// The checkbox grid of the role form is drawn from this answer.
export async function getPermissionCatalogRequest() {
  const response = await axiosClient.get("/roles/permissions");
  return response.data.data as PermissionGroup[];
}

// The roles a new organization starts with. Only the SaaS owner reads them.
export async function getRoleTemplatesRequest() {
  const response = await axiosClient.get("/roles/templates");
  return response.data.data as RoleTemplate[];
}

// Every role of my organization, active and inactive.
export async function getRolesRequest() {
  const response = await axiosClient.get("/roles");
  return response.data.data as Role[];
}

// Only the active roles, for the dropdown of the employee form.
export async function getActiveRolesRequest() {
  const response = await axiosClient.get("/roles/active");
  return response.data.data as Role[];
}

export async function createRoleRequest(values: RoleValues) {
  const response = await axiosClient.post("/roles", values);
  return response.data;
}

export async function updateRoleRequest(id: string, values: RoleValues) {
  const response = await axiosClient.put("/roles/" + id, values);
  return response.data;
}

export async function deleteRoleRequest(id: string) {
  const response = await axiosClient.delete("/roles/" + id);
  return response.data;
}
