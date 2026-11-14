import { z } from "zod";

// Rules for the "create salary" and "edit salary" forms.
//
// The amounts come from number inputs, so coerce turns the text "45000" into
// the number 45000 before the rules below look at it.

// One allowance row of the form.
const allowanceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please write the allowance name")
    .max(60, "The allowance name is too long"),
  amount: z.coerce
    .number()
    .min(0, "An allowance amount cannot be negative")
    .max(1000000000, "The allowance amount looks too big"),
  description: z
    .string()
    .trim()
    .max(300, "The allowance description is too long")
    .optional(),
});

export const salarySchema = z
  .object({
    employeeId: z.string().min(1, "Please choose an employee"),
    salaryType: z.enum(["monthly", "daily", "hourly"]),
    basicSalary: z.coerce
      .number()
      .min(0, "The basic salary cannot be negative")
      .max(1000000000, "The basic salary looks too big"),
    grossSalary: z.coerce
      .number()
      .min(0, "The gross salary cannot be negative")
      .max(1000000000, "The gross salary looks too big"),
    netSalary: z.coerce
      .number()
      .min(0, "The net salary cannot be negative")
      .max(1000000000, "The net salary looks too big"),
    // Allowances are optional: a salary can be only a basic salary.
    allowances: z
      .array(allowanceSchema)
      .max(30, "That is too many allowances for one salary")
      .optional(),
  })
  // Two allowances of the same salary cannot carry the same name. We compare
  // them in lower case and without the spaces around them, so "Fuel" and
  // " fuel " are caught as the same one.
  //
  // superRefine is the zod way of writing a rule that needs to look at the
  // WHOLE form at once instead of at a single field. The path we give tells
  // the browser which row to paint red.
  .superRefine((values, ctx) => {
    const seenNames: string[] = [];
    const allowances = values.allowances || [];

    for (let index = 0; index < allowances.length; index++) {
      const allowance = allowances[index];
      const name = allowance.name.trim().toLowerCase();

      if (seenNames.includes(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["allowances", index, "name"],
          message: "This allowance is already in the list",
        });
      }

      seenNames.push(name);
    }
  });
