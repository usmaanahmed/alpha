import { z } from "zod";

// Rules for the "create role" and "edit role" forms.
//
// permissions is the array of ticked checkboxes, for example
// ["employees.view", "tasks.assign"]. Here we only check that it is a list of
// texts; the service then throws away everything that is not a real
// permission of this app.
export const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional().default([]),
  status: z.enum(["active", "inactive"]),
});
