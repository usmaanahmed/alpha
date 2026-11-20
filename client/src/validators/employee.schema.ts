import { z } from "zod";

// Rules for the "add employee" form.
// The password is the one this employee will use to login.
//
// The HR fields at the bottom are all optional, because an organization
// may want to add somebody quickly and fill the rest later. The picture is
// a real File object that comes from the <input type="file">, or null when
// no picture was chosen.
export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Employee name must be at least 2 characters"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  departmentId: z.string().min(1, "Please choose a department"),
  roleId: z.string().min(1, "Please choose a role"),
  status: z.enum(["active", "inactive"]),

  // --- HR profile ---
  designation: z.string().optional(),
  qualification: z.string().optional(),
  employmentType: z.enum(["full_time", "part_time", "intern", "contract"]),
  joiningDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", ""]),
  address: z.string().optional(),
  exitDate: z.string().optional(),
  exitReason: z.string().optional(),
  photo: z.instanceof(File).nullable().optional(),
});

// Rules for the "edit employee" form. They are the same rules, only the
// password is not asked any more, because it has its own small form.
// extend() means "take the schema above and change this one field".
export const updateEmployeeSchema = createEmployeeSchema.extend({
  password: z.string(),
});

export type EmployeeFormValues = z.infer<typeof createEmployeeSchema>;

// Rules for the "change password" form of one employee.
export const employeePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type EmployeePasswordFormValues = z.infer<typeof employeePasswordSchema>;
