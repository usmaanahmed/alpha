import { z } from "zod";

// A MongoDB id is always 24 characters like "6650f1c2a4f1b2c3d4e5f6a7".
const objectId = /^[0-9a-fA-F]{24}$/;

// The HR fields that both the "add" and the "edit" form share.
//
// These forms are now sent as multipart, because they can carry the
// employee picture. In a multipart form every value arrives as text, and a
// field the user left empty arrives as the empty text "". That is why the
// optional ids below also accept "".
const hrProfileFields = {
  designation: z.string().optional(),
  qualification: z.string().optional(),
  employmentType: z.enum(["full_time", "part_time", "intern", "contract"]),
  // The dates come from an <input type="date"> as the text "2026-07-30".
  joiningDate: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", ""]).optional(),
  address: z.string().optional(),
  exitDate: z.string().optional(),
  exitReason: z.string().optional(),
};

// Rules for the "add employee" form.
// departmentId and roleId are MongoDB ids that come from the two dropdowns.
// The password is the one this employee will use to login.
export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Employee name must be at least 2 characters"),
  email: z.email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  departmentId: z.string().regex(objectId, "Please choose a department"),
  roleId: z.string().regex(objectId, "Please choose a role"),
  status: z.enum(["active", "inactive"]),
  ...hrProfileFields,
});

// Rules for the "edit employee" form.
// Here we do not ask the password, it has its own small form.
export const updateEmployeeSchema = z.object({
  name: z.string().min(2, "Employee name must be at least 2 characters"),
  email: z.email("Please enter a valid email"),
  phone: z.string().optional(),
  departmentId: z.string().regex(objectId, "Please choose a department"),
  roleId: z.string().regex(objectId, "Please choose a role"),
  status: z.enum(["active", "inactive"]),
  ...hrProfileFields,
});

// Rules for changing the login password of one employee.
export const changeEmployeePasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Rules for the bulk actions of the employee table.
// At most 200 ids at one time, so one request never runs for minutes.
const employeeIdList = z
  .array(z.string().regex(objectId, "One of the employee ids is not valid"))
  .min(1, "Please select at least one employee")
  .max(200, "You can select at most 200 employees at one time");

export const bulkDeleteEmployeesSchema = z.object({
  ids: employeeIdList,
});

export const bulkStatusEmployeesSchema = z.object({
  ids: employeeIdList,
  status: z.enum(["active", "inactive"]),
});
