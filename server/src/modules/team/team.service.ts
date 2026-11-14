import * as repository from "./team.repository.js";
import type { ServiceActor } from "../../types/service.types.js";
import type { TeamInput, TeamIds, TeamMembersInput } from "./team.types.js";
import mongoose from "mongoose";
import { can } from "../../utils/currentUser.util.js";
import { findTeamOfMember } from "../../utils/team.util.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { notifyTeamMembership, notifyTeamLead, notifyTeamClosed } from "../../utils/notification.util.js";

// The ids of one list written as plain text, so two lists can be compared.
function asIdList(ids: unknown[]) {
  return ids.map((id) => String(id));
}

// What is in the second list and not in the first one. Called twice with the
// two lists the other way round, it answers both "who joined" and "who left"
// without a second function.
function whatIsNew(before: string[], after: string[]) {
  return after.filter((id) => !before.includes(id));
}

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// Every screen that shows a team wants the same names, so the list of
// fields is written down one time here.
// Check the people the form sent for ONE team.
//
// The answers are always { members, message }: message is empty when
// everything is fine, and members is the clean list we can save.
//
// The rules are:
// - a member must be an active employee of the SAME department as the team,
// - one employee is a member of only one team, so somebody who is already
//   in another team cannot be added here.
//
// ignoreTeamId is the team we are saving right now: its own members must
// not stop us from saving it again.
async function checkMembers(
  organizationId: string,
  departmentId: string,
  memberIds: string[],
  ignoreTeamId: string | null,
) {
  const members: mongoose.Types.ObjectId[] = [];
  for (const memberId of memberIds) {
    // A wrong id would crash the database call, so we look at it first.
    if (!mongoose.isValidObjectId(memberId)) {
      return { members: [], message: "One of the members is not valid" };
    }
    const employee = await repository.findEmployee(memberId, organizationId, departmentId);
    if (!employee) {
      return {
        members: [],
        message: "Every member must be an employee of the same department",
      };
    }
    if (employee.status === "inactive") {
      return {
        members: [],
        message: employee.name + " is inactive and cannot be in a team",
      };
    }
    const otherTeam = await findTeamOfMember(organizationId, String(employee._id), ignoreTeamId);
    if (otherTeam) {
      return {
        members: [],
        message: employee.name + " is already in the team \"" + otherTeam.name + "\"",
      };
    }
    members.push(employee._id);
  }
  return { members: members, message: "" };
}

// Read the department, the team lead and the members of the form, and check
// that all of them really belong to this organization.
//
// data is null when something is wrong, so the controller only has to send
// back that message.
async function readTeamForm(organizationId: string, body: TeamInput, ignoreTeamId: string | null) {
  if (!mongoose.isValidObjectId(body.departmentId)) {
    return { data: null, message: "Please choose a department" };
  }
  const department = await repository.findDepartment(body, organizationId);
  if (!department) {
    return {
      data: null,
      message: "Please choose a department of your organization",
    };
  }
  if (!mongoose.isValidObjectId(body.teamLeadId)) {
    return { data: null, message: "Please choose a team lead" };
  }
  // The lead has to work in the same department as the team, otherwise
  // they would be leading people they do not work with.
  const teamLead = await repository.findTeamLead(body, organizationId, department);
  if (!teamLead) {
    return {
      data: null,
      message: "The team lead must be an employee of that department",
    };
  }
  if (teamLead.status === "inactive") {
    return { data: null, message: "The team lead is inactive" };
  }
  // The lead is never a member of its own team, so if the form sent them
  // in both places we simply drop them from the member list.
  const sentIds: string[] = body.memberIds || [];
  const memberIds = sentIds.filter((memberId) => String(memberId) !== String(teamLead._id));
  const checked = await checkMembers(organizationId, String(department._id), memberIds, ignoreTeamId);
  if (checked.message) {
    return { data: null, message: checked.message };
  }
  return {
    data: {
      department: department,
      teamLead: teamLead,
      members: checked.members,
    },
    message: "",
  };
}

