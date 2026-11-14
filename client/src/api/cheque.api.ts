import { axiosClient } from "./axiosClient";
import type { Cheque } from "@/types/cheque.types";

// What the big "create / edit cheque" form sends to the server.
export interface ChequeValues {
  chequeNumber: string;
  bank: string;
  bankAccount?: string;
  type: "received" | "issued";
  partyType: "customer" | "vendor" | "employee" | "other";
  partyName?: string;
  amount: number;
  issueDate?: string;
  chequeDate?: string;
  dueDate?: string;
  description?: string;
  status: "draft" | "issued" | "received";
}

// What the small "change status" form sends (Issue, Receive, Return,
// Expire, or re-present a bounced cheque).
export interface ChequeStatusValues {
  status:
    | "draft"
    | "issued"
    | "received"
    | "deposited"
    | "cleared"
    | "bounced"
    | "cancelled"
    | "returned"
    | "expired";
  note?: string;
}

export interface ChequeDepositValues {
  date: string;
  bank?: string;
  depositedBy?: string;
  slipNumber?: string;
  remarks?: string;
}

export interface ChequeClearanceValues {
  date: string;
  clearedBy?: string;
  bankReference?: string;
  transactionId?: string;
  remarks?: string;
}

export interface ChequeBounceValues {
  date: string;
  reason: string;
  charges?: number;
  actionTaken?: string;
  rePresentAllowed?: boolean;
  rePresentDate?: string;
  remarks?: string;
}

export interface ChequeCancelValues {
  date: string;
  cancelledBy?: string;
  reason: string;
}

export async function getChequesRequest() {
  const response = await axiosClient.get("/cheques");
  return response.data.data as Cheque[];
}

export async function createChequeRequest(values: ChequeValues) {
  const response = await axiosClient.post("/cheques", values);
  return response.data;
}

export async function updateChequeRequest(id: string, values: ChequeValues) {
  const response = await axiosClient.put("/cheques/" + id, values);
  return response.data;
}

export async function deleteChequeRequest(id: string) {
  const response = await axiosClient.delete("/cheques/" + id);
  return response.data;
}

export async function changeChequeStatusRequest(
  id: string,
  values: ChequeStatusValues
) {
  const response = await axiosClient.patch("/cheques/" + id + "/status", values);
  return response.data;
}

export async function depositChequeRequest(
  id: string,
  values: ChequeDepositValues
) {
  const response = await axiosClient.patch("/cheques/" + id + "/deposit", values);
  return response.data;
}

export async function clearChequeRequest(
  id: string,
  values: ChequeClearanceValues
) {
  const response = await axiosClient.patch("/cheques/" + id + "/clear", values);
  return response.data;
}

export async function bounceChequeRequest(
  id: string,
  values: ChequeBounceValues
) {
  const response = await axiosClient.patch("/cheques/" + id + "/bounce", values);
  return response.data;
}

export async function cancelChequeRequest(
  id: string,
  values: ChequeCancelValues
) {
  const response = await axiosClient.patch("/cheques/" + id + "/cancel", values);
  return response.data;
}

// The scan travels as a FormData, because a file cannot go inside JSON.
// "scan" is the same field name the server reads.
export async function uploadChequeScanRequest(id: string, file: File) {
  const formData = new FormData();
  formData.append("scan", file);

  const response = await axiosClient.post("/cheques/" + id + "/scan", formData);
  return response.data;
}

export async function deleteChequeScanRequest(id: string) {
  const response = await axiosClient.delete("/cheques/" + id + "/scan");
  return response.data;
}
