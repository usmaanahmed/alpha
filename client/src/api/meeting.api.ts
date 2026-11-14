import { axiosClient } from "./axiosClient";
import type {
  Meeting,
  AssignableEmployee,
  MeetingConflict,
} from "@/types/meeting.types";

// When the server refuses a time because it clashes with other meetings, it
// answers with status 409 and the list of clashes inside data.conflicts.
// This reads that list out of an axios error, or gives null when the error
// was something else (so the caller knows to show a normal error toast).
export function getMeetingConflicts(error: unknown): MeetingConflict[] | null {
  const response = (error as { response?: { status?: number; data?: any } })
    .response;

  if (response?.status === 409) {
    return (response.data?.data?.conflicts || []) as MeetingConflict[];
  }

  return null;
}

// What the "schedule / edit meeting" form sends to the server.
// ignoreConflicts is sent as true only when the user pressed "Schedule
// anyway" after seeing a time clash.
export interface MeetingValues {
  title: string;
  agenda?: string;
  startAt: string;
  durationMinutes: number;
  location?: string;
  meetingType: "in_person" | "online";
  attendees: string[];
  ignoreConflicts?: boolean;
}

// What the "reschedule" form sends.
export interface MeetingRescheduleValues {
  startAt: string;
  durationMinutes: number;
  note?: string;
  ignoreConflicts?: boolean;
}

// What the small "change status" form sends.
export interface MeetingStatusValues {
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  note?: string;
}

// What the invited employee's answer sends.
export interface MeetingRespondValues {
  response: "accepted" | "declined" | "attended";
  note?: string;
}

// What the "notes and action items" form sends.
export interface MeetingNotesValues {
  notes?: string;
  actionItems?: { text: string; done: boolean }[];
}

// One single meeting, for the screens that know an id but do not hold the
// list. A leave request that references a meeting opens it from here.
export async function getMeetingRequest(id: string) {
  const response = await axiosClient.get("/meetings/" + id);
  return response.data.data as Meeting;
}

export async function getMeetingsRequest() {
  const response = await axiosClient.get("/meetings");
  return response.data.data as Meeting[];
}

// The employees I am allowed to invite.
export async function getAssignableEmployeesRequest() {
  const response = await axiosClient.get("/meetings/assignable-employees");
  return response.data.data as AssignableEmployee[];
}

export async function createMeetingRequest(values: MeetingValues) {
  const response = await axiosClient.post("/meetings", values);
  return response.data;
}

export async function updateMeetingRequest(id: string, values: MeetingValues) {
  const response = await axiosClient.put("/meetings/" + id, values);
  return response.data;
}

export async function rescheduleMeetingRequest(
  id: string,
  values: MeetingRescheduleValues
) {
  const response = await axiosClient.patch(
    "/meetings/" + id + "/reschedule",
    values
  );
  return response.data;
}

export async function changeMeetingStatusRequest(
  id: string,
  values: MeetingStatusValues
) {
  const response = await axiosClient.patch("/meetings/" + id + "/status", values);
  return response.data;
}

export async function respondToMeetingRequest(
  id: string,
  values: MeetingRespondValues
) {
  const response = await axiosClient.patch(
    "/meetings/" + id + "/respond",
    values
  );
  return response.data;
}

export async function saveMeetingNotesRequest(
  id: string,
  values: MeetingNotesValues
) {
  const response = await axiosClient.patch("/meetings/" + id + "/notes", values);
  return response.data;
}

export async function deleteMeetingRequest(id: string) {
  const response = await axiosClient.delete("/meetings/" + id);
  return response.data;
}
