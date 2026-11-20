import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getEmployeesRequest,
  getEmployeeRequest,
  getEmployeeAttendanceRequest,
  getEmployeeLeavesRequest,
  getEmployeeLeaveBalanceRequest,
  getEmployeeActivityRequest,
  createEmployeeRequest,
  updateEmployeeRequest,
  changeEmployeePasswordRequest,
  deleteEmployeeRequest,
  downloadEmployeeTemplateRequest,
  exportEmployeesRequest,
  importEmployeesRequest,
} from "@/api/employee.api";
import type {
  CreateEmployeeValues,
  UpdateEmployeeValues,
} from "@/api/employee.api";
import { getErrorMessage } from "@/api/axiosClient";

// Every employee of my organization.
//
// enabled is there for the pages that read this list only when the person
// looking at them carries "employees.view". Left alone it is true, so every
// page that was written before this line keeps working exactly as it did.
export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesRequest,
    enabled: enabled,
  });
}

// One employee with all its details, for the detail page.
export function useEmployee(id: string) {
  return useQuery({
    queryKey: ["employee", id],
    queryFn: () => getEmployeeRequest(id),
  });
}

// The attendance of one employee for one month. month is 1 for January.
export function useEmployeeAttendance(input: {
  id: string;
  year: number;
  month: number;
}) {
  return useQuery({
    queryKey: ["employee", input.id, "attendance", input.year, input.month],
    queryFn: () => getEmployeeAttendanceRequest(input),
  });
}

// Every leave request of one employee.
export function useEmployeeLeaves(id: string) {
  return useQuery({
    queryKey: ["employee", id, "leaves"],
    queryFn: () => getEmployeeLeavesRequest(id),
  });
}

// The leave balance of one employee for one year.
export function useEmployeeLeaveBalance(input: { id: string; year: number }) {
  return useQuery({
    queryKey: ["employee", input.id, "leaveBalance", input.year],
    queryFn: () => getEmployeeLeaveBalanceRequest(input),
  });
}

// What one employee is busy with today, for the accordion of the table.
//
// isOpen is "the row is open right now". React Query only asks the server
// when it is true, so a table of fifty people makes no extra request at all
// until somebody really opens a row, and the answer is still in the cache
// when they close that row and open it again.
export function useEmployeeActivity(id: string, isOpen: boolean) {
  return useQuery({
    queryKey: ["employeeActivity", id],
    queryFn: () => getEmployeeActivityRequest(id),
    enabled: isOpen,
    // The panel says what is happening RIGHT NOW, so an answer older than a
    // minute is read again the next time the row is opened.
    staleTime: 60 * 1000,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateEmployeeValues) => createEmployeeRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: UpdateEmployeeValues }) =>
      updateEmployeeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Change the login password of one employee.
export function useChangeEmployeePassword() {
  return useMutation({
    mutationFn: (input: { id: string; password: string }) =>
      changeEmployeePasswordRequest(input.id, input.password),
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDownloadEmployeeTemplate() {
  return useMutation({
    mutationFn: downloadEmployeeTemplateRequest,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useExportEmployees() {
  return useMutation({
    mutationFn: exportEmployeesRequest,
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// The page shows the result itself (how many were added, which rows failed),
// so this hook only refreshes the table and reports a failed upload.
export function useImportEmployees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importEmployeesRequest(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      // The import may have created new departments.
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["active-departments"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEmployeeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
