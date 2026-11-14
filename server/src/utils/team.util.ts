import { Team } from "../modules/team/team.model.js";

// Everything about "who is a team lead and who is under them" is decided
// here, so if you ever want to change the rule you only change this file.
//
// Being a team lead is NOT a permission and never will be: the organization
// does not tick it on a role, it chooses one employee as the head of one
// team. That is why the answer comes from the team list in the database and
// not from config/permissions.ts.
//
// Only an ACTIVE team gives its lead any power. When the organization makes
// a team inactive, the lead keeps the row but loses the buttons, exactly
// like an inactive department disappears from the employee form.

// The teams this employee is the lead of.
export async function getTeamsILead(organizationId: string, employeeId: string) {
  return Team.find({
    organization: organizationId,
    teamLead: employeeId,
    status: "active",
  });
}

// Is this employee the lead of at least one team?
// The login profile and the task module both ask this question.
export async function isTeamLeadEmployee(
  organizationId: string,
  employeeId: string
) {
  const team = await Team.findOne({
    organization: organizationId,
    teamLead: employeeId,
    status: "active",
  }).select("_id");

  return team !== null;
}

// Is this employee inside a team at all: as its lead, or as one of its
// members? The sidebar uses it to decide if the "My Team" link is shown.
export async function isInAnyTeam(organizationId: string, employeeId: string) {
  const team = await Team.findOne({
    organization: organizationId,
    status: "active",
    $or: [{ teamLead: employeeId }, { members: employeeId }],
  }).select("_id");

  return team !== null;
}

// The ids of everybody who is under this lead, from every team they lead.
// The same person is never written twice, and the lead itself is never in
// the list because a lead is not a member of its own team.
export async function getMyTeamMemberIds(
  organizationId: string,
  employeeId: string
) {
  const teams = await getTeamsILead(organizationId, employeeId);

  const memberIds: string[] = [];

  teams.forEach((team) => {
    team.members.forEach((member) => {
      const memberId = String(member);

      if (!memberIds.includes(memberId)) {
        memberIds.push(memberId);
      }
    });
  });

  return memberIds;
}

// Is that employee one of my team members? This is the single question the
// task module asks before letting a team lead give work to somebody.
export async function isInMyTeam(
  organizationId: string,
  leadId: string,
  employeeId: string
) {
  const team = await Team.findOne({
    organization: organizationId,
    teamLead: leadId,
    members: employeeId,
    status: "active",
  }).select("_id");

  return team !== null;
}

// One employee is a member of only one team, so before we put somebody in
// a team we look if another team already has them.
//
// ignoreTeamId is the team we are editing right now: its own members must
// not stop us from saving it again.
export async function findTeamOfMember(
  organizationId: string,
  employeeId: string,
  ignoreTeamId: string | null
) {
  const filter: Record<string, unknown> = {
    organization: organizationId,
    members: employeeId,
  };

  if (ignoreTeamId) {
    filter._id = { $ne: ignoreTeamId };
  }

  return Team.findOne(filter);
}
