import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getLeaveTypesRequest,
  createLeaveTypeRequest,
  updateLeaveTypeRequest,
  deleteLeaveTypeRequest,
  getLeaveRequestsRequest,
  createLeaveRequestRequest,
  reviewLeaveRequestRequest,
  recommendLeaveRequestRequest,
  cancelLeaveRequestRequest,
  getMyLeaveBalanceRequest,
  getLeaveContextRequest,
  getLeavePolicyRequest,
  updateLeavePolicyRequest,
} from "@/api/leave.api";
import type {
  LeaveTypeValues,
  LeaveRequestValues,
  LeaveReviewValues,
  LeaveRecommendValues,
} from "@/api/leave.api";
import type { LeavePolicy } from "@/types/hr.types";
import { getErrorMessage } from "@/api/axiosClient";

// --- Leave types ---

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leaveTypes"],
    queryFn: getLeaveTypesRequest,
  });
}

// Only the active types can be chosen in the "apply for leave" form.
export function useActiveLeaveTypes() {
  const query = useLeaveTypes();

  return {
    ...query,
    data: (query.data || []).filter((leaveType) => leaveType.status === "active"),
  };
}

export function useCreateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LeaveTypeValues) => createLeaveTypeRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
      toast.success("Leave type added");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: LeaveTypeValues }) =>
      updateLeaveTypeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
      toast.success("Leave type updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteLeaveType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteLeaveTypeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveTypes"] });
      toast.success("Leave type deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// --- Leave requests ---

// enabled is there for the pages that read the whole organization only when
// the person looking at them carries "leaves.view_all". Left alone it is true.
export function useLeaveRequests(
  input: { view: "mine" | "team"; status: string },
  enabled = true
) {
  return useQuery({
    queryKey: ["leaveRequests", input.view, input.status],
    queryFn: () => getLeaveRequestsRequest(input),
    enabled: enabled,
  });
}

// Approving a leave takes days away from the balance, so after every
// change we also refresh the balance, not only the list.
//
// An approved leave also writes "on leave" rows in the attendance, so the
// attendance pages must read their days again too. Without this line an
// open attendance page would keep showing the old answer.
function refreshLeaveData(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
  queryClient.invalidateQueries({ queryKey: ["leaveBalance"] });
  queryClient.invalidateQueries({ queryKey: ["attendance"] });
  // Approving one leave changes how empty those days are for EVERY other
  // request of the same period, so the conflict picture has to be read again.
  queryClient.invalidateQueries({ queryKey: ["leaveContext"] });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LeaveRequestValues) => createLeaveRequestRequest(values),
    onSuccess: () => {
      refreshLeaveData(queryClient);
      toast.success("Leave request sent");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useReviewLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: LeaveReviewValues }) =>
      reviewLeaveRequestRequest(input.id, input.values),
    onSuccess: (data) => {
      refreshLeaveData(queryClient);
      // The server writes the sentence itself, because only it knows how many
      // days were really approved after the weekends, the holidays and the
      // already recorded attendance were taken out.
      toast.success(data.message || "Answer saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// The note a team lead writes on a request of its own team. It changes no
// status, so only the list has to be read again.
export function useRecommendLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: LeaveRecommendValues }) =>
      recommendLeaveRequestRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaveRequests"] });
      toast.success("Your recommendation was saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelLeaveRequestRequest(id),
    onSuccess: () => {
      refreshLeaveData(queryClient);
      toast.success("Leave request cancelled");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// --- Leave context and policy ---

// The context of ONE request, asked only while a dialog about it is open.
//
// id is null when no dialog is open, and then the query simply does not run:
// this is the most expensive answer of the module (it reads the employees,
// the other leaves, the teams, the tasks and the meetings), so it is never
// asked for a list.
export function useLeaveContext(id: string | null) {
  return useQuery({
    queryKey: ["leaveContext", id],
    queryFn: () => getLeaveContextRequest(String(id)),
    enabled: id !== null,
  });
}

export function useLeavePolicy() {
  return useQuery({
    queryKey: ["leavePolicy"],
    queryFn: getLeavePolicyRequest,
  });
}

export function useUpdateLeavePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: LeavePolicy) => updateLeavePolicyRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leavePolicy"] });
      // The warnings of every open request are measured against these two
      // numbers, so they have to be worked out again.
      queryClient.invalidateQueries({ queryKey: ["leaveContext"] });
      toast.success("Leave policy saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// --- Leave balance ---

export function useMyLeaveBalance(year: number) {
  return useQuery({
    queryKey: ["leaveBalance", year],
    queryFn: () => getMyLeaveBalanceRequest(year),
  });
}
