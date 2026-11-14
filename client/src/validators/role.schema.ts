import { z } from "zod";

// Rules for the role form (used for both add and edit).
// permissions is the array of the ticked checkboxes; an empty array is fine,
// because a plain "Employee" role needs no permission at all.
export const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()),
  status: z.enum(["active", "inactive"]),
});

export type RoleFormValues = z.infer<typeof roleSchema>;
