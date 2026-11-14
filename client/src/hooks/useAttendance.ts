import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMyTodayAttendanceRequest,
  checkInRequest,
  checkOutRequest,
  getMyAttendanceRequest,
  getAttendanceOfDayRequest,
  getAttendanceOfMonthRequest,
  markAttendanceRequest,
} from "@/api/attendance.api";
import type { MarkAttendanceValues } from "@/api/attendance.api";
import { getErrorMessage } from "@/api/axiosClient";

// The row of today, used by the check in / check out card.
export function useMyTodayAttendance() {
  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: getMyTodayAttendanceRequest,
  });
}

// My own days of one month. month is 1 for January.
export function useMyAttendance(input: { year: number; month: number }) {
  return useQuery({
    queryKey: ["attendance", "me", input.year, input.month],
    queryFn: () => getMyAttendanceRequest(input),
  });
}

// The whole organization for one day. Only the organization and an HR
// may read this, so we only use it on their pages.
//
// enabled is there for the pages that ask for it only when the person looking
// at them carries "attendance.view_all". Left alone it is true.
export function useAttendanceOfDay(date: string, enabled = true) {
  return useQuery({
    queryKey: ["attendance", "day", date],
    queryFn: () => getAttendanceOfDayRequest(date),
    enabled: enabled,
  });
}

// The whole organization for a whole month, used by the calendar page.
// Only the organization and an HR may read this.
export function useAttendanceOfMonth(input: { year: number; month: number }) {
  return useQuery({
    queryKey: ["attendance", "month", input.year, input.month],
    queryFn: () => getAttendanceOfMonthRequest(input),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkInRequest,
    onSuccess: () => {
      // Every attendance list can have changed, so we refresh them all.
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Checked in");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: checkOutRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Checked out");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MarkAttendanceValues) => markAttendanceRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
