import { axiosClient } from "./axiosClient";
import type {
  Employee,
  EmployeeLeave,
  EmployeeActivity,
} from "@/types/employee.types";
import type { Attendance, LeaveBalance } from "@/types/hr.types";

// The HR profile fields that both forms share.
// The three dates are the texts "2026-07-30" that come from the date inputs,
// and photo is the picture the user chose, or null when none was chosen.
export interface EmployeeProfileValues {
  designation?: string;
  qualification?: string;
  employmentType: "full_time" | "part_time" | "intern" | "contract";
  joiningDate?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "";
  address?: string;
  exitDate?: string;
  exitReason?: string;
  photo?: File | null;
}

// What we send when we add a new employee.
// The password is the login password of that employee.
export interface CreateEmployeeValues extends EmployeeProfileValues {
  name: string;
  email: string;
  password: string;
  phone?: string;
  departmentId: string;
  roleId: string;
  status: "active" | "inactive";
}

// What we send when we edit an employee. Here there is no password,
// it is changed with its own request.
export interface UpdateEmployeeValues extends EmployeeProfileValues {
  name: string;
  email: string;
  phone?: string;
  departmentId: string;
  roleId: string;
  status: "active" | "inactive";
}

// A request that carries a file cannot be plain JSON, it must be a
// FormData: that is the same thing the browser sends when a normal
// <form> has an <input type="file"> inside it.
//
// FormData only holds text and files, so we put every value in as text.
// A value the user left empty becomes the empty text "", and the server
// reads that as "nothing was chosen".
function toFormData(values: CreateEmployeeValues | UpdateEmployeeValues) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null) {
      continue;
    }

    // "photo" is the file itself, everything else is text.
    if (value instanceof File) {
      formData.append(key, value);
    } else {
      formData.append(key, String(value));
    }
  }

  return formData;
}

// All employees of the logged in organization.
export async function getEmployeesRequest() {
  const response = await axiosClient.get("/employees");
  return response.data.data as Employee[];
}

// One employee with all its details, for the employee detail page.
export async function getEmployeeRequest(id: string) {
  const response = await axiosClient.get("/employees/" + id);
  return response.data.data as Employee;
}

// The attendance of one employee for one month. month is 1 for January.
export async function getEmployeeAttendanceRequest(input: {
  id: string;
  year: number;
  month: number;
}) {
  const response = await axiosClient.get(
    "/employees/" + input.id + "/attendance",
    { params: { year: input.year, month: input.month } }
  );
  return response.data.data as Attendance[];
}

// Every leave request of one employee, newest first.
export async function getEmployeeLeavesRequest(id: string) {
  const response = await axiosClient.get("/employees/" + id + "/leaves");
  return response.data.data as EmployeeLeave[];
}

// The leave balance of one employee for one year.
export async function getEmployeeLeaveBalanceRequest(input: {
  id: string;
  year: number;
}) {
  const response = await axiosClient.get(
    "/employees/" + input.id + "/leave-balance",
    { params: { year: input.year } }
  );
  return response.data.data as LeaveBalance[];
}

// What one employee is busy with today: their open tasks, the meetings of
// their day, whether they are in, and what they last did. It is read when a
// row of the employee table is opened, never for the whole table.
export async function getEmployeeActivityRequest(id: string) {
  const response = await axiosClient.get("/employees/" + id + "/activity");
  return response.data.data as EmployeeActivity;
}

export async function createEmployeeRequest(values: CreateEmployeeValues) {
  const response = await axiosClient.post("/employees", toFormData(values));
  return response.data;
}

export async function updateEmployeeRequest(
  id: string,
  values: UpdateEmployeeValues
) {
  const response = await axiosClient.put("/employees/" + id, toFormData(values));
  return response.data;
}

// Set a new login password for one employee.
export async function changeEmployeePasswordRequest(id: string, password: string) {
  const response = await axiosClient.patch("/employees/" + id + "/password", {
    password: password,
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// Excel import and export
// ---------------------------------------------------------------------------

// One row of the sheet that could not be imported.
export interface EmployeeImportError {
  row: number;
  message: string;
}

export interface EmployeeImportResult {
  createdCount: number;
  createdDepartmentCount: number;
  errors: EmployeeImportError[];
}

// Ask the server for an Excel file and let the browser save it.
// responseType "blob" means "this answer is a file, not JSON".
async function downloadExcelFile(url: string, fileName: string) {
  const response = await axiosClient.get(url, { responseType: "blob" });
  const fileUrl = window.URL.createObjectURL(response.data as Blob);

  // A hidden link that we click by code is the usual way to start a download.
  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(fileUrl);
}

export async function downloadEmployeeTemplateRequest() {
  await downloadExcelFile("/employees/template", "employee-template.xlsx");
}

export async function exportEmployeesRequest() {
  await downloadExcelFile("/employees/export", "employees.xlsx");
}

export async function importEmployeesRequest(file: File) {
  const formData = new FormData();
  formData.append("sheet", file);
  const response = await axiosClient.post("/employees/import", formData);
  return response.data.data as EmployeeImportResult;
}

export async function deleteEmployeeRequest(id: string) {
  const response = await axiosClient.delete("/employees/" + id);
  return response.data;
}
