import { z } from "zod";

// The routes use this schema to check both create and update requests.
// Invalid fields are rejected before they reach the controller.
export const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  // The description can be left out. It is stored as empty text in that case.
  description: z.string().optional(),
  // Only these two status values are accepted.
  status: z.enum(["active", "inactive"]),
});
