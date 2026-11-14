import { z } from "zod";
import { checkbox } from "../../validators/checkbox.js";

// The same form rules apply to creating and updating a holiday.
// The date arrives as text, such as "2026-07-30". The service checks
// that it can be read as a date, then converts it to midnight UTC.
export const holidaySchema = z.object({
  name: z.string().min(2, "Holiday name must be at least 2 characters"),
  date: z.string().min(1, "Please choose the date of the holiday"),
  // The shared checkbox schema converts form values into true or false.
  isOptional: checkbox,
  // A missing description is saved as empty text.
  description: z.string().optional(),
});
