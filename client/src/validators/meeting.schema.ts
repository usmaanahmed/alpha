import { z } from "zod";

// The rules for the "schedule / edit meeting" form. They match the rules on
// the server, so the same message is shown whether the check runs in the
// browser or on the server.
export const meetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please write a title for the meeting")
    .max(150, "The title is too long"),
  agenda: z.string().trim().max(2000, "The agenda is too long"),
  startAt: z.string().min(1, "Please choose the date and time"),
  // The number input gives us a real number (see valueAsNumber in the form),
  // so we check it as a number directly.
  durationMinutes: z
    .number()
    .int("The duration must be a whole number of minutes")
    .positive("The duration must be more than zero")
    .max(1440, "A meeting cannot be longer than one day"),
  location: z.string().trim().max(200, "The location is too long"),
  meetingType: z.enum(["in_person", "online"]),
  // At least one person has to be invited.
  attendees: z
    .array(z.string().min(1))
    .min(1, "Please invite at least one employee"),
});

export type MeetingFormValues = z.infer<typeof meetingSchema>;

// The "reschedule" form.
export const meetingRescheduleSchema = z.object({
  startAt: z.string().min(1, "Please choose the new date and time"),
  durationMinutes: z
    .number()
    .int("The duration must be a whole number of minutes")
    .positive("The duration must be more than zero")
    .max(1440, "A meeting cannot be longer than one day"),
  note: z.string().trim().max(300, "The note is too long"),
});

export type MeetingRescheduleFormValues = z.infer<
  typeof meetingRescheduleSchema
>;

// The invited employee's answer.
export const meetingRespondSchema = z.object({
  response: z.enum(["accepted", "declined", "attended"]),
  note: z.string().trim().max(300, "The note is too long"),
});

export type MeetingRespondFormValues = z.infer<typeof meetingRespondSchema>;
