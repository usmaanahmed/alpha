import { z } from "zod";

// Rules for the "create team" and "edit team" forms.
//
// memberIds is a list of employee ids. It may be empty: a team can be
// created first and filled with people later.
export const teamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  description: z.string().optional(),
  departmentId: z.string().min(1, "Please choose a department"),
  teamLeadId: z.string().min(1, "Please choose a team lead"),
  memberIds: z.array(z.string()).optional(),
  status: z.enum(["active", "inactive"]),
});

// The small form that only changes who is in the team. The organization
// and the team lead of that team both use it.
export const teamMembersSchema = z.object({
  memberIds: z.array(z.string()),
});
