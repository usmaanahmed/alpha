import { axiosClient } from "./axiosClient";
import type { Department } from "@/types/department.types";

export interface DepartmentValues {
  name: string;
  description?: string;
  status: "active" | "inactive";
}

// All departments of the logged in organization.
export async function getDepartmentsRequest() {
  const response = await axiosClient.get("/departments");
  return response.data.data as Department[];
}

// Only the active ones, used by the department dropdown of the employee form.
export async function getActiveDepartmentsRequest() {
  const response = await axiosClient.get("/departments/active");
  return response.data.data as Department[];
}

export async function createDepartmentRequest(values: DepartmentValues) {
  const response = await axiosClient.post("/departments", values);
  return response.data;
}

export async function updateDepartmentRequest(id: string, values: DepartmentValues) {
  const response = await axiosClient.put("/departments/" + id, values);
  return response.data;
}

export async function deleteDepartmentRequest(id: string) {
  const response = await axiosClient.delete("/departments/" + id);
  return response.data;
}
