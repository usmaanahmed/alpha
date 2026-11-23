import ExcelJS from "exceljs";
import JSZip from "jszip";
import { randomUUID } from "node:crypto";
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
];

// The most rows one import accepts, so one request never runs for minutes.
const MAX_IMPORT_ROWS = 500;

// Used when a row leaves the Department or the Role empty.
const DEFAULT_DEPARTMENT_NAME = "Unassigned";
const DEFAULT_ROLE_NAME = "Employee";

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

// Builds a login email for an employee whose row has no email:
// "Ahmed Khan" -> "ahmed.khan@no-email.local". When that address is already
// taken, a number is added: "ahmed.khan2@no-email.local".
async function makePlaceholderEmail(organizationId: string, name: string) {
  // Keep only letters and digits, and join the words with a dot.
  const words = name.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word !== "");
  let start = words.join(".");
  if (start === "") {
    start = "employee";
  }

  let counter = 1;
  while (true) {
    const suffix = counter === 1 ? "" : String(counter);
    const email = start + suffix + "@no-email.local";
    const existingEmployee = await repository.findExistingEmployee(organizationId, email);
    const existingUser = await repository.findExistingUser(email);
    if (!existingEmployee && !existingUser) {
      return email;
    }
    counter++;
  }
}

// Some programs (Google Sheets exports, converters, online tools) write the
// cell comments in a way that the Excel reader cannot open: it stops with an
// error even though Excel itself opens the file fine. Comments are not data
// we need, so this function opens the file as a zip and removes the comment
// links, and then the sheet can be read normally.
async function removeCommentsFromFile(fileBuffer: Buffer) {
  const zip = await JSZip.loadAsync(fileBuffer);
  const fileNames = Object.keys(zip.files);

  for (const fileName of fileNames) {
    // The list of links of a sheet: drop the "comments" and "vmlDrawing" ones.
    const isSheetLinks = /^xl\/worksheets\/_rels\/.*\.rels$/.test(fileName);
    if (isSheetLinks) {
      const xml = await zip.file(fileName)!.async("string");
      const cleanXml = xml.replace(/<Relationship\b[^>]*\/>/g, (tag) => {
        if (tag.includes("comments") || tag.includes("vmlDrawing")) {
          return "";
        }
        return tag;
      });
      zip.file(fileName, cleanXml);
    }

    // The sheet itself also points to the comment drawing, so remove that too.
    const isSheet = /^xl\/worksheets\/sheet\d+\.xml$/.test(fileName);
    if (isSheet) {
      const xml = await zip.file(fileName)!.async("string");
      zip.file(fileName, xml.replace(/<legacyDrawing\b[^>]*\/>/g, ""));
    }
  }

  return zip.generateAsync({ type: "nodebuffer" });
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

  // One example row, so the user sees how every column is filled.
  // The user must delete it (or replace it) before importing.
  sheet.addRow([
    "Muhammad Ahmed Khan",
    "ahmed.khan@example.com",
    "0300-1234567",
    "Engineering",
    "Employee",
    "Software Engineer",
    "BS Computer Science",
    "Full Time",
    "2026-01-15",
    "1995-03-20",
    "Male",
    "House 12, Street 5, Gulberg III, Lahore, Pakistan",
  ]);

  const help = workbook.addWorksheet("Instructions");
  help.getColumn(1).width = 110;
  const lines = [
    "How to fill the Employees sheet",
    "Row 2 is only an example. Delete it or replace it with your own employee before importing.",
    "Name, Designation, Qualification and Joining Date are required. Every other column is optional.",
    "Email empty: a temporary email like ahmed.khan@no-email.local is created. Edit it later from the Employees page.",
    "Department empty: the employee goes to the department \"Unassigned\" (created automatically).",
    "Role empty: the role \"Employee\" is used (it must exist in your active roles).",
    "There is no password column. After the import, set each employee's login password from the Employees page (Change password).",
    "Every imported employee is created as Active.",
    "Department: write the department name. If it does not exist yet, it is created automatically.",
    "Role: write the name of one of your active roles exactly, for example Manager.",
    "Employment Type: Full Time, Part Time, Intern or Contract. Empty means Full Time.",
    "Joining Date and Date of Birth: write them like 2026-07-30.",
    "Gender: Male, Female or Other.",
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
export async function buildExportFile(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const employees = await repository.findEmployeesForExport(organizationId);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Employees");

  sheet.columns = SHEET_COLUMNS.map((column) => ({
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
    ]);
  }

  return workbook.xlsx.writeBuffer();
}


// ---------------------------------------------------------------------------
// POST /api/employees/import
// ---------------------------------------------------------------------------
// One thing that is wrong inside one row.
interface CellProblem {
  // The column header, for example "Email".
  column: string;
  // What the user wrote in that cell ("" when it is empty).
  value: string;
  // Why it is not accepted, and what is accepted instead.
  message: string;
}

// One row that was NOT imported. It lists every wrong cell of the row, and
// also the cells that were fine, so the user knows what to keep and what to fix.
interface RowError {
  // The row number as Excel shows it, so the user can find it quickly.
  row: number;
  // The name written in that row, to help recognize the person.
  name: string;
  problems: CellProblem[];
  correctColumns: string[];
  // Everything written in the row, by column header, so the browser can draw
  // the row like Excel does and paint the wrong cells red.
  cells: Record<string, string>;
}

// A failed import that never reached the rows (wrong file, missing columns...).
function failImport(message: string) {
  return { status: "invalid", message: message, data: undefined };
}

export async function importEmployees(actor: ServiceActor, fileBuffer: Buffer | undefined) {
  if (!fileBuffer) {
    return failImport("No file was received. Please choose an Excel file (.xlsx) and try again.");
  }

  const organizationId = String(actor.user?.organizationId);

  // 1. Open the workbook and take its first sheet.
  const workbook = new ExcelJS.Workbook();
  try {
    try {
      await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);
    } catch (firstError) {
      // Try one more time without the comments of the sheet.
      const cleanBuffer = await removeCommentsFromFile(fileBuffer);
      await workbook.xlsx.load(cleanBuffer as unknown as ArrayBuffer);
    }
  } catch (error) {
    return failImport(
      "The file could not be read as an Excel workbook. It may be damaged, or it may be an old .xls / .csv file " +
        "that was only renamed to .xlsx. Open it in Excel, choose Save As > Excel Workbook (.xlsx), and upload it again.",
    );
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return failImport("The workbook has no sheet inside it.");
  }

  // 2. Find which column number every header has. The headers must be in row 1.
  const columnNumbers: Record<string, number> = {};
  const foundHeaders: string[] = [];
  sheet.getRow(1).eachCell((cell, columnNumber) => {
    const headerText = cell.text.trim();
    if (headerText !== "") {
      columnNumbers[headerText.toLowerCase()] = columnNumber;
      foundHeaders.push(headerText);
    }
  });
  const requiredHeaders = ["Name", "Designation", "Qualification", "Joining Date"];
  const missingHeaders: string[] = [];
  for (const header of requiredHeaders) {
    if (!columnNumbers[header.toLowerCase()]) {
      missingHeaders.push(header);
    }
  }
  if (missingHeaders.length > 0) {
    const foundText = foundHeaders.length > 0 ? foundHeaders.join(", ") : "none";
    return failImport(
      "Required column(s) missing in the first sheet (\"" + sheet.name + "\"): " + missingHeaders.join(", ") + ". " +
        "Columns found in row 1: " + foundText + ". " +
        "The headers must be in row 1 and spelled exactly like the template, so please download the template again.",
    );
  }
  // Count the rows that really have something written in them. We cannot use
  // sheet.rowCount for this: a sheet with colored or formatted empty rows
  // (very common) reports hundreds of rows that are only empty space.
  let filledRowCount = 0;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    let rowHasText = false;
    sheet.getRow(rowNumber).eachCell((cell) => {
      if (cell.text.trim() !== "") {
        rowHasText = true;
      }
    });
    if (rowHasText) {
      filledRowCount++;
    }
  }
  if (filledRowCount > MAX_IMPORT_ROWS) {
    return failImport(
      "The sheet has " + filledRowCount + " rows with data. You can import at most " + MAX_IMPORT_ROWS + " employees at one time.",
    );
  }

  // Reads the text of one cell of the current row, "" when the column is not in the file.
  function readText(row: ExcelJS.Row, header: string) {
    const columnNumber = columnNumbers[header.toLowerCase()];
    if (!columnNumber) {
      return "";
    }
    return row.getCell(columnNumber).text.trim();
  }

  // Reads a date cell: "2026-07-30", "" when empty or when the column is not
  // in the file, and null when the cell is not a date we understand.
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
  const roleNames: string[] = [];
  const roles = await repository.findActiveRoles(organizationId);
  for (const role of roles) {
    roleIds[role.name.toLowerCase()] = String(role._id);
    roleNames.push(role.name);
  }
  const roleListText = roleNames.length > 0 ? roleNames.join(", ") : "no active role exists yet";

  // 4. Go through the rows one by one. A row with any wrong cell is written in
  //    "rowErrors" and skipped, the good rows are still imported.
  const rowErrors: RowError[] = [];
  let createdCount = 0;
  let createdDepartmentCount = 0;
  let checkedRowCount = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);

    const name = readText(row, "Name");
    const emailText = readText(row, "Email");
    const departmentName = readText(row, "Department");
    const roleName = readText(row, "Role");
    const phone = readText(row, "Phone");
    const designation = readText(row, "Designation");
    const qualification = readText(row, "Qualification");
    const address = readText(row, "Address");
    const employmentTypeText = readText(row, "Employment Type");
    const genderText = readText(row, "Gender");
    const joiningDateText = readText(row, "Joining Date");
    const dateOfBirthText = readText(row, "Date of Birth");

    // A completely empty row is just empty space in the sheet.
    const rowIsEmpty = name === "" && emailText === "" && departmentName === "" && roleName === "" &&
      designation === "" && qualification === "" && phone === "" && address === "";
    if (rowIsEmpty) {
      continue;
    }
    checkedRowCount++;

    // Every check below adds to one of these two lists, and the checks keep
    // going after the first mistake, so the user sees ALL the problems of a
    // row at the same time instead of fixing them one by one.
    const problems: CellProblem[] = [];
    const correctColumns: string[] = [];
    const cells: Record<string, string> = {
      "Name": name,
      "Email": emailText,
      "Phone": phone,
      "Department": departmentName,
      "Role": roleName,
      "Designation": designation,
      "Qualification": qualification,
      "Employment Type": employmentTypeText,
      "Joining Date": joiningDateText,
      "Date of Birth": dateOfBirthText,
      "Gender": genderText,
      "Address": address,
    };

    // --- Name (required) ---
    if (name === "") {
      problems.push({ column: "Name", value: "", message: "Name is empty. Please write the full name." });
    } else if (name.length < 2) {
      problems.push({ column: "Name", value: name, message: "Name is too short. It must be at least 2 characters." });
    } else {
      correctColumns.push("Name");
    }

    // --- Designation and Qualification (required) ---
    if (designation === "") {
      problems.push({ column: "Designation", value: "", message: "Designation is empty. Write the job title, for example Salesman." });
    } else {
      correctColumns.push("Designation");
    }
    if (qualification === "") {
      problems.push({ column: "Qualification", value: "", message: "Qualification is empty. Write the education, for example BBA." });
    } else {
      correctColumns.push("Qualification");
    }

    // --- Email (optional, but when it is written it must be valid and free) ---
    let email = emailText.toLowerCase();
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (emailText === "") {
      // Every employee needs a login email, so an empty one gets a made-up
      // address built from the name. The organization can edit it later.
      if (name.length >= 2) {
        email = await makePlaceholderEmail(organizationId, name);
      }
    } else if (!emailLooksValid) {
      problems.push({ column: "Email", value: emailText, message: "This is not a valid email. Use a format like ahmed@company.com." });
    } else {
      const existingEmployee = await repository.findExistingEmployee(organizationId, email);
      const existingUser = await repository.findExistingUser(email);
      if (existingEmployee || existingUser) {
        problems.push({
          column: "Email",
          value: emailText,
          message: "This email is already used by another employee or login account (it may also be written twice in this sheet).",
        });
      } else {
        correctColumns.push("Email");
      }
    }

    // --- Department (optional, it is created when it does not exist) ---
    // An empty department goes to the "Unassigned" department.
    if (departmentName !== "") {
      correctColumns.push("Department");
    }
    const finalDepartmentName = departmentName === "" ? DEFAULT_DEPARTMENT_NAME : departmentName;

    // --- Role (optional, must be one of the active roles) ---
    // An empty role gets the default role.
    const finalRoleName = roleName === "" ? DEFAULT_ROLE_NAME : roleName;
    const roleId = roleIds[finalRoleName.toLowerCase()];
    if (!roleId) {
      const reason = roleName === ""
        ? "Role is empty, and the default role \"" + DEFAULT_ROLE_NAME + "\" does not exist."
        : "No active role has this name.";
      problems.push({ column: "Role", value: roleName, message: reason + " Active roles: " + roleListText + "." });
    } else if (roleName !== "") {
      correctColumns.push("Role");
    }

    // --- Employment Type (optional) ---
    let employmentType = employmentTypeText.toLowerCase().replace(/[\s-]+/g, "_");
    if (employmentType === "") {
      employmentType = "full_time";
    } else if (!EMPLOYMENT_TYPES.includes(employmentType)) {
      problems.push({
        column: "Employment Type",
        value: employmentTypeText,
        message: "Not accepted. Use Full Time, Part Time, Intern or Contract.",
      });
    } else {
      correctColumns.push("Employment Type");
    }

    // --- Gender (optional) ---
    const gender = genderText.toLowerCase();
    if (gender !== "" && !GENDERS.includes(gender)) {
      problems.push({ column: "Gender", value: genderText, message: "Not accepted. Use Male, Female or Other." });
    } else if (gender !== "") {
      correctColumns.push("Gender");
    }

    // --- Joining Date (required) and Date of Birth (optional) ---
    const joiningDate = readDate(row, "Joining Date");
    if (joiningDate === null) {
      problems.push({ column: "Joining Date", value: joiningDateText, message: "Not a valid date. Write it like 2026-07-30." });
    } else if (joiningDate === "") {
      problems.push({ column: "Joining Date", value: "", message: "Joining Date is empty. Write it like 2026-07-30." });
    } else {
      correctColumns.push("Joining Date");
    }
    const dateOfBirth = readDate(row, "Date of Birth");
    if (dateOfBirth === null) {
      problems.push({ column: "Date of Birth", value: dateOfBirthText, message: "Not a valid date. Write it like 1995-03-20." });
    } else if (dateOfBirth) {
      correctColumns.push("Date of Birth");
    }

    // --- Text columns that accept anything ---
    if (phone !== "") {
      correctColumns.push("Phone");
    }
    if (address !== "") {
      correctColumns.push("Address");
    }

    // One wrong cell is enough to skip the whole row.
    if (problems.length > 0) {
      rowErrors.push({ row: rowNumber, name: name, problems: problems, correctColumns: correctColumns, cells: cells });
      continue;
    }

    // --- The department: use it, or create it when it does not exist ---
    // Everything else is already valid here, so a bad row never leaves an
    // empty new department behind.
    let departmentId = departmentIds[finalDepartmentName.toLowerCase()];
    if (!departmentId) {
      const newDepartment = await repository.insertDepartment(organizationId, finalDepartmentName);
      departmentId = String(newDepartment._id);
      departmentIds[finalDepartmentName.toLowerCase()] = departmentId;
      createdDepartmentCount++;
    }

    // --- Save the employee and its login account, like the add form does ---
    const department = await repository.findDepartment(departmentId, organizationId);
    const role = await repository.findRole(roleId, organizationId);
    if (!department || !role) {
      rowErrors.push({
        row: rowNumber,
        name: name,
        problems: [{ column: "Department / Role", value: finalDepartmentName + " / " + finalRoleName, message: "The department or the role could not be loaded. Please try again." }],
        correctColumns: correctColumns,
        cells: cells,
      });
      continue;
    }
    const input: CreateEmployeeInput = {
      name: name,
      email: email,
      // The sheet has no password. The real one is set later by the
      // organization, so for now the login gets a random one nobody knows.
      password: randomUUID(),
      phone: phone,
      departmentId: departmentId,
      roleId: roleId,
      status: "active",
      employmentType: employmentType as CreateEmployeeInput["employmentType"],
      gender: gender as CreateEmployeeInput["gender"],
    };
    const employee = await repository.insertEmployee(input, email, organizationId, department, role, undefined, {
      designation: designation,
      qualification: qualification,
      employmentType: input.employmentType,
      joiningDate: toDayStart(joiningDate),
      dateOfBirth: toDayStart(dateOfBirth),
      gender: input.gender || "",
      address: address,
      exitDate: null,
      exitReason: "",
    });
    const hashedPassword = await hashPassword(input.password);
    await repository.insertUser(input, email, hashedPassword, organizationId, employee);
    createdCount++;
  }

  // A sheet with a header and nothing under it.
  if (checkedRowCount === 0) {
    return failImport("The sheet has no employee rows. Write the employees from row 2, under the header row.");
  }

  return {
    status: "success",
    message: createdCount + " employee(s) imported",
    data: {
      totalRows: checkedRowCount,
      createdCount: createdCount,
      createdDepartmentCount: createdDepartmentCount,
      rowErrors: rowErrors,
    },
  };
}
