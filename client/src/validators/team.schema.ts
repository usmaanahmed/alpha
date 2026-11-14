import { z } from "zod";

// Rules for the team form (used for both add and edit).
//
// memberIds may stay empty: a team can be created first and filled with
// people later, from the same form or from the "manage members" dialog.
export const teamSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters"),
  description: z.string().optional(),
  departmentId: z.string().min(1, "Please choose a department"),
  teamLeadId: z.string().min(1, "Please choose a team lead"),
  memberIds: z.array(z.string()),
  status: z.enum(["active", "inactive"]),
});

export type TeamFormValues = z.infer<typeof teamSchema>;
