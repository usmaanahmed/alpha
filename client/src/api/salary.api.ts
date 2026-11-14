import { axiosClient } from "./axiosClient";
import type { Salary } from "@/types/salary.types";

// What the "create salary" and "edit salary" form sends to the server.
export interface SalaryValues {
  employeeId: string;
  salaryType: "monthly" | "daily" | "hourly";
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: {
    name: string;
    amount: number;
    description: string;
  }[];
}

// The search, the filter and the sort the list can be asked for. Every one of
// them is optional: without any of them the server sends every salary of the
// organization, newest first.
//
// The salary table itself searches and sorts in the browser, exactly like
// every other table of this app. These options are here for the times the
// list has to come back already narrowed, for example from a link or from
// another tool talking to the API.
export interface SalaryListOptions {
  search?: string;
  salaryType?: "monthly" | "daily" | "hourly" | "";
  sortBy?: "employeeName" | "basicSalary" | "grossSalary" | "netSalary" | "createdAt";
  sortOrder?: "asc" | "desc";
}

// All salary structures of the logged in organization.
export async function getSalariesRequest(options: SalaryListOptions = {}) {
  const response = await axiosClient.get("/salaries", {
    // axios turns this object into "?search=ali&salaryType=monthly".
    params: {
      search: options.search || undefined,
      salaryType: options.salaryType || undefined,
      sortBy: options.sortBy || undefined,
      sortOrder: options.sortOrder || undefined,
    },
  });

  return response.data.data as Salary[];
}

// One salary structure with all its allowances.
export async function getSalaryRequest(id: string) {
  const response = await axiosClient.get("/salaries/" + id);
  return response.data.data as Salary;
}

export async function createSalaryRequest(values: SalaryValues) {
  const response = await axiosClient.post("/salaries", values);
  return response.data;
}

export async function updateSalaryRequest(id: string, values: SalaryValues) {
  const response = await axiosClient.put("/salaries/" + id, values);
  return response.data;
}

export async function deleteSalaryRequest(id: string) {
  const response = await axiosClient.delete("/salaries/" + id);
  return response.data;
}
