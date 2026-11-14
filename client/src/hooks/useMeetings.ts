import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMeetingsRequest,
  getMeetingRequest,
  getAssignableEmployeesRequest,
  createMeetingRequest,
  updateMeetingRequest,
  rescheduleMeetingRequest,
  changeMeetingStatusRequest,
  respondToMeetingRequest,
  saveMeetingNotesRequest,
  deleteMeetingRequest,
  getMeetingConflicts,
} from "@/api/meeting.api";
import type {
  MeetingValues,
  MeetingRescheduleValues,
  MeetingStatusValues,
  MeetingRespondValues,
  MeetingNotesValues,
} from "@/api/meeting.api";
import { getErrorMessage } from "@/api/axiosClient";

// The whole meeting list. The dashboard, the "upcoming" panel, the calendar
// and the table all read from this one query, so they never disagree.
export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: getMeetingsRequest,
  });
}

// ONE meeting, read on its own instead of picked out of a list.
//
// id is null when nothing is open, and then the query does not run at all.
// The leave module needs this: an approver may reference a meeting on a leave
// request, and neither of the two people looking at it afterwards is
// necessarily invited to it, so it is in no list they can read.
export function useMeeting(id: string | null) {
  return useQuery({
    queryKey: ["meeting", id],
    queryFn: () => getMeetingRequest(String(id)),
    enabled: id !== null,
  });
}

// The people I can invite. Only the organization and a manager can ask for
// this list, so the employee pages never call it.
export function useAssignableMeetingEmployees(enabled: boolean) {
  return useQuery({
    queryKey: ["meeting-assignable-employees"],
    queryFn: getAssignableEmployeesRequest,
    enabled: enabled,
  });
}

// A time clash is an ordinary part of scheduling, not a real error, so for
// the create / edit / reschedule mutations we only show the red error toast
// when it was NOT a clash. The clash is shown inside the form instead.
function toastIfNotConflict(error: unknown) {
  if (getMeetingConflicts(error) === null) {
    toast.error(getErrorMessage(error));
  }
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: MeetingValues) => createMeetingRequest(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting scheduled");
    },
    onError: toastIfNotConflict,
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: MeetingValues }) =>
      updateMeetingRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting updated");
    },
    onError: toastIfNotConflict,
  });
}

export function useRescheduleMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: MeetingRescheduleValues }) =>
      rescheduleMeetingRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting rescheduled");
    },
    onError: toastIfNotConflict,
  });
}

export function useChangeMeetingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: MeetingStatusValues }) =>
      changeMeetingStatusRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting status updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useRespondToMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: MeetingRespondValues }) =>
      respondToMeetingRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Your answer was saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useSaveMeetingNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: MeetingNotesValues }) =>
      saveMeetingNotesRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting notes saved");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMeetingRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
