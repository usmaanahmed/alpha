import { axiosClient } from "./axiosClient";
import type { Holiday } from "@/types/hr.types";

// What we send when we add or edit a holiday.
// The date is the text "2026-07-30" that comes from the date input.
export interface HolidayValues {
  name: string;
  date: string;
  isOptional: boolean;
  description?: string;
}

// The holidays of one year. Every employee of the organization can read them.
export async function getHolidaysRequest(year: number) {
  const response = await axiosClient.get("/holidays", {
    params: { year: year },
  });
  return response.data.data as Holiday[];
}

export async function createHolidayRequest(values: HolidayValues) {
  const response = await axiosClient.post("/holidays", values);
  return response.data;
}

export async function updateHolidayRequest(id: string, values: HolidayValues) {
  const response = await axiosClient.put("/holidays/" + id, values);
  return response.data;
}

export async function deleteHolidayRequest(id: string) {
  const response = await axiosClient.delete("/holidays/" + id);
  return response.data;
}
