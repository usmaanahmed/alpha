import type { TeamFormData, TeamMember, TeamInput, TeamIds } from "./team.types.js";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import mongoose from "mongoose";
import { Team } from "./team.model.js";
import { Department } from "../department/department.model.js";
import { Employee } from "../employee/employee.model.js";
import { Task } from "../task/task.model.js";
import type { DepartmentDocument } from "../department/department.model.js";
import type { TeamDocument } from "./team.model.js";

export async function findEmployee(memberId: string, organizationId: string, departmentId: string) {
  return Employee.findOne({
    _id: memberId,
    organization: organizationId,
    department: departmentId,
  });
}

export async function findDepartment(body: TeamInput, organizationId: string) {
  return Department.findOne({
    _id: body.departmentId,
    organization: organizationId,
  });
}

export async function findTeamLead(body: TeamInput, organizationId: string, department: DepartmentDocument) {
  return Employee.findOne({
    _id: body.teamLeadId,
    organization: organizationId,
    department: department._id,
  });
}

export async function readOpenTaskCounts(organizationId: string) {
  return Task.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        status: { $nin: ["completed", "cancelled"] },
      },
    },
    { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
  ]);
}

export async function findExistingTeam(organizationId: string, form: TeamFormData, input: TeamInput) {
  return Team.findOne({
    organization: organizationId,
    department: form.department._id,
    name: input.name,
  });
}

export async function insertTeam(input: TeamInput, organizationId: string, form: TeamFormData) {
  return Team.create({
    name: input.name,
    description: input.description || "",
    organization: organizationId,
    department: form.department._id,
    teamLead: form.teamLead._id,
    members: form.members,
    status: input.status,
  });
}

export async function findTeams(organizationId: string) {
  return (Team.find({ organization: organizationId }))
    .populate("department", "name")
    .populate<{ teamLead: TeamMember | null }>("teamLead", "name email photo designation status")
    .populate<{ members: TeamMember[] }>("members", "name email photo designation status").sort({ createdAt: -1 });
}

export async function findEmployeeTeams(organizationId: string, me: LoggedInEmployee) {
  return (Team.find({
    organization: organizationId,
    status: "active",
    $or: [{ teamLead: me.employee._id }, { members: me.employee._id }],
  }))
    .populate("department", "name")
    .populate<{ teamLead: TeamMember | null }>("teamLead", "name email photo designation status")
    .populate<{ members: TeamMember[] }>("members", "name email photo designation status")
    .sort({ name: 1 })
    .lean();
}

export async function findTeam(ids: TeamIds, organizationId: string) {
  return Team.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function findEmployees(organizationId: string, team: TeamDocument) {
  return Employee.find({
    organization: organizationId,
    department: team.department,
    status: "active",
    _id: { $ne: team.teamLead },
  })
    .select("name email photo designation")
    .sort({ name: 1 })
    .lean();
}

export async function findTeamWithSameName(
  organizationId: string,
  form: TeamFormData,
  input: TeamInput,
  team: TeamDocument,
) {
  return Team.findOne({
    organization: organizationId,
    department: form.department._id,
    name: input.name,
    _id: { $ne: team._id },
  });
}

export async function saveTeam(team: TeamDocument) {
  return team.save();
}

export async function removeTeam(team: TeamDocument) {
  return Team.deleteOne({ _id: team._id });
}
