import { z } from "zod";

// Rules for the "create organization" form.
export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type CreateOrganizationFormValues = z.infer<typeof createOrganizationSchema>;

// Rules for the "edit organization" form.
export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

export type UpdateOrganizationFormValues = z.infer<typeof updateOrganizationSchema>;

// Rules for the "change password" form.
export const changePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
