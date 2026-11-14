import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getHolidaysRequest,
  createHolidayRequest,
  updateHolidayRequest,
  deleteHolidayRequest,
} from "@/api/holiday.api";
import type { HolidayValues } from "@/api/holiday.api";
import { getErrorMessage } from "@/api/axiosClient";

// The year is part of the query key, so changing the year in the page
// reads the holidays of that year and keeps the old year in the cache.
export function useHolidays(year: number) {
  return useQuery({
    queryKey: ["holidays", year],
    queryFn: () => getHolidaysRequest(year),
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: HolidayValues) => createHolidayRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday added");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: HolidayValues }) =>
      updateHolidayRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteHolidayRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast.success("Holiday deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
