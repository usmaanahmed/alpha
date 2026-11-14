import { axiosClient } from "./axiosClient";
import type {
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveContext,
  LeavePolicy,
} from "@/types/hr.types";

// --- Leave types ---

export interface LeaveTypeValues {
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  excludeHolidays: boolean;
  allowDocuments: boolean;
  documentRequirement: "optional" | "required";
  allowedFileKinds: string[];
  maxFileSizeMb: number;
  maxFiles: number;
  description?: string;
  status: "active" | "inactive";
}

// The organization and an HR get every leave type, a normal employee gets
// only the active ones. The server decides that, not us.
export async function getLeaveTypesRequest() {
  const response = await axiosClient.get("/leave-types");
  return response.data.data as LeaveType[];
}

export async function createLeaveTypeRequest(values: LeaveTypeValues) {
  const response = await axiosClient.post("/leave-types", values);
  return response.data;
}

export async function updateLeaveTypeRequest(
  id: string,
  values: LeaveTypeValues
) {
  const response = await axiosClient.put("/leave-types/" + id, values);
  return response.data;
}

export async function deleteLeaveTypeRequest(id: string) {
  const response = await axiosClient.delete("/leave-types/" + id);
  return response.data;
}

// --- Leave requests ---

// What the employee sends in the "apply for leave" form.
// totalDays is not here, the server counts it itself.
export interface LeaveRequestValues {
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  // The supporting papers, when the chosen leave type accepts them.
  documents?: File[];
}

// What the approver sends in the "approve or reject" form.
//
// approvedDates is the list of days they ticked, as texts like "2026-08-03".
// Left out it means "all of them". excludeWeekends says if the Saturdays and
// Sundays inside the leave count as leave days.
//
// The number of days is NOT sent: the server builds the day list itself and
// counts it, so a wrong number can never come from the browser.
export interface LeaveReviewValues {
  status: "approved" | "rejected";
  approvedDates?: string[];
  excludeWeekends?: boolean;
  reviewRemarks?: string;
  // The tasks and meetings the approver ticked. Only the kind and the id are
  // sent: the server reads the title and the date from the database itself,
  // so nothing the employee reads can be invented in the browser.
  references?: { kind: "task" | "meeting"; refId: string }[];
}

// What the team lead sends with its note. It decides nothing, it advises.
export interface LeaveRecommendValues {
  recommendation: "approve" | "reject";
  note?: string;
}

// view is "mine" or "team", status is one of the four statuses or "all".
export async function getLeaveRequestsRequest(input: {
  view: "mine" | "team";
  status: string;
}) {
  const response = await axiosClient.get("/leaves", {
    params: { view: input.view, status: input.status },
  });
  return response.data.data as LeaveRequest[];
}

// A request that can carry files cannot be plain JSON, it must be a FormData:
// that is the same thing the browser sends when a normal <form> has an
// <input type="file"> inside it.
//
// We always send a FormData, also when there is no document at all, so there
// is one single road into this route instead of two. Every document is added
// under the same name "documents", and that is how the server receives a list.
export async function createLeaveRequestRequest(values: LeaveRequestValues) {
  const formData = new FormData();

  formData.append("leaveType", values.leaveType);
  formData.append("fromDate", values.fromDate);
  formData.append("toDate", values.toDate);
  formData.append("reason", values.reason);

  (values.documents || []).forEach((file) =>
    formData.append("documents", file)
  );

  const response = await axiosClient.post("/leaves", formData);
  return response.data;
}

export async function reviewLeaveRequestRequest(
  id: string,
  values: LeaveReviewValues
) {
  const response = await axiosClient.patch("/leaves/" + id + "/review", values);
  return response.data;
}

export async function recommendLeaveRequestRequest(
  id: string,
  values: LeaveRecommendValues
) {
  const response = await axiosClient.patch(
    "/leaves/" + id + "/recommend",
    values
  );
  return response.data;
}

export async function cancelLeaveRequestRequest(id: string) {
  const response = await axiosClient.patch("/leaves/" + id + "/cancel");
  return response.data;
}

// --- Leave context and policy ---

// Everything an approver should know before answering one request: who else
// is away in the same days, what that employee has on their plate then, and
// the warnings that come out of both. It is its own request, asked only when
// somebody really opens a request to decide about it.
export async function getLeaveContextRequest(id: string) {
  const response = await axiosClient.get("/leaves/" + id + "/context");
  return response.data.data as LeaveContext;
}

export async function getLeavePolicyRequest() {
  const response = await axiosClient.get("/leaves/policy");
  return response.data.data as LeavePolicy;
}

export async function updateLeavePolicyRequest(values: LeavePolicy) {
  const response = await axiosClient.put("/leaves/policy", values);
  return response.data;
}

// --- Leave balance ---

// How many days the logged in employee still has, for every active type.
export async function getMyLeaveBalanceRequest(year: number) {
  const response = await axiosClient.get("/leaves/my-balance", {
    params: { year: year },
  });
  return response.data.data as LeaveBalance[];
}
