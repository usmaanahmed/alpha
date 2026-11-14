import { axiosClient } from "./axiosClient";
import type { Attendance, AttendanceStatus, Holiday } from "@/types/hr.types";

// What the calendar page of the organization gets: every attendance row of
// the month, and the holidays of that month so the squares of a closed day
// can be painted differently.
export interface AttendanceMonth {
  attendances: Attendance[];
  holidays: Holiday[];
}

// What the HR sends to fix one day of one employee by hand.
// checkIn and checkOut are the texts "09:30" and "18:00" from the time
// inputs, and they may be empty (for example on an absent day).
export interface MarkAttendanceValues {
  employee: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  remarks?: string;
}

// The row of the logged in employee for today.
// It is null when this person did not check in yet.
export async function getMyTodayAttendanceRequest() {
  const response = await axiosClient.get("/attendance/me/today");
  return response.data.data as Attendance | null;
}

export async function checkInRequest() {
  const response = await axiosClient.post("/attendance/check-in");
  return response.data;
}

export async function checkOutRequest() {
  const response = await axiosClient.post("/attendance/check-out");
  return response.data;
}

// The days of the logged in employee for one month. month is 1 for January.
export async function getMyAttendanceRequest(input: {
  year: number;
  month: number;
}) {
  const response = await axiosClient.get("/attendance/me", {
    params: { year: input.year, month: input.month },
  });
  return response.data.data as Attendance[];
}

// The whole organization for one day. Only the organization and an HR
// are allowed to read this.
export async function getAttendanceOfDayRequest(date: string) {
  const response = await axiosClient.get("/attendance", {
    params: { date: date },
  });
  return response.data.data as Attendance[];
}

// The whole organization for a whole month, for the calendar page.
// month is 1 for January.
export async function getAttendanceOfMonthRequest(input: {
  year: number;
  month: number;
}) {
  const response = await axiosClient.get("/attendance/month", {
    params: { year: input.year, month: input.month },
  });
  return response.data.data as AttendanceMonth;
}

export async function markAttendanceRequest(values: MarkAttendanceValues) {
  const response = await axiosClient.post("/attendance/mark", values);
  return response.data;
}
