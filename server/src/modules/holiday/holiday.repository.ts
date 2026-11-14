// Holiday database queries belong here.
import { Holiday } from "./holiday.model.js";
import type { HolidayDocument, HolidayInput } from "./holiday.types.js";

export async function findHolidaysByDateRange(
  organizationId: string,
  firstDay: Date,
  firstDayOfNextYear: Date
) {
  // $gte includes January 1 of this year. $lt excludes January 1 of next year.
  // Sorting by 1 shows earlier holidays first.
  return Holiday.find({
    organization: organizationId,
    date: { $gte: firstDay, $lt: firstDayOfNextYear },
  }).sort({ date: 1 });
}

export async function findHolidayById(organizationId: string, holidayId: string) {
  // Include the organization so one workspace cannot change another's holiday.
  return Holiday.findOne({
    _id: holidayId,
    organization: organizationId,
  });
}

export async function findHolidayByDate(organizationId: string, date: Date) {
  return Holiday.findOne({
    organization: organizationId,
    date: date,
  });
}

export async function insertHoliday(
  organizationId: string,
  input: HolidayInput,
  date: Date
) {
  let description = input.description;

  if (!description) {
    description = "";
  }

  return Holiday.create({
    name: input.name,
    organization: organizationId,
    date: date,
    isOptional: input.isOptional,
    description: description,
  });
}

export async function saveHoliday(holiday: HolidayDocument) {
  return holiday.save();
}

export async function removeHoliday(holidayId: string) {
  await Holiday.deleteOne({ _id: holidayId });
}