// How many tasks each employee still has open, for the whole organization.
//
// We ask it in ONE question instead of one question per person: aggregate
// groups the tasks by employee and counts each group. The "my team" page
// uses it to show the load of every member next to their name.
async function countOpenTasksByEmployee(organizationId: string) {
  const rows = await repository.readOpenTaskCounts(organizationId);
  return function countFor(employeeId: string) {
    const row = rows.find((item) => String(item._id) === employeeId);
    return row ? row.count : 0;
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// POST /api/teams
// The organization creates a team inside one of its own departments.
export async function createTeam(actor: ServiceActor, input: TeamInput) {
  // We always take the organization id from the login token, never from
  // the request body, so one organization can never touch another one.
  const organizationId = String(actor.user?.organizationId);
  const form = await readTeamForm(organizationId, input, null);
  if (!form.data) {
    return {
      status: "invalid",
      message: form.message,
    };
  }
  // The same team name cannot be used twice inside one department.
  const existingTeam = await repository.findExistingTeam(organizationId, form.data, input);
  if (existingTeam) {
    return {
      status: "invalid",
      message: "This department already has a team with that name",
    };
  }
  const team = await repository.insertTeam(input, organizationId, form.data);
  // The workspace hears "a new team was added" from the middleware. These
  // are the lines the middleware cannot write, because only the controller
  // knows WHO ended up inside the team.
  const me = actor.employee;
  await notifyTeamLead({
    organizationId: organizationId,
    teamName: team.name,
    employeeId: String(team.teamLead),
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  await notifyTeamMembership({
    organizationId: organizationId,
    teamName: team.name,
    addedEmployeeIds: asIdList(team.members),
    removedEmployeeIds: [],
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Team created successfully",
    data: team,
  };
}

// GET /api/teams
// Every team of the logged in organization, newest first.
export async function getAllTeams(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const teams = await repository.findTeams(organizationId);
  return {
    status: "success",
    data: teams,
  };
}

// GET /api/teams/my-teams
// The teams the logged in employee is part of: the ones they lead, and the
// one they are a member of. isTeamLead says which of the two it is, so the
// page knows whether to show the "manage" buttons.
export async function getMyTeams(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an employee has a team",
    };
  }
  // lean() gives plain objects, so we can add the extra fields below.
  const teams = await repository.findEmployeeTeams(organizationId, me);
  const countOpenTasks = await countOpenTasksByEmployee(organizationId);
  const teamsWithFlags = teams.map((team) => ({
    ...team,
    // Every member carries how many tasks they still have open, so the
    // lead sees at a glance who is busy and who is free.
    members: (team.members || []).map((member) => ({
      ...member,
      openTaskCount: countOpenTasks(String(member._id)),
    })),
    isTeamLead: String(team.teamLead?._id) === String(me.employee._id),
  }));
  return {
    status: "success",
    data: teamsWithFlags,
  };
}

// GET /api/teams/:id/candidates
// The people the "members" list of ONE team can be filled with: the active
// employees of that team's department who are not already in another team,
// and who are not the lead of this team.
//
// A team lead is not allowed to read the whole employee list of the
// organization, so this small answer is what fills their picker.
export async function getTeamCandidates(actor: ServiceActor, ids: TeamIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const team = await repository.findTeam(ids, organizationId);
  if (!team) {
    return {
      status: "not_found",
      message: "Team not found",
    };
  }
  // Same rule as changing the members: whoever may edit the teams of the
  // organization, or the lead of this very team.
  if (me &&
    String(team.teamLead) !== String(me.employee._id) &&
    !can(me, PERMISSIONS.TEAMS_EDIT)) {
    return {
      status: "forbidden",
      message: "You can see only the people of your own team",
    };
  }
  const employees = await repository.findEmployees(organizationId, team);
  // Keep the ones who are free, plus the ones who are already in THIS
  // team (otherwise the picker would lose the people it has to show as
  // already chosen).
  const candidates = [];
  for (const employee of employees) {
    const isAlreadyHere = team.members.some((member) => String(member) === String(employee._id));
    if (isAlreadyHere) {
      candidates.push(employee);
      continue;
    }
    const otherTeam = await findTeamOfMember(organizationId, String(employee._id), String(team._id));
    if (!otherTeam) {
      candidates.push(employee);
    }
  }
  return {
    status: "success",
    data: candidates,
  };
}

// PUT /api/teams/:id
// Only the organization edits the team itself (name, department, lead).
export async function updateTeam(actor: ServiceActor, input: TeamInput, ids: TeamIds) {
  const organizationId = String(actor.user?.organizationId);
  // The organization id is part of the search, so an organization cannot
  // edit a team of another organization.
  const team = await repository.findTeam(ids, organizationId);
  if (!team) {
    return {
      status: "not_found",
      message: "Team not found",
    };
  }
  const form = await readTeamForm(organizationId, input, String(team._id));
  if (!form.data) {
    return {
      status: "invalid",
      message: form.message,
    };
  }
  // Another team of the same department must not have the same name.
  const teamWithSameName = await repository.findTeamWithSameName(organizationId, form.data, input, team);
  if (teamWithSameName) {
    return {
      status: "invalid",
      message: "This department already has a team with that name",
    };
  }
  // Who was in the team before this form was sent. It has to be read now,
  // because four lines below the team already holds the new list.
  const membersBefore = asIdList(team.members);
  const leadBefore = String(team.teamLead);
  team.name = input.name;
  team.description = input.description || "";
  team.department = form.data.department._id;
  team.teamLead = form.data.teamLead._id;
  team.members = form.data.members;
  team.status = input.status;
  await repository.saveTeam(team);
  const membersAfter = asIdList(team.members);
  const me = actor.employee;
  const byName = me ? me.employee.name : "";
  const actorUserId = String(actor.user?.userId);
  await notifyTeamMembership({
    organizationId: organizationId,
    teamName: team.name,
    addedEmployeeIds: whatIsNew(membersBefore, membersAfter),
    removedEmployeeIds: whatIsNew(membersAfter, membersBefore),
    byName: byName,
    actorUserId: actorUserId,
  });
  // The edit form can also hand the team to another lead, and that is work
  // arriving on somebody's desk: a lead answers the leave requests of their
  // people and is asked for a recommendation.
  if (leadBefore !== String(team.teamLead)) {
    await notifyTeamLead({
      organizationId: organizationId,
      teamName: team.name,
      employeeId: String(team.teamLead),
      byName: byName,
      actorUserId: actorUserId,
    });
  }
  return {
    status: "success",
    message: "Team updated successfully",
    data: team,
  };
}

// PATCH /api/teams/:id/members
// Change only who is in the team. The organization can do it for any team,
// and a team lead can do it for the team they lead: that is what "a team
// lead manages their own people" means here.
export async function updateTeamMembers(actor: ServiceActor, input: TeamMembersInput, ids: TeamIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const team = await repository.findTeam(ids, organizationId);
  if (!team) {
    return {
      status: "not_found",
      message: "Team not found",
    };
  }
  // me === null is the organization account, and it may do everything.
  if (me) {
    const iAmTheLead = String(team.teamLead) === String(me.employee._id);
    // Two people may change this list: the lead of this team, and somebody
    // whose role carries "teams.edit" for the whole organization.
    if (!iAmTheLead && !can(me, PERMISSIONS.TEAMS_EDIT)) {
      return {
        status: "forbidden",
        message: "You can change only the members of your own team",
      };
    }
    if (team.status === "inactive") {
      return {
        status: "invalid",
        message: "This team is inactive, ask your organization first",
      };
    }
  }
  // The lead is never a member of its own team.
  const sentIds: string[] = input.memberIds || [];
  const memberIds = sentIds.filter((memberId) => String(memberId) !== String(team.teamLead));
  const checked = await checkMembers(organizationId, String(team.department), memberIds, String(team._id));
  if (checked.message) {
    return {
      status: "invalid",
      message: checked.message,
    };
  }
  const membersBefore = asIdList(team.members);
  team.members = checked.members;
  await repository.saveTeam(team);
  const membersAfter = asIdList(team.members);
  // This route is the one a team lead uses, and it is the whole point of the
  // feature the two lines below serve: somebody is now in a team, or is not
  // any more, and they hear it the same second.
  await notifyTeamMembership({
    organizationId: organizationId,
    teamName: team.name,
    addedEmployeeIds: whatIsNew(membersBefore, membersAfter),
    removedEmployeeIds: whatIsNew(membersAfter, membersBefore),
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Team members updated",
    data: team,
  };
}

// DELETE /api/teams/:id
export async function deleteTeam(actor: ServiceActor, ids: TeamIds) {
  const organizationId = String(actor.user?.organizationId);
  const team = await repository.findTeam(ids, organizationId);
  if (!team) {
    return {
      status: "not_found",
      message: "Team not found",
    };
  }
  // Deleting a team never deletes the employees: they simply stop being
  // in a team, and the tasks the lead already gave them stay where they
  // are. So there is nothing to clean up here.
  // Read before the team is gone: afterwards there is nobody left to tell.
  // The lead is told together with the members, because losing the team is
  // the same news for both.
  const everybody = asIdList(team.members).concat(String(team.teamLead));
  const teamName = team.name;
  await repository.removeTeam(team);
  const me = actor.employee;
  await notifyTeamClosed({
    organizationId: organizationId,
    teamName: teamName,
    memberEmployeeIds: everybody,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Team deleted successfully",
  };
}
