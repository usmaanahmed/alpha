import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTeamsRequest,
  getMyTeamsRequest,
  getTeamCandidatesRequest,
  createTeamRequest,
  updateTeamRequest,
  updateTeamMembersRequest,
  deleteTeamRequest,
} from "@/api/team.api";
import type { TeamValues } from "@/api/team.api";
import { getErrorMessage } from "@/api/axiosClient";

// All teams of my organization.
//
// enabled is there for the pages that read this list only when the person
// looking at them carries "teams.view". Left alone it is true.
export function useTeams(enabled = true) {
  return useQuery({
    queryKey: ["teams"],
    queryFn: getTeamsRequest,
    enabled: enabled,
  });
}

// The teams the logged in employee is part of.
export function useMyTeams() {
  return useQuery({
    queryKey: ["my-teams"],
    queryFn: getMyTeamsRequest,
  });
}

// The people the members list of one team can still take.
// enabled: false stops the request while the dialog is closed.
export function useTeamCandidates(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["team-candidates", id],
    queryFn: () => getTeamCandidatesRequest(id),
    enabled: enabled,
  });
}

// The two lists always change together: a new team appears on the
// organization page AND on the "my team" page of its lead. So every
// mutation reloads both.
function reloadTeams(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["teams"] });
  queryClient.invalidateQueries({ queryKey: ["my-teams"] });
  queryClient.invalidateQueries({ queryKey: ["team-candidates"] });
  // Being in a team decides who I can give a task to, so that dropdown
  // has to be read again too.
  queryClient.invalidateQueries({ queryKey: ["assignable-employees"] });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TeamValues) => createTeamRequest(values),
    onSuccess: () => {
      reloadTeams(queryClient);
      toast.success("Team created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: TeamValues }) =>
      updateTeamRequest(input.id, input.values),
    onSuccess: () => {
      reloadTeams(queryClient);
      toast.success("Team updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Change only who is in the team.
export function useUpdateTeamMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; memberIds: string[] }) =>
      updateTeamMembersRequest(input.id, input.memberIds),
    onSuccess: () => {
      reloadTeams(queryClient);
      toast.success("Team members updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTeamRequest(id),
    onSuccess: () => {
      reloadTeams(queryClient);
      toast.success("Team deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
