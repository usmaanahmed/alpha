// Holiday rules live here, without HTTP requests or responses.
import * as holidayRepository from "./holiday.repository.js";
import { toDayStart } from "../../utils/date.util.js";
import type { HolidayInput, HolidayResult } from "./holiday.types.js";

export async function getAllHolidays(organizationId: string, year: number) {
  // Use UTC to match the way holiday dates are saved.
  // The range covers this whole year and stops before the next one starts.
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const firstDayOfNextYear = new Date(Date.UTC(year + 1, 0, 1));

  return holidayRepository.findHolidaysByDateRange(
    organizationId,
    firstDay,
    firstDayOfNextYear
  );
}

export async function createHoliday(
  organizationId: string,
  input: HolidayInput
): Promise<HolidayResult> {
  // Remove the time so two timestamps on the same UTC day count as one date.
  const date = toDayStart(input.date);

  if (!date) {
    return {
      status: "invalid",
      message: "Please choose a valid date",
    };
  }

  const existingHoliday = await holidayRepository.findHolidayByDate(
    organizationId,
    date
  );

  if (existingHoliday) {
    return {
      status: "invalid",
      message: "There is already a holiday on this date",
    };
  }

  const holiday = await holidayRepository.insertHoliday(organizationId, input, date);

  return {
    status: "success",
    message: "Holiday added successfully",
    holiday: holiday,
  };
}

export async function updateHoliday(
  organizationId: string,
  holidayId: string,
  input: HolidayInput
): Promise<HolidayResult> {
  const holiday = await holidayRepository.findHolidayById(organizationId, holidayId);

  if (!holiday) {
    return {
      status: "not_found",
      message: "Holiday not found",
    };
  }

  const date = toDayStart(input.date);

  if (!date) {
    return {
      status: "invalid",
      message: "Please choose a valid date",
    };
  }

  const holidayOnSameDay = await holidayRepository.findHolidayByDate(
    organizationId,
    date
  );

  // Keeping this holiday's current date is allowed. A different holiday
  // on that date blocks the update. Compare id text because MongoDB ids are objects.
  if (holidayOnSameDay) {
    const existingHolidayId = String(holidayOnSameDay._id);
    const currentHolidayId = String(holiday._id);

    if (existingHolidayId !== currentHolidayId) {
      return {
        status: "invalid",
        message: "There is already a holiday on this date",
      };
    }
  }

  let description = input.description;

  if (!description) {
    description = "";
  }

  holiday.name = input.name;
  holiday.date = date;
  holiday.isOptional = input.isOptional;
  holiday.description = description;
  await holidayRepository.saveHoliday(holiday);

  return {
    status: "success",
    message: "Holiday updated successfully",
    holiday: holiday,
  };
}

export async function deleteHoliday(
  organizationId: string,
  holidayId: string
): Promise<HolidayResult> {
  const holiday = await holidayRepository.findHolidayById(organizationId, holidayId);

  if (!holiday) {
    return {
      status: "not_found",
      message: "Holiday not found",
    };
  }

  await holidayRepository.removeHoliday(String(holiday._id));

  return {
    status: "success",
    message: "Holiday deleted successfully",
  };
}
