import ExcelJS from "exceljs";
import * as repository from "./employee.repository.js";
import type { CreateEmployeeInput } from "./employee.types.js";
import type { ServiceActor } from "../../types/service.types.js";
import { hashPassword } from "../../utils/password.util.js";
import { toDayStart } from "../../utils/date.util.js";

// ---------------------------------------------------------------------------
// The columns of the sheet
// ---------------------------------------------------------------------------
// The template, the export and the import all use this one list, so the three
// of them can never disagree about the column names.
// The import finds a column by its header text, so the order does not matter.
interface SheetColumn {
  header: string;
  width: number;
}

const SHEET_COLUMNS: SheetColumn[] = [
  { header: "Name", width: 22 },
  { header: "Email", width: 28 },
  { header: "Password", width: 16 },
  { header: "Phone", width: 16 },
  { header: "Department", width: 20 },
  { header: "Role", width: 18 },
  { header: "Designation", width: 22 },
  { header: "Qualification", width: 24 },
  { header: "Employment Type", width: 18 },
  { header: "Joining Date", width: 14 },
  { header: "Date of Birth", width: 14 },
  { header: "Gender", width: 10 },
  { header: "Address", width: 30 },
  { header: "Status", width: 10 },
];

// The most rows one import accepts, so one request never runs for minutes.
const MAX_IMPORT_ROWS = 500;

const EMPLOYMENT_TYPES = ["full_time", "part_time", "intern", "contract"];
const GENDERS = ["male", "female", "other"];

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// Make the first row of a sheet bold with a grey background.
function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };
}

// "2026-07-30T00:00:00.000Z" -> "2026-07-30". A missing date gives "".
function dateToText(date: Date | null) {
  if (!date) {
    return "";
  }
  return date.toISOString().slice(0, 10);
}

// "full_time" -> "Full Time"
function employmentTypeToText(type: string) {
  const words = type.split("_");
  const bigWords: string[] = [];
  for (const word of words) {
    bigWords.push(word.charAt(0).toUpperCase() + word.slice(1));
  }
  return bigWords.join(" ");
}

// Read a date cell. Excel gives a real Date when the cell is formatted as a
// date, and a text when the user typed it as text. We accept both.
// It returns the text "2026-07-30", "" when the cell is empty,
// or null when we cannot understand what is written there.
function readDateCell(cell: ExcelJS.Cell) {
  if (cell.value instanceof Date) {
    return dateToText(cell.value);
  }
  const text = cell.text.trim();
  if (text === "") {
    return "";
  }
  const looksLikeDate = /^\d{4}-\d{2}-\d{2}$/.test(text);
  if (!looksLikeDate || toDayStart(text) === null) {
    return null;
  }
  return text;
}

// ---------------------------------------------------------------------------
// GET /api/employees/template
// ---------------------------------------------------------------------------
// An empty sheet with the right column names, and a second sheet that
// explains how to fill it.
export async function buildTemplateFile() {
  const workbook = new ExcelJS.Workbook();

  const sheet = workbook.addWorksheet("Employees");
  sheet.columns = SHEET_COLUMNS.map((column) => ({
    header: column.header,
    width: column.width,
  }));
  styleHeaderRow(sheet);

  const help = workbook.addWorksheet("Instructions");
  help.getColumn(1).width = 110;
  const lines = [
    "How to fill the Employees sheet",
    "Name, Email, Password, Department and Role are required. Every other column is optional.",
    "Password must be at least 6 characters. It becomes the login password of the employee.",
    "Department: write the department name. If it does not exist yet, it is created automatically.",
    "Role: write the name of one of your active roles exactly, for example Manager.",
    "Employment Type: Full Time, Part Time, Intern or Contract. Empty means Full Time.",
    "Joining Date and Date of Birth: write them like 2026-07-30.",
    "Gender: Male, Female or Other.",
    "Status: Active or Inactive. Empty means Active.",
    "An email that already exists in the application is skipped, the other rows are still imported.",
    "Do not rename the column headers in the first row of the Employees sheet.",
  ];
  for (const line of lines) {
    help.addRow([line]);
  }
  help.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

// ---------------------------------------------------------------------------
// GET /api/employees/export
// ---------------------------------------------------------------------------
// Every employee of the organization in the same columns as the template.
// The password is never exported: we only store a hash of it.
export async function buildExportFile(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const employees = await repository.findEmployeesForExport(organizationId);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");

  // The export has no Password column.
  const exportColumns = SHEET_COLUMNS.filter((column) => column.header !== "Password");
  sheet.columns = exportColumns.map((column) => ({
    header: column.header,
    width: column.width,
  }));
  styleHeaderRow(sheet);

  for (const employee of employees) {
    // After populate() these two are objects with a name, not plain ids.
    const department = employee.department as unknown as { name: string } | null;
    const role = employee.role as unknown as { name: string } | null;

    let gender = "";
    if (employee.gender) {
      gender = employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1);
    }

    sheet.addRow([
      employee.name,
      employee.email,
      employee.phone,
      department ? department.name : "",
      role ? role.name : "",
      employee.designation,
      employee.qualification || "",
      employmentTypeToText(employee.employmentType),
      dateToText(employee.joiningDate),
      dateToText(employee.dateOfBirth),
      gender,
      employee.address,
      employee.status === "active" ? "Active" : "Inactive",
    ]);
  }

  return workbook.xlsx.writeBuffer();
}

