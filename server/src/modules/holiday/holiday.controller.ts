// Read request values, call the service, and send the HTTP response.
import type { Request, Response } from "express";
import * as holidayService from "./holiday.service.js";

// GET /api/holidays?year=2026
export async function getAllHolidays(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  let year = Number(request.query.year);

  // Keep the current-year fallback for a missing, zero, or unreadable year.
  if (!year) {
    year = new Date().getUTCFullYear();
  }

  const holidays = await holidayService.getAllHolidays(organizationId, year);

  return response.status(200).json({
    success: true,
    data: holidays,
  });
}

// POST /api/holidays
export async function createHoliday(request: Request, response: Response) {
  // Use the organization from login, never one supplied in the form.
  const organizationId = String(request.user?.organizationId);
  const result = await holidayService.createHoliday(organizationId, request.body);

  if (result.status !== "success") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(201).json({
    success: true,
    message: result.message,
    data: result.holiday,
  });
}

// PUT /api/holidays/:id
export async function updateHoliday(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const holidayId = String(request.params.id);
  const result = await holidayService.updateHoliday(
    organizationId,
    holidayId,
    request.body
  );

  if (result.status === "not_found") {
    return response.status(404).json({
      success: false,
      message: result.message,
    });
  }

  if (result.status === "invalid") {
    return response.status(400).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(200).json({
    success: true,
    message: result.message,
    data: result.holiday,
  });
}

// DELETE /api/holidays/:id
export async function deleteHoliday(request: Request, response: Response) {
  const organizationId = String(request.user?.organizationId);
  const holidayId = String(request.params.id);
  const result = await holidayService.deleteHoliday(organizationId, holidayId);

  if (result.status === "not_found") {
    return response.status(404).json({
      success: false,
      message: result.message,
    });
  }

  return response.status(200).json({
    success: true,
    message: result.message,
  });
}
