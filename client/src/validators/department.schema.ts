import { z } from "zod";

// Rules for the department form (used for both add and edit).
export const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
