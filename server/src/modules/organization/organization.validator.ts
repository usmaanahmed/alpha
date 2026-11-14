import { z } from "zod";

// Rules for the "create organization" form data.
export const createOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Rules for the "update organization" form data.
// Here password is not required, because we may only change the name or phone.
export const updateOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

// Rules for changing an organization password.
export const changeOrganizationPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Rules for the switch board of the SaaS owner.
//
// Both lists are the keys that are switched OFF, and both may be empty:
// that simply means "this organization has everything". Whether a key is a
// real module or a real feature is checked in the controller against
// config/modules.ts, because only that file knows what exists.
export const organizationModulesSchema = z.object({
  disabledModules: z.array(z.string()).default([]),
  disabledFeatures: z.array(z.string()).default([]),
});
