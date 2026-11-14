import { z } from "zod";

// A MongoDB id is always 24 characters like "6650f1c2a4f1b2c3d4e5f6a7".
const objectId = /^[0-9a-fA-F]{24}$/;

// Rules for the form the HR uses to fix one day by hand, for example to
// mark somebody absent or to write the times of a day that was forgotten.
//
// checkIn and checkOut are the texts "09:30" and "18:00" that come from an
// <input type="time">. They may be empty, for example on an absent day.
export const markAttendanceSchema = z.object({
  employee: z.string().regex(objectId, "Please choose an employee"),
  date: z.string().min(1, "Please choose the date"),
  status: z.enum(["present", "absent", "half_day", "on_leave", "holiday"]),
  checkIn: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Check in time must look like 09:30")
    .optional()
    .or(z.literal("")),
  checkOut: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Check out time must look like 18:00")
    .optional()
    .or(z.literal("")),
  remarks: z.string().optional(),
});
