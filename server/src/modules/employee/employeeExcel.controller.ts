import type { Request, Response } from "express";
import * as service from "./employeeExcel.service.js";

const EXCEL_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// Send an Excel file to the browser as a download.
function sendExcelFile(response: Response, fileName: string, content: ArrayBuffer) {
  response.setHeader("Content-Type", EXCEL_TYPE);
  response.setHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\"");
  return response.send(Buffer.from(content));
}

export async function downloadTemplate(request: Request, response: Response) {
  const content = await service.buildTemplateFile();
  return sendExcelFile(response, "employee-template.xlsx", content as ArrayBuffer);
}

export async function exportEmployees(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  const content = await service.buildExportFile(actor);
  return sendExcelFile(response, "employees.xlsx", content as ArrayBuffer);
}

export async function importEmployees(request: Request, response: Response) {
  const actor = {
    user: request.user,
    employee: null,
  };
  // multer keeps the sheet in memory, so it is in request.file.buffer.
  const fileBuffer = request.file ? request.file.buffer : undefined;
  const result = await service.importEmployees(actor, fileBuffer);
  let statusCode = 200;
  if (result.status === "invalid") {
    statusCode = 400;
  }
  return response.status(statusCode).json({
    success: result.status === "success",
    message: result.message,
    data: result.data,
  });
}
