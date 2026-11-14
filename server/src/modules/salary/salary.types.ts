import type mongoose from "mongoose";

export type SalaryType = "monthly" | "daily" | "hourly";

export interface Allowance {
  name: string;
  amount: number;
  description: string;
}

// Description can be left out in a validated form row.
export interface AllowanceInput {
  name: string;
  amount: number;
  description?: string;
}

export interface SalaryInput {
  employeeId: string;
  salaryType: SalaryType;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances?: AllowanceInput[];
}

export interface SalaryDocument extends mongoose.Document {
  organization: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  salaryType: SalaryType;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: Allowance[];
  createdAt: Date;
  updatedAt: Date;
}

// These employee fields are included when a salary is displayed.
export interface SalaryEmployee {
  name: string;
  email: string;
  photo: string;
  designation: string;
  status: string;
}

// A deleted employee can leave a salary with employee set to null.
export interface SalaryDetails {
  organization: mongoose.Types.ObjectId;
  employee: SalaryEmployee | null;
  salaryType: SalaryType;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: Allowance[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SalaryResult {
  status: "success" | "not_found" | "invalid";
  message: string;
  salary?: SalaryDetails | null;
}

export interface SalaryListOptions {
  search: string;
  salaryType: string;
  sortBy: string;
  sortOrder: string;
}

// Optional query fields are added only when their filters are used.
export interface SalaryFilter {
  organization: string;
  salaryType?: SalaryType;
  employee?: { $in: mongoose.Types.ObjectId[] };
}

export interface AllowanceResult {
  allowances: Allowance[];
  message: string;
}
