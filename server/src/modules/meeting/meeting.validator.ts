import { z } from "zod";

// Rules for the "schedule meeting" and "edit meeting" forms.
//
// startAt comes from an <input type="datetime-local"> so it arrives as text
// like "2026-07-30T14:30". The controller turns it into a real date.
// durationMinutes comes from a number input, coerce turns the text "60" into
// the number 60. attendees is the list of employee ids the user picked.
export const meetingSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please write a title for the meeting")
    .max(150, "The title is too long"),
  agenda: z.string().trim().max(2000, "The agenda is too long").optional(),
  startAt: z.string().min(1, "Please choose the date and time"),
  durationMinutes: z.coerce
    .number()
    .int("The duration must be a whole number of minutes")
    .positive("The duration must be more than zero")
    .max(1440, "A meeting cannot be longer than one day"),
  location: z.string().trim().max(200, "The location is too long").optional(),
  meetingType: z.enum(["in_person", "online"]),
  // At least one person has to be invited, otherwise it is not a meeting.
  attendees: z
    .array(z.string().min(1))
    .min(1, "Please invite at least one employee"),
  // When the chosen time clashes with another meeting the server stops and
  // sends back the clashes. If the user still wants to go ahead, the form
  // sends this flag as true and the server saves anyway.
  ignoreConflicts: z.boolean().optional(),
});

// Rules for the "reschedule" form: only the time changes here.
export const meetingRescheduleSchema = z.object({
  startAt: z.string().min(1, "Please choose the new date and time"),
  durationMinutes: z.coerce
    .number()
    .int("The duration must be a whole number of minutes")
    .positive("The duration must be more than zero")
    .max(1440, "A meeting cannot be longer than one day"),
  note: z.string().trim().max(300, "The note is too long").optional(),
  ignoreConflicts: z.boolean().optional(),
});

// Rules for the small "change status" form (start, complete, cancel, re-open).
export const meetingStatusSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
  note: z.string().trim().max(300, "The note is too long").optional(),
});

// Rules for the invited employee's answer.
export const meetingRespondSchema = z.object({
  response: z.enum(["accepted", "declined", "attended"]),
  note: z.string().trim().max(300, "The note is too long").optional(),
});

// Rules for the "notes and action items" form filled after the meeting.
export const meetingNotesSchema = z.object({
  notes: z.string().trim().max(5000, "The notes are too long").optional(),
  actionItems: z
    .array(z.object({
    text: z
      .string()
      .trim()
      .min(1, "Please write the action item")
      .max(500, "The action item is too long"),
    done: z.boolean(),
  }))
    .max(50, "That is too many action items")
    .optional(),
});
