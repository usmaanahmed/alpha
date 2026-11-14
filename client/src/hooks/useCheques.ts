import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getChequesRequest,
  createChequeRequest,
  updateChequeRequest,
  deleteChequeRequest,
  changeChequeStatusRequest,
  depositChequeRequest,
  clearChequeRequest,
  bounceChequeRequest,
  cancelChequeRequest,
  uploadChequeScanRequest,
  deleteChequeScanRequest,
} from "@/api/cheque.api";
import type {
  ChequeValues,
  ChequeStatusValues,
  ChequeDepositValues,
  ChequeClearanceValues,
  ChequeBounceValues,
  ChequeCancelValues,
} from "@/api/cheque.api";
import { getErrorMessage } from "@/api/axiosClient";

// The whole cheque list. The dashboard, the reminders and the table all read
// from this one query, so they never disagree with each other.
export function useCheques() {
  return useQuery({
    queryKey: ["cheques"],
    queryFn: getChequesRequest,
  });
}

export function useCreateCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ChequeValues) => createChequeRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: ChequeValues }) =>
      updateChequeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteChequeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useChangeChequeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: ChequeStatusValues }) =>
      changeChequeStatusRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque status updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDepositCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: ChequeDepositValues }) =>
      depositChequeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque marked as deposited");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useClearCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: ChequeClearanceValues }) =>
      clearChequeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque marked as cleared");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useBounceCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: ChequeBounceValues }) =>
      bounceChequeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque marked as bounced");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: ChequeCancelValues }) =>
      cancelChequeRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque cancelled");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUploadChequeScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; file: File }) =>
      uploadChequeScanRequest(input.id, input.file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque scan uploaded");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteChequeScan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteChequeScanRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque scan removed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
