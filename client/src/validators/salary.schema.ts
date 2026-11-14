import { z } from "zod";

// The rules for the "create / edit salary" form. They match the rules on the
// server, so the same message is shown whether the check runs in the browser
// or on the server.
//
// The amounts come from number inputs registered with valueAsNumber, so they
// arrive here as real numbers already. An empty box gives NaN, which is not a
// number for zod, and that is why each one carries its own "please write it"
// message.

// One allowance row.
export const allowanceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please write the allowance name")
    .max(60, "The allowance name is too long"),
  amount: z
    .number({ error: "Please write the allowance amount" })
    .min(0, "An allowance amount cannot be negative")
    .max(1000000000, "The allowance amount looks too big"),
  description: z
    .string()
    .trim()
    .max(300, "The allowance description is too long"),
});

export const salarySchema = z
  .object({
    employeeId: z.string().min(1, "Please choose an employee"),
    salaryType: z.enum(["monthly", "daily", "hourly"]),
    basicSalary: z
      .number({ error: "Please write the basic salary" })
      .min(0, "The basic salary cannot be negative")
      .max(1000000000, "The basic salary looks too big"),
    grossSalary: z
      .number({ error: "Please write the gross salary" })
      .min(0, "The gross salary cannot be negative")
      .max(1000000000, "The gross salary looks too big"),
    netSalary: z
      .number({ error: "Please write the net salary" })
      .min(0, "The net salary cannot be negative")
      .max(1000000000, "The net salary looks too big"),
    // Allowances are optional: a salary can be only a basic salary.
    allowances: z
      .array(allowanceSchema)
      .max(30, "That is too many allowances for one salary"),
  })
  // Two allowances of the same salary cannot carry the same name. We compare
  // them in lower case and without the spaces around them, so "Fuel" and
  // " fuel " are caught as the same one.
  //
  // The path we give points at the name box of that very row, so the message
  // is painted under the row that is wrong and not at the top of the form.
  .superRefine((values, ctx) => {
    const seenNames: string[] = [];

    values.allowances.forEach((allowance, index) => {
      const name = allowance.name.trim().toLowerCase();

      if (seenNames.includes(name)) {
        ctx.addIssue({
          code: "custom",
          path: ["allowances", index, "name"],
          message: "This allowance is already in the list",
        });
      }

      seenNames.push(name);
    });
  });

export type SalaryFormValues = z.infer<typeof salarySchema>;