// ---------------------------------------------------------------------------
// POST /api/employees/import
// ---------------------------------------------------------------------------
interface ImportError {
  // The row number as Excel shows it, so the user can find it quickly.
  row: number;
  message: string;
}

export async function importEmployees(actor: ServiceActor, fileBuffer: Buffer | undefined) {
  if (!fileBuffer) {
    return { status: "invalid", message: "Please choose an Excel file", data: undefined };
  }

  const organizationId = String(actor.user?.organizationId);

  // 1. Open the workbook and take its first sheet.
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);
  } catch (error) {
    return { status: "invalid", message: "This file is not a valid Excel file", data: undefined };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { status: "invalid", message: "The file has no sheet", data: undefined };
  }

  // 2. Find which column number every header has.
  const columnNumbers: Record<string, number> = {};
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    columnNumbers[cell.text.trim().toLowerCase()] = columnNumber;
  });
  const requiredHeaders = ["Name", "Email", "Password", "Department", "Role"];
  for (const header of requiredHeaders) {
    if (!columnNumbers[header.toLowerCase()]) {
      return {
        status: "invalid",
        message: "The column \"" + header + "\" is missing. Please use the template file.",
        data: undefined,
      };
    }
  }
  if (sheet.rowCount - 1 > MAX_IMPORT_ROWS) {
    return {
      status: "invalid",
      message: "You can import at most " + MAX_IMPORT_ROWS + " employees at one time",
      data: undefined,
    };
  }

  // Reads the text of one cell of the current row, "" when the column is not in the file.
  function readText(row: ExcelJS.Row, header: string) {
    const columnNumber = columnNumbers[header.toLowerCase()];
    if (!columnNumber) {
      return "";
    }
    return row.getCell(columnNumber).text.trim();
  }

  function readDate(row: ExcelJS.Row, header: string) {
    const columnNumber = columnNumbers[header.toLowerCase()];
    if (!columnNumber) {
      return "";
    }
    return readDateCell(row.getCell(columnNumber));
  }

  // 3. Load the departments and roles one time, as "lowercase name -> id".
  const departmentIds: Record<string, string> = {};
  const departments = await repository.findAllDepartments(organizationId);
  for (const department of departments) {
    departmentIds[department.name.toLowerCase()] = String(department._id);
  }
  const roleIds: Record<string, string> = {};
  const roles = await repository.findActiveRoles(organizationId);
  for (const role of roles) {
    roleIds[role.name.toLowerCase()] = String(role._id);
  }

  // 4. Go through the rows one by one. A bad row is written in "errors"
  //    and skipped, the good rows are still imported.
  const errors: ImportError[] = [];
  let createdCount = 0;
  let createdDepartmentCount = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);

    const name = readText(row, "Name");
    const emailText = readText(row, "Email");
    const password = readText(row, "Password");
    const departmentName = readText(row, "Department");
    const roleName = readText(row, "Role");

    // A completely empty row is just empty space in the sheet.
    const rowIsEmpty = name === "" && emailText === "" && password === "" && departmentName === "" && roleName === "";
    if (rowIsEmpty) {
      continue;
    }

    // --- Check the required columns ---
    if (name.length < 2) {
      errors.push({ row: rowNumber, message: "Name must be at least 2 characters" });
      continue;
    }
    const email = emailText.toLowerCase();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailLooksValid) {
      errors.push({ row: rowNumber, message: "Email is not valid" });
      continue;
    }
    if (password.length < 6) {
      errors.push({ row: rowNumber, message: "Password must be at least 6 characters" });
      continue;
    }
    if (departmentName === "") {
      errors.push({ row: rowNumber, message: "Department is required" });
      continue;
    }
    const roleId = roleIds[roleName.toLowerCase()];
    if (!roleId) {
      errors.push({ row: rowNumber, message: "Role \"" + roleName + "\" was not found or is not active" });
      continue;
    }

    // --- Check the optional columns ---
    let employmentType = readText(row, "Employment Type").toLowerCase().replace(/[\s-]+/g, "_");
    if (employmentType === "") {
      employmentType = "full_time";
    }
    if (!EMPLOYMENT_TYPES.includes(employmentType)) {
      errors.push({ row: rowNumber, message: "Employment Type must be Full Time, Part Time, Intern or Contract" });
      continue;
    }
    const gender = readText(row, "Gender").toLowerCase();
    if (gender !== "" && !GENDERS.includes(gender)) {
      errors.push({ row: rowNumber, message: "Gender must be Male, Female or Other" });
      continue;
    }
    let status = readText(row, "Status").toLowerCase();
    if (status === "") {
      status = "active";
    }
    if (status !== "active" && status !== "inactive") {
      errors.push({ row: rowNumber, message: "Status must be Active or Inactive" });
      continue;
    }
    const joiningDate = readDate(row, "Joining Date");
    const dateOfBirth = readDate(row, "Date of Birth");
    if (joiningDate === null || dateOfBirth === null) {
      errors.push({ row: rowNumber, message: "Dates must be written like 2026-07-30" });
      continue;
    }

    // --- The email must be free (inside the organization and as a login) ---
    const existingEmployee = await repository.findExistingEmployee(organizationId, email);
    const existingUser = await repository.findExistingUser(email);
    if (existingEmployee || existingUser) {
      errors.push({ row: rowNumber, message: "The email " + email + " already exists" });
      continue;
    }

    // --- The department: use it, or create it when it does not exist ---
    // Everything else is already valid here, so a bad row never leaves an
    // empty new department behind.
    let departmentId = departmentIds[departmentName.toLowerCase()];
    if (!departmentId) {
      const newDepartment = await repository.insertDepartment(organizationId, departmentName);
      departmentId = String(newDepartment._id);
      departmentIds[departmentName.toLowerCase()] = departmentId;
      createdDepartmentCount++;
    }

    // --- Save the employee and its login account, like the add form does ---
    const department = await repository.findDepartment(departmentId, organizationId);
    const role = await repository.findRole(roleId, organizationId);
    if (!department || !role) {
      errors.push({ row: rowNumber, message: "Department or role could not be loaded" });
      continue;
    }
    const input: CreateEmployeeInput = {
      name: name,
      email: email,
      password: password,
      phone: readText(row, "Phone"),
      departmentId: departmentId,
      roleId: roleId,
      status: status === "active" ? "active" : "inactive",
      employmentType: employmentType as CreateEmployeeInput["employmentType"],
      gender: gender as CreateEmployeeInput["gender"],
    };
    const employee = await repository.insertEmployee(input, email, organizationId, department, role, undefined, {
      designation: readText(row, "Designation"),
      qualification: readText(row, "Qualification"),
      employmentType: input.employmentType,
      joiningDate: toDayStart(joiningDate),
      dateOfBirth: toDayStart(dateOfBirth),
      gender: input.gender || "",
      address: readText(row, "Address"),
      exitDate: null,
      exitReason: "",
    });
    const hashedPassword = await hashPassword(password);
    await repository.insertUser(input, email, hashedPassword, organizationId, employee);
    createdCount++;
  }

  return {
    status: "success",
    message: createdCount + " employee(s) imported",
    data: {
      createdCount: createdCount,
      createdDepartmentCount: createdDepartmentCount,
      errors: errors,
    },
  };
}
