import { z } from "zod";

// Rules for the login form.
export const loginSchema = z.object({
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// The type of the login form values, made from the schema above.
export type LoginFormValues = z.infer<typeof loginSchema>;
