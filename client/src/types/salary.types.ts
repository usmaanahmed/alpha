// Everything the salary screens need: the shapes the server sends, the
// friendly labels for the dropdowns, and the small functions that turn one
// salary into the numbers shown in the table.

export type SalaryType = "monthly" | "daily" | "hourly";

// The employee a salary belongs to. The server sends these fields already
// filled in (that is what populate does), so the table can show the name and
// the picture without a second request.
export interface SalaryEmployee {
  _id: string;
  name: string;
  email: string;
  photo: string;
  designation: string;
  status: "active" | "inactive";
}

// One extra amount paid on top of the basic salary.
export interface Allowance {
  _id: string;
  name: string;
  amount: number;
  description: string;
}

// The salary structure of one employee. An employee has at most one.
export interface Salary {
  _id: string;
  employee: SalaryEmployee | null;
  salaryType: SalaryType;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: Allowance[];
  createdAt: string;
  updatedAt: string;
}

// The three salary types, for the dropdown and for the table filter.
export const SALARY_TYPE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily" },
  { value: "hourly", label: "Hourly" },
];

// "monthly" -> "Monthly".
export function getSalaryTypeLabel(salaryType: SalaryType) {
  const option = SALARY_TYPE_OPTIONS.find(
    (item) => item.value === salaryType
  );

  return option ? option.label : salaryType;
}

// What one unit of this salary is worth, written the way a person says it:
// a monthly salary is "per month", an hourly one is "per hour". The detail
// dialog puts it next to the amounts so nobody reads a daily rate as a
// monthly one.
export function getSalaryTypeSuffix(salaryType: SalaryType) {
  if (salaryType === "daily") {
    return "per day";
  }

  if (salaryType === "hourly") {
    return "per hour";
  }

  return "per month";
}

// The allowance names the form offers in its dropdown. "Other" lets the
// organization write its own name, because custom allowances are allowed.
export const ALLOWANCE_NAME_OPTIONS = [
  "House Allowance",
  "Medical Allowance",
  "Transport Allowance",
  "Fuel Allowance",
  "Meal Allowance",
  "Mobile Allowance",
  "Internet Allowance",
];

// A salary with no allowance simply has an empty list, so this helper keeps
// the pages short.
export function getAllowances(salary: Salary) {
  return salary.allowances || [];
}

// All the allowance amounts of one salary added together. This is the
// "Total Allowances" column of the table.
export function getTotalAllowances(salary: Salary) {
  let total = 0;

  getAllowances(salary).forEach((allowance) => {
    total = total + allowance.amount;
  });

  return total;
}

// 45000 -> "45,000.00". Money is always shown with two decimals, so a column
// of amounts lines up under itself.
export function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// "2026-08-01T00:00:00.000Z" -> "1 Aug 2026", for the "Created" column.
export function formatSalaryDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
