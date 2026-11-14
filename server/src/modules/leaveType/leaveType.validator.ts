import { z } from "zod";
import { checkbox } from "../../validators/checkbox.js";
import {
  ALL_LEAVE_FILE_KINDS,
  DEFAULT_LEAVE_FILE_KINDS,
  DEFAULT_LEAVE_FILE_SIZE_MB,
  DEFAULT_LEAVE_FILE_COUNT,
  MAX_LEAVE_FILE_SIZE_MB,
  MAX_LEAVE_FILE_COUNT,
} from "../../config/leaveDocuments.js";

// Rules for the "add leave type" and "edit leave type" forms.
export const leaveTypeSchema = z.object({
  name: z.string().min(2, "Leave type name must be at least 2 characters"),
  // coerce turns the text "12" that comes from the number input into 12.
  daysPerYear: z.coerce
    .number()
    .min(0, "Days per year cannot be negative")
    .max(365, "Days per year cannot be more than 365"),
  isPaid: checkbox,
  // ON means "a public holiday inside this leave is not counted".
  excludeHolidays: checkbox,
  // Missing document settings get the defaults below.
  // Documents are only used when allowDocuments is true.
  allowDocuments: checkbox,
  documentRequirement: z.enum(["optional", "required"]).default("optional"),
  allowedFileKinds: z
    .array(z.enum(ALL_LEAVE_FILE_KINDS))
    .default(DEFAULT_LEAVE_FILE_KINDS),
  maxFileSizeMb: z.coerce
    .number()
    .min(1, "One file must be allowed to be at least 1 MB")
    .max(
      MAX_LEAVE_FILE_SIZE_MB,
      "One file cannot be bigger than " + MAX_LEAVE_FILE_SIZE_MB + " MB"
    )
    .default(DEFAULT_LEAVE_FILE_SIZE_MB),
  maxFiles: z.coerce
    .number()
    .min(1, "At least one document must be allowed")
    .max(
      MAX_LEAVE_FILE_COUNT,
      "At most " + MAX_LEAVE_FILE_COUNT + " documents can be allowed"
    )
    .default(DEFAULT_LEAVE_FILE_COUNT),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

