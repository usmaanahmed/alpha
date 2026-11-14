import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getDepartmentsRequest,
  getActiveDepartmentsRequest,
  createDepartmentRequest,
  updateDepartmentRequest,
  deleteDepartmentRequest,
} from "@/api/department.api";
import type { DepartmentValues } from "@/api/department.api";
import { getErrorMessage } from "@/api/axiosClient";

// All departments of my organization.
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: getDepartmentsRequest,
  });
}

// Only the active ones, for the employee form dropdown.
export function useActiveDepartments() {
  return useQuery({
    queryKey: ["active-departments"],
    queryFn: getActiveDepartmentsRequest,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: DepartmentValues) => createDepartmentRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["active-departments"] });
      toast.success("Department created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: DepartmentValues }) =>
      updateDepartmentRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["active-departments"] });
      toast.success("Department updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDepartmentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["active-departments"] });
      toast.success("Department deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
