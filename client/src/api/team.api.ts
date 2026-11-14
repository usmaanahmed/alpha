import { axiosClient } from "./axiosClient";
import type { Team, MyTeam, TeamCandidate } from "@/types/team.types";

// What the "create team" and "edit team" form sends to the server.
export interface TeamValues {
  name: string;
  description?: string;
  departmentId: string;
  teamLeadId: string;
  memberIds: string[];
  status: "active" | "inactive";
}

// All teams of the logged in organization.
export async function getTeamsRequest() {
  const response = await axiosClient.get("/teams");
  return response.data.data as Team[];
}

// The teams the logged in employee is part of: the ones they lead and the
// one they are a member of.
export async function getMyTeamsRequest() {
  const response = await axiosClient.get("/teams/my-teams");
  return response.data.data as MyTeam[];
}

// The employees this team can still take as members: the active people of
// its department who are not already in another team.
export async function getTeamCandidatesRequest(id: string) {
  const response = await axiosClient.get("/teams/" + id + "/candidates");
  return response.data.data as TeamCandidate[];
}

export async function createTeamRequest(values: TeamValues) {
  const response = await axiosClient.post("/teams", values);
  return response.data;
}

export async function updateTeamRequest(id: string, values: TeamValues) {
  const response = await axiosClient.put("/teams/" + id, values);
  return response.data;
}

// Change only who is in the team. The organization and the team lead of
// that team both use this one.
export async function updateTeamMembersRequest(id: string, memberIds: string[]) {
  const response = await axiosClient.patch("/teams/" + id + "/members", {
    memberIds: memberIds,
  });
  return response.data;
}

export async function deleteTeamRequest(id: string) {
  const response = await axiosClient.delete("/teams/" + id);
  return response.data;
}
