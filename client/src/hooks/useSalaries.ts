import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSalariesRequest,
  getSalaryRequest,
  createSalaryRequest,
  updateSalaryRequest,
  deleteSalaryRequest,
} from "@/api/salary.api";
import type { SalaryValues, SalaryListOptions } from "@/api/salary.api";
import { getErrorMessage } from "@/api/axiosClient";

// All salary structures of my organization.
//
// options is the search / filter / sort the server can do. The page leaves it
// empty and narrows the list in the browser instead, like every other table
// of this app.
//
// enabled is there for the pages that read this list only when the person
// looking at them carries "salaries.view". Left alone it is true.
export function useSalaries(options: SalaryListOptions = {}, enabled = true) {
  return useQuery({
    // The options are part of the key, so asking for another sort really does
    // read the list again instead of showing the old answer.
    queryKey: ["salaries", options],
    queryFn: () => getSalariesRequest(options),
    enabled: enabled,
  });
}

// One salary structure, for the view dialog.
// enabled: false stops the request while the dialog is closed.
export function useSalary(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["salary", id],
    queryFn: () => getSalaryRequest(id),
    enabled: enabled,
  });
}

// After every change the list has to be read again. One line, used by the
// three mutations below.
function reloadSalaries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["salaries"] });
  queryClient.invalidateQueries({ queryKey: ["salary"] });
}

export function useCreateSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SalaryValues) => createSalaryRequest(values),
    onSuccess: () => {
      reloadSalaries(queryClient);
      toast.success("Salary structure created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: SalaryValues }) =>
      updateSalaryRequest(input.id, input.values),
    onSuccess: () => {
      reloadSalaries(queryClient);
      toast.success("Salary structure updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteSalary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSalaryRequest(id),
    onSuccess: () => {
      reloadSalaries(queryClient);
      toast.success("Salary structure deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
