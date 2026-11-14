import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Organization } from "../modules/organization/organization.model.js";
import { Department } from "../modules/department/department.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { User } from "../modules/user/user.model.js";
import { Team } from "../modules/team/team.model.js";
import { Task } from "../modules/task/task.model.js";
import type {
  TaskPriority,
  TaskStatus,
  TaskAssignerType,
} from "../modules/task/task.model.js";
import { TaskComment } from "../modules/task/taskComment.model.js";
import { Meeting } from "../modules/meeting/meeting.model.js";
import type {
  AttendeeResponse,
  MeetingStatus,
  MeetingType,
} from "../modules/meeting/meeting.model.js";
import { Attendance } from "../modules/attendance/attendance.model.js";
import type { AttendanceStatus } from "../modules/attendance/attendance.model.js";
import { Holiday } from "../modules/holiday/holiday.model.js";
import { LeaveType } from "../modules/leaveType/leaveType.model.js";
import type { LeaveTypeDocument } from "../modules/leaveType/leaveType.model.js";
import { LeaveRequest } from "../modules/leave/leave.model.js";
import type { LeaveRequestStatus } from "../modules/leave/leave.model.js";
import { LeaveBalance } from "../modules/leave/leaveBalance.model.js";
import type { LeaveBalanceDocument } from "../modules/leave/leaveBalance.model.js";
import { Salary } from "../modules/salary/salary.model.js";
import { Notification } from "../modules/notification/notification.model.js";
import { planLeaveDays, countApprovedDays } from "../utils/leaveDays.util.js";
import { syncLeaveAttendance } from "../utils/leaveAttendance.util.js";
import { toDayText, isWeekend } from "../utils/date.util.js";

// Run this file with "npm run seed:alpha".
//
// It fills the ALPHA organization - the people who are already inside it -
// with a full working month, so every page of the app has something real to
// show:
//
//   teams         -> one team per department, with a lead and members
//   tasks         -> 22 tasks over every status and priority, and 6 of them
//                    were handed over to somebody else, so the assignment
//                    timeline really has more than one line
//   comments      -> a conversation under the tasks that are moving
//   meetings      -> finished, running, planned and called off
//   leave types   -> casual, sick, annual and unpaid
//   holidays      -> the public holidays of this year, past and coming
//   leaves        -> 9 requests: waiting, approved, partly approved, rejected
//                    and taken back, each with its approval trail
//   balances      -> one row per employee per leave type, carrying the days
//                    the approved leaves really used
//   attendance    -> the last 24 days of everybody, with present, half days,
//                    absences, the holidays and the approved leaves
//   salaries      -> one salary with allowances for every employee
//   notifications -> a few lines in the bell of the people involved
//
// It does NOT create people: it uses the employees that are already in the
// organization and finds them again by the first part of their email, so the
// logins you already know (ayesha@gmail.com / ayesha123 and so on) keep
// working exactly as they are.
//
// Running it again is safe: everything it made the last time is removed
// first. What it removes is written in step 3 - it is the HR history of these
// people - so do not run it on a workspace where you typed real leaves,
// attendance or salaries for them by hand.

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// The tag every task of this seed carries. It is how a second run finds the
// tasks of the first one again.
const SEED_TAG = "alpha-seed";

// How many days back the attendance is written.
const ATTENDANCE_DAYS = 24;

// A real moment, a number of days from now, at the hour and minute given.
// A negative number of days is a moment in the past.
function momentFromNow(days: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// A whole day, a number of days from today, as midnight UTC. That is how the
// app saves a day - see utils/date.util.ts - so a holiday, an attendance row
// and a leave date all come from here.
function dayFromNow(days: number) {
  const now = new Date();

  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  day.setUTCDate(day.getUTCDate() + days);

  return day;
}

// One fixed day of the CURRENT year, as midnight UTC. Used for the holidays,
// which sit on real calendar dates and not on "a number of days from now".
function dayOfThisYear(month: number, dayOfMonth: number) {
  const year = new Date().getUTCFullYear();
  return new Date(Date.UTC(year, month - 1, dayOfMonth));
}

// The hours between two moments, rounded to two decimals.
function hoursBetween(from: Date, to: Date) {
  const milliseconds = to.getTime() - from.getTime();
  return Math.round((milliseconds / (1000 * 60 * 60)) * 100) / 100;
}

// The day that is a number of WORKING days away from today, as midnight UTC.
// A negative number walks backwards.
//
// The leaves below are placed with this one and not with dayFromNow, because
// the seed runs on whatever weekday you happen to try it: "six days from now"
// is a Saturday one week and a Wednesday the next, and a leave that lands on
// a weekend is thrown away by the leave rules and shows up as a request of
// zero days. Counting in working days makes the same nine leaves come out the
// same way whenever the seed is run.
function workingDayFromNow(steps: number) {
  const day = dayFromNow(0);

  if (steps === 0) {
    return day;
  }

  const direction = steps > 0 ? 1 : -1;
  let left = Math.abs(steps);

  while (left > 0) {
    day.setUTCDate(day.getUTCDate() + direction);

    if (!isWeekend(day)) {
      left = left - 1;
    }
  }

  return day;
}

// The last day of a leave that starts on "from" and covers this many working
// days. A leave of five working days that starts on a Thursday ends on the
// Wednesday after, with the weekend sitting inside it.
function lastWorkingDayOf(from: Date, workingDays: number) {
  const day = new Date(from);
  let left = workingDays - 1;

  while (left > 0) {
    day.setUTCDate(day.getUTCDate() + 1);

    if (!isWeekend(day)) {
      left = left - 1;
    }
  }

  return day;
}

// How many days lie between today and this day. It is used to place the
// moment a leave was applied for, which is counted from the day it starts.
function daysBetweenToday(day: Date) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((day.getTime() - dayFromNow(0).getTime()) / oneDay);
}

// ---------------------------------------------------------------------------
// The teams: one per department
// ---------------------------------------------------------------------------

interface TeamPlan {
  name: string;
  description: string;
  department: string;
  lead: string;
  members: string[];
}

const TEAMS: TeamPlan[] = [
  {
    name: "Accounts Core",
    description: "The people who keep the books and the client ledgers.",
    department: "Accounts",
    lead: "ayesha",
    members: ["bilal", "hina"],
  },
  {
    name: "Sales Floor",
    description: "The people who talk to the clients and close the deals.",
    department: "Sales",
    lead: "danish",
    members: ["sana"],
  },
  {
    name: "Finance Desk",
    description: "Cheques, payments and the monthly closing.",
    department: "Finance",
    lead: "kamran",
    members: ["zainab"],
  },
  {
    name: "People Operations",
    description: "Hiring, leaves, attendance and everything about the staff.",
    department: "HR",
    lead: "imran",
    members: ["maryam", "usman"],
  },
  {
    name: "Content Studio",
    description: "The posts, the pictures and the pages of the company.",
    department: "Social Media",
    lead: "tariq",
    members: ["farhan"],
  },
];

// ---------------------------------------------------------------------------
// The leave types
// ---------------------------------------------------------------------------

interface LeaveTypePlan {
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  excludeHolidays: boolean;
  allowDocuments: boolean;
  documentRequirement: "optional" | "required";
  description: string;
}

const LEAVE_TYPES: LeaveTypePlan[] = [
  {
    name: "Casual Leave",
    daysPerYear: 12,
    isPaid: true,
    excludeHolidays: true,
    allowDocuments: false,
    documentRequirement: "optional",
    description: "Short days off for personal work. No paper needed.",
  },
  {
    name: "Sick Leave",
    daysPerYear: 10,
    isPaid: true,
    excludeHolidays: true,
    allowDocuments: true,
    documentRequirement: "optional",
    description:
      "Days off because of illness. A medical certificate may be attached.",
  },
  {
    name: "Annual Leave",
    daysPerYear: 20,
    isPaid: true,
    excludeHolidays: true,
    allowDocuments: false,
    documentRequirement: "optional",
    description: "The yearly holidays, usually asked for a few weeks ahead.",
  },
  {
    name: "Unpaid Leave",
    daysPerYear: 15,
    isPaid: false,
    // A long unpaid leave eats the holidays inside it too.
    excludeHolidays: false,
    allowDocuments: true,
    documentRequirement: "required",
    description:
      "Days off that cut the salary. Asked for when the paid balance is gone.",
  },
];

// ---------------------------------------------------------------------------
// The holidays of this year
// ---------------------------------------------------------------------------

interface HolidayPlan {
  name: string;
  month: number;
  day: number;
  isOptional: boolean;
  description: string;
}

const HOLIDAYS: HolidayPlan[] = [
  {
    name: "Kashmir Day",
    month: 2,
    day: 5,
    isOptional: false,
    description: "The office is closed.",
  },
  {
    name: "Pakistan Day",
    month: 3,
    day: 23,
    isOptional: false,
    description: "The office is closed.",
  },
  {
    name: "Labour Day",
    month: 5,
    day: 1,
    isOptional: false,
    description: "The office is closed.",
  },
  {
    name: "Independence Day",
    month: 8,
    day: 14,
    isOptional: false,
    description: "The office is closed.",
  },
  {
    name: "Company Foundation Day",
    month: 10,
    day: 20,
    isOptional: true,
    description: "An optional day: take it if you want it.",
  },
  {
    name: "Iqbal Day",
    month: 11,
    day: 9,
    isOptional: false,
    description: "The office is closed.",
  },
  {
    name: "Quaid-e-Azam Day",
    month: 12,
    day: 25,
    isOptional: false,
    description: "The office is closed.",
  },
];

// ---------------------------------------------------------------------------
// The salaries
// ---------------------------------------------------------------------------

// The gross and the net are written out by hand here and never counted, in
// exactly the way the salary form works: the person filling it in decides the
// three numbers.
interface SalaryPlan {
  employee: string;
  basicSalary: number;
  grossSalary: number;
  netSalary: number;
  allowances: { name: string; amount: number; description: string }[];
}

const SALARIES: SalaryPlan[] = [
  {
    employee: "ayesha",
    basicSalary: 180000,
    grossSalary: 232000,
    netSalary: 214000,
    allowances: [
      { name: "House Rent", amount: 36000, description: "20% of basic" },
      { name: "Fuel", amount: 12000, description: "Monthly fuel card" },
      { name: "Medical", amount: 4000, description: "Health cover" },
    ],
  },
  {
    employee: "bilal",
    basicSalary: 95000,
    grossSalary: 118000,
    netSalary: 110000,
    allowances: [
      { name: "House Rent", amount: 19000, description: "20% of basic" },
      { name: "Medical", amount: 4000, description: "Health cover" },
    ],
  },
  {
    employee: "hina",
    basicSalary: 105000,
    grossSalary: 130000,
    netSalary: 121000,
    allowances: [
      { name: "House Rent", amount: 21000, description: "20% of basic" },
      { name: "Medical", amount: 4000, description: "Health cover" },
    ],
  },
  {
    employee: "danish",
    basicSalary: 175000,
    grossSalary: 236000,
    netSalary: 217000,
    allowances: [
      { name: "House Rent", amount: 35000, description: "20% of basic" },
      { name: "Fuel", amount: 18000, description: "Client visits" },
      { name: "Mobile", amount: 8000, description: "Company line" },
    ],
  },
  {
    employee: "sana",
    basicSalary: 78000,
    grossSalary: 101000,
    netSalary: 96000,
    allowances: [
      { name: "House Rent", amount: 15000, description: "20% of basic" },
      { name: "Fuel", amount: 8000, description: "Client visits" },
    ],
  },
  {
    employee: "kamran",
    basicSalary: 220000,
    grossSalary: 285000,
    netSalary: 259000,
    allowances: [
      { name: "House Rent", amount: 44000, description: "20% of basic" },
      { name: "Fuel", amount: 15000, description: "Monthly fuel card" },
      { name: "Medical", amount: 6000, description: "Family cover" },
    ],
  },
  {
    employee: "zainab",
    basicSalary: 62000,
    grossSalary: 76000,
    netSalary: 73000,
    allowances: [
      { name: "House Rent", amount: 12000, description: "20% of basic" },
      { name: "Medical", amount: 2000, description: "Health cover" },
    ],
  },
  {
    employee: "imran",
    basicSalary: 140000,
    grossSalary: 178000,
    netSalary: 165000,
    allowances: [
      { name: "House Rent", amount: 28000, description: "20% of basic" },
      { name: "Medical", amount: 5000, description: "Family cover" },
      { name: "Mobile", amount: 5000, description: "Company line" },
    ],
  },
  {
    employee: "maryam",
    basicSalary: 85000,
    grossSalary: 105000,
    netSalary: 99000,
    allowances: [
      { name: "House Rent", amount: 17000, description: "20% of basic" },
      { name: "Medical", amount: 3000, description: "Health cover" },
    ],
  },
  {
    employee: "usman",
    basicSalary: 98000,
    grossSalary: 122000,
    netSalary: 114000,
    allowances: [
      { name: "House Rent", amount: 19600, description: "20% of basic" },
      { name: "Medical", amount: 4400, description: "Health cover" },
    ],
  },
  {
    employee: "tariq",
    basicSalary: 55000,
    grossSalary: 68000,
    netSalary: 65000,
    allowances: [
      { name: "House Rent", amount: 11000, description: "20% of basic" },
      { name: "Mobile", amount: 2000, description: "Data package" },
    ],
  },
  {
    employee: "farhan",
    basicSalary: 45000,
    grossSalary: 55000,
    netSalary: 53000,
    allowances: [
      { name: "House Rent", amount: 9000, description: "20% of basic" },
      { name: "Mobile", amount: 1000, description: "Data package" },
    ],
  },
];

// ---------------------------------------------------------------------------
// The leave requests
// ---------------------------------------------------------------------------

// What finally happened to the request. It is written as a word of its own
// instead of as a status, because "partial" needs one more thing - the days
// the approver did NOT tick - and that reads better next to the word.
type LeaveOutcome =
  | "pending"
  | "approved"
  | "partial"
  | "rejected"
  | "cancelled";

interface LeavePlan {
  employee: string;
  leaveType: string;
  // Where the leave starts, counted in WORKING days from today: -9 is nine
  // working days ago, 4 is four working days from now.
  startWorkingDay: number;
  // How many working days the leave covers. A weekend inside the period is
  // extra: five working days from a Thursday run to the Wednesday after.
  workingDays: number;
  reason: string;
  outcome: LeaveOutcome;
  // The team lead who wrote a recommendation before the decision. Leave it
  // empty when nobody did.
  lead: string;
  leadNote: string;
  // Did the lead write for the leave, or against it?
  leadIsFor: boolean;
  // Who made the final decision. Empty means the organization account did.
  approver: string;
  reviewRemarks: string;
  // Only used by "partial": how many of the LAST days of the leave the
  // approver did not tick. 2 on a five day leave approves the first three.
  notApprovedFromEnd: number;
}

const LEAVES: LeavePlan[] = [
  // --- Still waiting for an answer ---
  {
    employee: "bilal",
    leaveType: "Casual Leave",
    startWorkingDay: 4,
    workingDays: 3,
    reason: "My sister is getting married and I have to travel to Multan.",
    outcome: "pending",
    lead: "ayesha",
    leadNote: "Fine by me, his ledgers are closed until the 20th.",
    leadIsFor: true,
    approver: "",
    reviewRemarks: "",
    notApprovedFromEnd: 0,
  },
  {
    employee: "sana",
    leaveType: "Sick Leave",
    startWorkingDay: -1,
    workingDays: 3,
    reason: "High fever since yesterday, the doctor asked me to rest.",
    outcome: "pending",
    lead: "",
    leadNote: "",
    leadIsFor: true,
    approver: "",
    reviewRemarks: "",
    notApprovedFromEnd: 0,
  },
  {
    employee: "farhan",
    leaveType: "Annual Leave",
    startWorkingDay: 14,
    workingDays: 5,
    reason: "Family trip to Naran that we booked in June.",
    outcome: "pending",
    lead: "tariq",
    leadNote: "The October posts are already written, so we are covered.",
    leadIsFor: true,
    approver: "",
    reviewRemarks: "",
    notApprovedFromEnd: 0,
  },

  // --- Approved ---
  {
    employee: "hina",
    leaveType: "Annual Leave",
    startWorkingDay: -9,
    workingDays: 5,
    reason: "Yearly holidays, going to my parents in Sialkot.",
    outcome: "approved",
    lead: "ayesha",
    leadNote: "Approved from my side, Bilal covered her reports.",
    leadIsFor: true,
    approver: "imran",
    reviewRemarks: "Enjoy the break.",
    notApprovedFromEnd: 0,
  },
  {
    employee: "zainab",
    leaveType: "Casual Leave",
    startWorkingDay: -14,
    workingDays: 2,
    reason: "House shifting, I need two days to move.",
    outcome: "approved",
    lead: "kamran",
    leadNote: "No closing in those days, go ahead.",
    leadIsFor: true,
    approver: "imran",
    reviewRemarks: "Approved.",
    notApprovedFromEnd: 0,
  },
  {
    employee: "danish",
    leaveType: "Annual Leave",
    startWorkingDay: 20,
    workingDays: 5,
    reason: "Umrah with my parents, the tickets are already booked.",
    outcome: "approved",
    lead: "",
    leadNote: "",
    leadIsFor: true,
    approver: "",
    reviewRemarks: "Approved by the organization, Sana takes the pipeline.",
    notApprovedFromEnd: 0,
  },

  // --- Partly approved ---
  {
    employee: "tariq",
    leaveType: "Unpaid Leave",
    startWorkingDay: -4,
    workingDays: 5,
    reason: "Personal work at home, my paid balance is finished.",
    outcome: "partial",
    lead: "",
    leadNote: "",
    leadIsFor: true,
    approver: "imran",
    reviewRemarks:
      "Three days only. The campaign shoot on the last two days needs you here.",
    // The last two working days of the leave were not ticked.
    notApprovedFromEnd: 2,
  },

  // --- Rejected ---
  {
    employee: "maryam",
    leaveType: "Casual Leave",
    startWorkingDay: -8,
    workingDays: 2,
    reason: "Two days off, nothing urgent.",
    outcome: "rejected",
    lead: "imran",
    leadNote:
      "Not those two days, the joining of the three new people is then.",
    leadIsFor: false,
    approver: "",
    reviewRemarks: "Please ask again for the last week of the month.",
    notApprovedFromEnd: 0,
  },

  // --- Taken back by the employee ---
  {
    employee: "usman",
    leaveType: "Sick Leave",
    startWorkingDay: -3,
    workingDays: 2,
    reason: "Stomach infection.",
    outcome: "cancelled",
    lead: "",
    leadNote: "",
    leadIsFor: true,
    approver: "",
    reviewRemarks: "",
    notApprovedFromEnd: 0,
  },
];

// ---------------------------------------------------------------------------
// The tasks
// ---------------------------------------------------------------------------

// One hand-over of a task: the person who takes it over, the person who moved
// it, why it moved, and how many days ago that was.
interface HandoverPlan {
  to: string;
  // The employee who moved the task. Empty means the organization did.
  by: string;
  reason: string;
  daysAgo: number;
}

// One message written under a task.
interface CommentPlan {
  // The employee who wrote it. Empty means the organization account did.
  by: string;
  message: string;
  daysAgo: number;
}

interface TaskPlan {
  title: string;
  description: string;
  // The employee who got the task FIRST. When there are hand-overs below, the
  // task is not with this person any more.
  assignee: string;
  // Who created the task. Empty means the organization account did.
  createdBy: string;
  status: TaskStatus;
  priority: TaskPriority;
  // Days from today. null means the task has no such date at all.
  startDays: number | null;
  dueDays: number | null;
  completedDays: number | null;
  estimatedHours: number;
  tags: string[];
  remarks: string;
  handovers: HandoverPlan[];
  comments: CommentPlan[];
}

const TASKS: TaskPlan[] = [
  // ------------------------------------------------------------------
  // To do
  // ------------------------------------------------------------------
  {
    title: "Close the August client ledgers",
    description:
      "Match every invoice of August with its payment and close the month.",
    assignee: "bilal",
    createdBy: "ayesha",
    status: "todo",
    priority: "urgent",
    startDays: -4,
    dueDays: -2,
    completedDays: null,
    estimatedHours: 10,
    tags: [SEED_TAG, "accounts", "month-end"],
    remarks: "",
    handovers: [],
    comments: [
      {
        by: "ayesha",
        message: "This is already two days late. Where are we on it?",
        daysAgo: 1,
      },
      {
        by: "bilal",
        message: "Three client files are still missing their bank slips.",
        daysAgo: 1,
      },
    ],
  },
  {
    title: "Send the September quotation to Ali Traders",
    description:
      "Take the rates from the last order and send the quotation by email.",
    assignee: "sana",
    createdBy: "danish",
    status: "todo",
    priority: "high",
    startDays: 0,
    dueDays: 0,
    completedDays: null,
    estimatedHours: 3,
    tags: [SEED_TAG, "sales", "client"],
    remarks: "",
    handovers: [],
    comments: [],
  },
  {
    title: "Plan the October content calendar",
    description:
      "One post per working day: four product posts, the rest company news.",
    assignee: "farhan",
    createdBy: "tariq",
    status: "todo",
    priority: "medium",
    startDays: 1,
    dueDays: 6,
    completedDays: null,
    estimatedHours: 8,
    tags: [SEED_TAG, "social-media", "planning"],
    remarks: "",
    handovers: [],
    comments: [],
  },
  {
    title: "Read up on the new tax slabs",
    description:
      "Find out what changes for our payroll under the new finance act.",
    assignee: "zainab",
    createdBy: "",
    status: "todo",
    priority: "low",
    startDays: null,
    dueDays: null,
    completedDays: null,
    estimatedHours: 5,
    tags: [SEED_TAG, "finance", "research"],
    remarks: "",
    handovers: [],
    comments: [],
  },

  // ------------------------------------------------------------------
  // In progress
  // ------------------------------------------------------------------
  {
    title: "Chase the overdue payment of Rehman Brothers",
    description:
      "The cheque bounced twice. Call them, agree a date, put it in writing.",
    assignee: "zainab",
    createdBy: "kamran",
    status: "in_progress",
    priority: "urgent",
    startDays: -5,
    dueDays: -1,
    completedDays: null,
    estimatedHours: 6,
    tags: [SEED_TAG, "finance", "recovery"],
    remarks: "They asked for one more week, I said Friday.",
    handovers: [],
    comments: [
      {
        by: "kamran",
        message: "Do not agree to anything after the 15th.",
        daysAgo: 3,
      },
      {
        by: "zainab",
        message: "Understood. They are sending a new cheque on Friday.",
        daysAgo: 2,
      },
      {
        by: "",
        message: "Keep the mail of that promise on the task, please.",
        daysAgo: 1,
      },
    ],
  },
  {
    title: "Onboard the three people joining on the 15th",
    description:
      "Contracts, laptops, email accounts and the first-day plan for all three.",
    assignee: "maryam",
    createdBy: "imran",
    status: "in_progress",
    priority: "high",
    startDays: -3,
    dueDays: 4,
    completedDays: null,
    estimatedHours: 14,
    tags: [SEED_TAG, "hr", "onboarding"],
    remarks: "Two contracts are signed, the third one is with legal.",
    handovers: [],
    comments: [
      {
        by: "imran",
        message: "Laptops are ordered, they arrive on the 12th.",
        daysAgo: 2,
      },
    ],
  },
  {
    title: "Rebuild the receivables report",
    description:
      "The old sheet breaks every month. Rebuild it so it reads from the ledger.",
    assignee: "hina",
    createdBy: "ayesha",
    status: "in_progress",
    priority: "high",
    startDays: -9,
    dueDays: 3,
    completedDays: null,
    estimatedHours: 20,
    tags: [SEED_TAG, "accounts", "reporting"],
    remarks: "Back on it after the leave, the layout is done.",
    handovers: [],
    comments: [
      {
        by: "hina",
        message: "I am back from leave, picking this up again today.",
        daysAgo: 7,
      },
    ],
  },
  {
    title: "Shoot the Eid campaign photos",
    description:
      "Ten product photos with the new backdrop, edited and cropped.",
    assignee: "tariq",
    createdBy: "",
    status: "in_progress",
    priority: "medium",
    startDays: -2,
    dueDays: 5,
    completedDays: null,
    estimatedHours: 12,
    tags: [SEED_TAG, "social-media", "campaign"],
    remarks: "Six of the ten are shot.",
    handovers: [],
    comments: [],
  },

  // ------------------------------------------------------------------
  // In review
  // ------------------------------------------------------------------
  {
    title: "Salary sheet of August",
    description:
      "Work out the August salaries with the allowances and the unpaid days.",
    assignee: "zainab",
    createdBy: "kamran",
    status: "in_review",
    priority: "urgent",
    startDays: -8,
    dueDays: -3,
    completedDays: null,
    estimatedHours: 9,
    tags: [SEED_TAG, "finance", "payroll"],
    remarks: "Sent to Kamran for checking.",
    handovers: [],
    comments: [
      {
        by: "kamran",
        message: "Checking it now. The unpaid days of Tariq look wrong.",
        daysAgo: 1,
      },
    ],
  },
  {
    title: "New employee handbook",
    description:
      "One document with the leave rules, the timings and the code of conduct.",
    assignee: "usman",
    createdBy: "imran",
    status: "in_review",
    priority: "medium",
    startDays: -18,
    dueDays: 2,
    completedDays: null,
    estimatedHours: 16,
    tags: [SEED_TAG, "hr", "policy"],
    remarks: "First draft is with Imran.",
    handovers: [],
    comments: [],
  },
  {
    title: "Vendor agreement with Sharif Packaging",
    description: "Read the draft they sent and mark what has to change.",
    assignee: "kamran",
    createdBy: "",
    status: "in_review",
    priority: "high",
    startDays: -6,
    dueDays: 1,
    completedDays: null,
    estimatedHours: 4,
    tags: [SEED_TAG, "finance", "contract"],
    remarks: "",
    handovers: [],
    comments: [],
  },

  // ------------------------------------------------------------------
  // Completed
  // ------------------------------------------------------------------
  {
    title: "Bank reconciliation of July",
    description: "Match the bank statement of July with our own book.",
    assignee: "bilal",
    createdBy: "ayesha",
    status: "completed",
    priority: "high",
    startDays: -22,
    dueDays: -16,
    completedDays: -17,
    estimatedHours: 12,
    tags: [SEED_TAG, "accounts", "month-end"],
    remarks: "Done, two entries were doubled and are corrected.",
    handovers: [],
    comments: [
      {
        by: "ayesha",
        message: "Checked and closed. Good catch on the double entries.",
        daysAgo: 16,
      },
    ],
  },
  {
    title: "Independence Day post",
    description: "One post for the 14th, in both English and Urdu.",
    assignee: "farhan",
    createdBy: "tariq",
    status: "completed",
    priority: "medium",
    startDays: -25,
    dueDays: -21,
    completedDays: -21,
    estimatedHours: 4,
    tags: [SEED_TAG, "social-media", "campaign"],
    remarks: "Published on time.",
    handovers: [],
    comments: [],
  },
  {
    title: "Order the new office chairs",
    description: "Twelve chairs, compare three vendors before ordering.",
    assignee: "usman",
    createdBy: "",
    status: "completed",
    priority: "low",
    startDays: -11,
    dueDays: -5,
    completedDays: -6,
    estimatedHours: 3,
    tags: [SEED_TAG, "hr", "admin"],
    remarks: "Ordered from Interwood, delivery next Monday.",
    handovers: [],
    comments: [],
  },
  {
    title: "Collect the feedback of the client survey",
    description: "Read the 40 answers and write the three things to fix first.",
    assignee: "sana",
    createdBy: "danish",
    status: "completed",
    priority: "medium",
    startDays: -19,
    dueDays: -12,
    completedDays: -11,
    estimatedHours: 7,
    tags: [SEED_TAG, "sales", "research"],
    remarks: "Finished a day late, the last five answers came in slowly.",
    handovers: [],
    comments: [],
  },

  // ------------------------------------------------------------------
  // Cancelled
  // ------------------------------------------------------------------
  {
    title: "Print the new company brochure",
    description: "Five hundred copies of the brochure for the trade fair.",
    assignee: "tariq",
    createdBy: "",
    status: "cancelled",
    priority: "medium",
    startDays: -15,
    dueDays: 8,
    completedDays: null,
    estimatedHours: 6,
    tags: [SEED_TAG, "social-media", "print"],
    remarks: "Cancelled, the trade fair was moved to next year.",
    handovers: [],
    comments: [],
  },

  // ------------------------------------------------------------------
  // The tasks that were HANDED OVER to somebody else
  // ------------------------------------------------------------------
  {
    title: "Recover the outstanding of Malik Enterprises",
    description:
      "Two invoices of June are still open. Follow them until the money is in.",
    // Sana had it first, then it went to Zainab, and Zainab passed it on to
    // Kamran, so this one has three lines in its timeline.
    assignee: "sana",
    createdBy: "danish",
    status: "in_progress",
    priority: "urgent",
    startDays: -20,
    dueDays: 2,
    completedDays: null,
    estimatedHours: 10,
    tags: [SEED_TAG, "finance", "recovery"],
    remarks: "Taking it up with their finance head directly.",
    handovers: [
      {
        to: "zainab",
        by: "danish",
        reason: "This is a recovery case now, it belongs with Finance.",
        daysAgo: 12,
      },
      {
        to: "kamran",
        by: "kamran",
        reason: "Their finance head only talks to me, I will handle it myself.",
        daysAgo: 4,
      },
    ],
    comments: [
      {
        by: "sana",
        message: "They stopped answering my calls, handing this over.",
        daysAgo: 13,
      },
      {
        by: "zainab",
        message: "Sent two reminders, no reply on either.",
        daysAgo: 6,
      },
      {
        by: "kamran",
        message: "Meeting with them on Thursday. I will close this myself.",
        daysAgo: 3,
      },
    ],
  },
  {
    title: "Fix the wrong totals on the sales dashboard",
    description:
      "The monthly total counts the cancelled orders too. Find it and fix it.",
    assignee: "bilal",
    createdBy: "ayesha",
    status: "in_review",
    priority: "high",
    startDays: -10,
    dueDays: 1,
    completedDays: null,
    estimatedHours: 8,
    tags: [SEED_TAG, "accounts", "bug"],
    remarks: "Fixed and sent for checking.",
    handovers: [
      {
        to: "hina",
        by: "ayesha",
        reason: "Bilal is on the month-end. Hina knows this report best.",
        daysAgo: 5,
      },
    ],
    comments: [
      {
        by: "hina",
        message: "Found it: the filter missed the cancelled status.",
        daysAgo: 2,
      },
    ],
  },
  {
    title: "Answer the audit questions of the tax office",
    description:
      "Seven questions on the returns of last year, with the papers behind them.",
    assignee: "zainab",
    createdBy: "kamran",
    status: "todo",
    priority: "urgent",
    startDays: -2,
    dueDays: 3,
    completedDays: null,
    estimatedHours: 12,
    tags: [SEED_TAG, "finance", "audit"],
    remarks: "",
    handovers: [
      {
        to: "kamran",
        by: "",
        reason: "An audit answer goes out over the head of finance.",
        daysAgo: 1,
      },
    ],
    comments: [],
  },
  {
    title: "Set up the new joiners in the attendance system",
    description: "Cards, timings and the first month of the roster.",
    assignee: "usman",
    createdBy: "imran",
    status: "completed",
    priority: "medium",
    startDays: -16,
    dueDays: -9,
    completedDays: -10,
    estimatedHours: 5,
    tags: [SEED_TAG, "hr", "onboarding"],
    remarks: "All three are in the system.",
    handovers: [
      {
        to: "maryam",
        by: "imran",
        reason: "Usman is on the handbook, Maryam takes the joiners.",
        daysAgo: 14,
      },
    ],
    comments: [],
  },
  {
    title: "Write the case study of the Karachi order",
    description: "One page on how we delivered the big order in ten days.",
    assignee: "sana",
    createdBy: "danish",
    status: "in_progress",
    priority: "low",
    startDays: -7,
    dueDays: 10,
    completedDays: null,
    estimatedHours: 6,
    tags: [SEED_TAG, "sales", "content"],
    remarks: "Writing it up from the numbers Sana handed over.",
    handovers: [
      {
        to: "farhan",
        by: "danish",
        reason: "The writing part is better done by the content team.",
        daysAgo: 3,
      },
    ],
    comments: [
      {
        by: "farhan",
        message: "Got the numbers from Sana, writing it up now.",
        daysAgo: 2,
      },
    ],
  },
  {
    title: "Renew the office insurance",
    description: "The policy runs out this month. Get three offers and renew.",
    assignee: "maryam",
    createdBy: "",
    status: "todo",
    priority: "high",
    startDays: -1,
    dueDays: 7,
    completedDays: null,
    estimatedHours: 4,
    tags: [SEED_TAG, "hr", "admin"],
    remarks: "",
    handovers: [
      {
        to: "usman",
        by: "imran",
        reason: "Maryam has the joiners this week.",
        daysAgo: 0,
      },
    ],
    comments: [],
  },
];

// ---------------------------------------------------------------------------
// The meetings
// ---------------------------------------------------------------------------

interface MeetingPlan {
  title: string;
  agenda: string;
  // Days from today, and the time of day it starts.
  startDays: number;
  hour: number;
  minute: number;
  durationMinutes: number;
  location: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  // The employee who set it up. Empty means the organization account did.
  organizer: string;
  // The invited people, and what they answered.
  attendees: { employee: string; response: AttendeeResponse; note: string }[];
  notes: string;
  actionItems: { text: string; done: boolean }[];
  // The note written on the last status change.
  statusNote: string;
}

const MEETINGS: MeetingPlan[] = [
  {
    title: "August closing review",
    agenda:
      "Walk through the August numbers, the open ledgers and the recovery cases.",
    startDays: -9,
    hour: 10,
    minute: 0,
    durationMinutes: 90,
    location: "Meeting Room 1",
    meetingType: "in_person",
    status: "completed",
    organizer: "kamran",
    attendees: [
      { employee: "ayesha", response: "attended", note: "" },
      { employee: "zainab", response: "attended", note: "" },
      { employee: "bilal", response: "declined", note: "On the month-end." },
    ],
    notes:
      "August closed with three open ledgers. Rehman Brothers stays the biggest risk.",
    actionItems: [
      { text: "Rebuild the receivables report", done: false },
      { text: "Write to Rehman Brothers in writing", done: true },
      { text: "Move the salary sheet to the 25th", done: true },
    ],
    statusNote: "Finished on time.",
  },
  {
    title: "Q4 sales plan",
    agenda: "Targets per client, the pipeline, and who covers which region.",
    startDays: -4,
    hour: 14,
    minute: 30,
    durationMinutes: 60,
    location: "https://meet.google.com/alpha-q4-plan",
    meetingType: "online",
    status: "completed",
    organizer: "danish",
    attendees: [
      { employee: "sana", response: "attended", note: "" },
      { employee: "kamran", response: "attended", note: "" },
      { employee: "tariq", response: "accepted", note: "Joined late." },
    ],
    notes: "Target for Q4 agreed. Sana takes the north, Danish the south.",
    actionItems: [
      { text: "Send the quotation to Ali Traders", done: false },
      { text: "Write the case study of the Karachi order", done: false },
      { text: "Share the client list with the content team", done: true },
    ],
    statusNote: "Done.",
  },
  {
    title: "Weekly HR stand-up",
    agenda: "Joiners, the leaves waiting for an answer, and the handbook draft.",
    startDays: 0,
    hour: 9,
    minute: 30,
    durationMinutes: 30,
    location: "Meeting Room 2",
    meetingType: "in_person",
    status: "in_progress",
    organizer: "imran",
    attendees: [
      { employee: "maryam", response: "accepted", note: "" },
      { employee: "usman", response: "accepted", note: "" },
    ],
    notes: "",
    actionItems: [
      { text: "Answer the three waiting leave requests", done: false },
      { text: "Close the handbook review", done: false },
      { text: "Confirm the chair delivery for Monday", done: false },
    ],
    statusNote: "Started.",
  },
  {
    title: "Onboarding briefing for the 15th",
    agenda: "First-day plan, seats, laptops and who takes which new joiner.",
    startDays: 3,
    hour: 11,
    minute: 0,
    durationMinutes: 45,
    location: "Meeting Room 1",
    meetingType: "in_person",
    status: "scheduled",
    organizer: "imran",
    attendees: [
      { employee: "maryam", response: "accepted", note: "" },
      { employee: "usman", response: "invited", note: "" },
      { employee: "ayesha", response: "accepted", note: "" },
      {
        employee: "danish",
        response: "declined",
        note: "Client visit that day.",
      },
    ],
    notes: "",
    actionItems: [],
    statusNote: "Scheduled.",
  },
  {
    title: "Content review: October calendar",
    agenda: "Go through the October posts and pick the four product days.",
    startDays: 5,
    hour: 15,
    minute: 0,
    durationMinutes: 60,
    location: "https://meet.google.com/alpha-content-oct",
    meetingType: "online",
    status: "scheduled",
    organizer: "tariq",
    attendees: [
      { employee: "farhan", response: "accepted", note: "" },
      { employee: "sana", response: "invited", note: "" },
    ],
    notes: "",
    actionItems: [],
    statusNote: "Scheduled.",
  },
  {
    title: "Trade fair preparation",
    agenda: "The stall, the brochure, and who travels to the fair.",
    startDays: 7,
    hour: 12,
    minute: 0,
    durationMinutes: 60,
    location: "Meeting Room 1",
    meetingType: "in_person",
    status: "cancelled",
    organizer: "",
    attendees: [
      { employee: "danish", response: "accepted", note: "" },
      { employee: "tariq", response: "invited", note: "" },
      { employee: "sana", response: "invited", note: "" },
    ],
    notes: "",
    actionItems: [],
    statusNote: "Cancelled: the fair was moved to next year.",
  },
];

// ---------------------------------------------------------------------------
// A few lines for the bell
// ---------------------------------------------------------------------------

// The bell fills itself while people work, so this only puts a handful of
// lines there for the people this seed gave something to. Every title starts
// with "[seed] ", which is how a second run finds them again.
const NOTIFICATION_TITLE_MARK = "[seed] ";

interface NotificationPlan {
  employee: string;
  type: "assigned" | "reviewed" | "created";
  module: string;
  title: string;
  message: string;
  actor: string;
  link: string;
  daysAgo: number;
}

const NOTIFICATIONS: NotificationPlan[] = [
  {
    employee: "kamran",
    type: "assigned",
    module: "tasks",
    title: NOTIFICATION_TITLE_MARK + "Task reassigned to you",
    message:
      'The task "Recover the outstanding of Malik Enterprises" was moved to you',
    actor: "kamran",
    link: "/employee/my-tasks",
    daysAgo: 4,
  },
  {
    employee: "usman",
    type: "assigned",
    module: "tasks",
    title: NOTIFICATION_TITLE_MARK + "Task reassigned to you",
    message: 'The task "Renew the office insurance" was moved to you',
    actor: "imran",
    link: "/employee/my-tasks",
    daysAgo: 0,
  },
  {
    employee: "hina",
    type: "reviewed",
    module: "leaves",
    title: NOTIFICATION_TITLE_MARK + "Leave approved",
    message: "Your annual leave was approved",
    actor: "imran",
    link: "/employee/my-leaves",
    daysAgo: 15,
  },
  {
    employee: "tariq",
    type: "reviewed",
    module: "leaves",
    title: NOTIFICATION_TITLE_MARK + "Leave partly approved",
    message: "Only some of the days you asked for were approved",
    actor: "imran",
    link: "/employee/my-leaves",
    daysAgo: 8,
  },
  {
    employee: "imran",
    type: "created",
    module: "leaves",
    title: NOTIFICATION_TITLE_MARK + "New leave request",
    message: "Bilal Ahmed asked for casual leave",
    actor: "bilal",
    link: "/employee/leaves",
    daysAgo: 2,
  },
  {
    employee: "farhan",
    type: "assigned",
    module: "meetings",
    title: NOTIFICATION_TITLE_MARK + "You are invited to a meeting",
    message: 'You were invited to "Content review: October calendar"',
    actor: "tariq",
    link: "/employee/my-meetings",
    daysAgo: 1,
  },
];

// ---------------------------------------------------------------------------
// The seed itself
// ---------------------------------------------------------------------------

async function seedAlpha() {
  await connectDatabase();

  // -------------------------------------------------------------------
  // 1) The organization
  // -------------------------------------------------------------------
  //
  // We look for the one whose name says "alpha". When there is none we take
  // the first organization of the database, so the script still runs on a
  // workspace where the company is called something else.
  const alphaOrganization = await Organization.findOne({
    name: { $regex: "alpha", $options: "i" },
  });

  const organization = alphaOrganization
    ? alphaOrganization
    : await Organization.findOne();

  if (!organization) {
    console.log(
      "No organization found. Create an organization first, then run this seed."
    );
    await mongoose.disconnect();
    return;
  }

  const orgId = organization._id as mongoose.Types.ObjectId;
  const orgIdText = String(orgId);

  console.log("Seeding organization:", organization.name);

  // -------------------------------------------------------------------
  // 2) The people and the departments that are already there
  // -------------------------------------------------------------------
  //
  // Every employee is found again by the first part of their email, so
  // "ayesha@gmail.com" is the person the plans above call "ayesha".
  const employees = await Employee.find({
    organization: orgId,
    status: "active",
  });

  const employeeByKey = new Map<string, (typeof employees)[number]>();

  for (const employee of employees) {
    const key = employee.email.split("@")[0].toLowerCase();
    employeeByKey.set(key, employee);
  }

  const departments = await Department.find({
    organization: orgId,
    status: "active",
  });

  const departmentByName = new Map<string, (typeof departments)[number]>();

  for (const department of departments) {
    departmentByName.set(department.name.toLowerCase(), department);
  }

  console.log("People found       :", employees.length);
  console.log("Departments found  :", departments.length);
  console.log("");

  // The employee behind a key, or null when this workspace does not have that
  // person. Every block below skips the lines it cannot fill, so the seed
  // still runs on an organization with other people in it.
  function personOf(key: string) {
    const found = employeeByKey.get(key);
    return found ? found : null;
  }

  function idOf(key: string) {
    const person = personOf(key);
    return person ? (person._id as mongoose.Types.ObjectId) : null;
  }

  // -------------------------------------------------------------------
  // 3) Remove what a previous run of this seed made
  // -------------------------------------------------------------------
  //
  // The tasks are found again by their tag, the teams, leave types, holidays
  // and meetings by their name, and the HR rows by the people they belong to.
  const seedEmployeeIds = employees.map(
    (employee) => employee._id as mongoose.Types.ObjectId
  );

  const oldTasks = await Task.find({
    organization: orgId,
    tags: SEED_TAG,
  }).select("_id");

  await TaskComment.deleteMany({
    task: { $in: oldTasks.map((task) => task._id) },
  });

  await Task.deleteMany({ organization: orgId, tags: SEED_TAG });

  await Team.deleteMany({
    organization: orgId,
    name: { $in: TEAMS.map((team) => team.name) },
  });

  await Meeting.deleteMany({
    organization: orgId,
    title: { $in: MEETINGS.map((meeting) => meeting.title) },
  });

  await Holiday.deleteMany({
    organization: orgId,
    name: { $in: HOLIDAYS.map((holiday) => holiday.name) },
  });

  // The leave rows go before the leave types, because a request points at the
  // type it was asked under.
  await LeaveRequest.deleteMany({
    organization: orgId,
    employee: { $in: seedEmployeeIds },
  });

  await LeaveBalance.deleteMany({
    organization: orgId,
    employee: { $in: seedEmployeeIds },
  });

  await LeaveType.deleteMany({
    organization: orgId,
    name: { $in: LEAVE_TYPES.map((leaveType) => leaveType.name) },
  });

  // Only the days this seed writes are removed, so an older month somebody
  // typed in by hand stays where it is.
  await Attendance.deleteMany({
    organization: orgId,
    employee: { $in: seedEmployeeIds },
    date: { $gte: dayFromNow(-ATTENDANCE_DAYS) },
  });

  await Salary.deleteMany({
    organization: orgId,
    employee: { $in: seedEmployeeIds },
  });

  await Notification.deleteMany({
    organization: orgId,
    title: { $in: NOTIFICATIONS.map((line) => line.title) },
  });

  console.log("Old seed data removed.");
  console.log("");

  // -------------------------------------------------------------------
  // 4) The teams
  // -------------------------------------------------------------------
  let teamCount = 0;

  for (const plan of TEAMS) {
    const department = departmentByName.get(plan.department.toLowerCase());
    const leadId = idOf(plan.lead);

    if (!department || !leadId) {
      console.log("Skipped team:", plan.name);
      continue;
    }

    // A member this workspace does not have is simply left out.
    const memberIds: mongoose.Types.ObjectId[] = [];

    for (const memberKey of plan.members) {
      const memberId = idOf(memberKey);

      if (memberId) {
        memberIds.push(memberId);
      }
    }

    await Team.create({
      name: plan.name,
      description: plan.description,
      organization: orgId,
      department: department._id,
      teamLead: leadId,
      members: memberIds,
      status: "active",
    });

    teamCount = teamCount + 1;
  }

  console.log("Teams          :", teamCount);

  // -------------------------------------------------------------------
  // 5) The holidays
  // -------------------------------------------------------------------
  //
  // One organization cannot have two holidays on the same day, so a day that
  // is already taken by a holiday of your own is left alone.
  let holidayCount = 0;

  for (const plan of HOLIDAYS) {
    const date = dayOfThisYear(plan.month, plan.day);

    const taken = await Holiday.findOne({ organization: orgId, date: date });

    if (taken) {
      continue;
    }

    await Holiday.create({
      name: plan.name,
      organization: orgId,
      date: date,
      isOptional: plan.isOptional,
      description: plan.description,
    });

    holidayCount = holidayCount + 1;
  }

  console.log("Holidays       :", holidayCount);

  // -------------------------------------------------------------------
  // 6) The leave types
  // -------------------------------------------------------------------
  const leaveTypeByName = new Map<
    string,
    mongoose.HydratedDocument<LeaveTypeDocument>
  >();

  for (const plan of LEAVE_TYPES) {
    const leaveType = await LeaveType.create({
      name: plan.name,
      organization: orgId,
      daysPerYear: plan.daysPerYear,
      isPaid: plan.isPaid,
      excludeHolidays: plan.excludeHolidays,
      allowDocuments: plan.allowDocuments,
      documentRequirement: plan.documentRequirement,
      description: plan.description,
      status: "active",
    });

    leaveTypeByName.set(plan.name, leaveType);
  }

  console.log("Leave types    :", leaveTypeByName.size);

  // -------------------------------------------------------------------
  // 7) The leave balances
  // -------------------------------------------------------------------
  //
  // One row per employee per leave type for this year, starting at zero used
  // days. The approved leaves below then add their days to the right row.
  const thisYear = new Date().getUTCFullYear();

  // The key is "employeeId|leaveTypeId", so a leave can find its own row back
  // without asking the database again.
  const balanceByKey = new Map<
    string,
    mongoose.HydratedDocument<LeaveBalanceDocument>
  >();

  for (const employee of employees) {
    for (const plan of LEAVE_TYPES) {
      const leaveType = leaveTypeByName.get(plan.name);

      if (!leaveType) {
        continue;
      }

      const balance = await LeaveBalance.create({
        organization: orgId,
        employee: employee._id,
        leaveType: leaveType._id,
        year: thisYear,
        allocated: plan.daysPerYear,
        used: 0,
      });

      balanceByKey.set(
        String(employee._id) + "|" + String(leaveType._id),
        balance
      );
    }
  }

  console.log("Leave balances :", balanceByKey.size, "rows");

  // -------------------------------------------------------------------
  // 8) The leave requests
  // -------------------------------------------------------------------
  //
  // The day by day plan is built by the very same function the real apply and
  // approve routes use, so a seeded leave counts its days exactly like a leave
  // somebody sends in from the screen.
  //
  // The days that end up approved are kept in this map too, because the
  // attendance of step 10 must not write a normal working day on top of them.
  const leaveDaysByEmployee = new Map<string, Set<string>>();

  let leaveCount = 0;

  for (const plan of LEAVES) {
    const employee = personOf(plan.employee);
    const leaveType = leaveTypeByName.get(plan.leaveType);

    if (!employee || !leaveType) {
      console.log("Skipped leave of:", plan.employee);
      continue;
    }

    const employeeIdText = String(employee._id);
    const fromDate = workingDayFromNow(plan.startWorkingDay);
    const toDate = lastWorkingDayOf(fromDate, plan.workingDays);

    // What the employee asked for on the day they applied: every day of the
    // period, minus the weekends and the holidays the type gives back.
    const requestedPlan = await planLeaveDays({
      organizationId: orgIdText,
      employeeId: employeeIdText,
      fromDate: fromDate,
      toDate: toDate,
      excludeHolidays: leaveType.excludeHolidays,
      excludeWeekends: true,
      approvedDates: null,
      useAttendance: false,
    });

    const requestedDays = countApprovedDays(requestedPlan);

    // The day the request was sent: three days before the leave starts, but
    // never a day in the future.
    const appliedAt = momentFromNow(
      Math.min(daysBetweenToday(fromDate) - 3, -1),
      9,
      15
    );

    // The approval trail, oldest line first. It always opens with the employee
    // applying.
    const history: any[] = [
      {
        actorEmployee: employee._id,
        actorName: employee.name,
        actorRole: "Employee",
        action: "applied",
        note: plan.reason,
        days: requestedDays,
        references: [],
        at: appliedAt,
      },
    ];

    // The team lead writes a recommendation the next morning.
    const lead = plan.lead ? personOf(plan.lead) : null;

    if (lead) {
      history.push({
        actorEmployee: lead._id,
        actorName: lead.name,
        actorRole: "Team lead",
        action: plan.leadIsFor ? "recommended" : "not_recommended",
        note: plan.leadNote,
        days: 0,
        references: [],
        at: new Date(appliedAt.getTime() + 20 * 60 * 60 * 1000),
      });
    }

    // Now the decision itself. Which days are really taken depends on the
    // outcome, so we work that out first.
    let status: LeaveRequestStatus = "pending";
    let leaveDays = requestedPlan;
    let approvedDays = 0;
    let totalDays = requestedDays;

    if (plan.outcome === "approved") {
      status = "approved";
      approvedDays = requestedDays;
      totalDays = requestedDays;
    }

    if (plan.outcome === "partial") {
      // The approver went down the list of the days that really count and
      // ticked all of them except the last few, and planLeaveDays turns that
      // choice back into a day list.
      const countableDays = requestedPlan
        .filter((day) => day.status === "approved")
        .map((day) => toDayText(day.date));

      const approvedDates = countableDays.slice(
        0,
        countableDays.length - plan.notApprovedFromEnd
      );

      leaveDays = await planLeaveDays({
        organizationId: orgIdText,
        employeeId: employeeIdText,
        fromDate: fromDate,
        toDate: toDate,
        excludeHolidays: leaveType.excludeHolidays,
        excludeWeekends: true,
        approvedDates: approvedDates,
        useAttendance: false,
      });

      status = "partially_approved";
      approvedDays = countApprovedDays(leaveDays);
      totalDays = approvedDays;
    }

    if (plan.outcome === "rejected") {
      // A rejection says no to every single day that was asked for.
      leaveDays = requestedPlan.map((day) => ({
        date: day.date,
        status: "rejected" as const,
        reason: "Not approved by the approver",
      }));

      status = "rejected";
      approvedDays = 0;
      totalDays = 0;
    }

    if (plan.outcome === "cancelled") {
      status = "cancelled";
      approvedDays = 0;
      totalDays = 0;
    }

    // The line of the decision, written by the approver, or by the employee
    // who took the request back.
    const decidedAt = new Date(appliedAt.getTime() + 30 * 60 * 60 * 1000);

    if (plan.outcome === "cancelled") {
      history.push({
        actorEmployee: employee._id,
        actorName: employee.name,
        actorRole: "Employee",
        action: "cancelled",
        note: "Feeling better, I do not need the days any more.",
        days: 0,
        references: [],
        at: decidedAt,
      });
    } else if (plan.outcome !== "pending") {
      const approver = plan.approver ? personOf(plan.approver) : null;

      history.push({
        actorEmployee: approver ? approver._id : null,
        actorName: approver ? approver.name : organization.name,
        actorRole: approver ? "HR / Approver" : "Organization",
        action: status,
        note: plan.reviewRemarks,
        days: approvedDays,
        references: [],
        at: decidedAt,
      });
    }

    // A request that is still waiting, or that the employee took back, was
    // never decided by anybody, so it has no reviewer and no review date.
    const wasDecided =
      plan.outcome !== "pending" && plan.outcome !== "cancelled";

    await LeaveRequest.create({
      organization: orgId,
      employee: employee._id,
      department: employee.department,
      leaveType: leaveType._id,
      fromDate: fromDate,
      toDate: toDate,
      requestedDays: requestedDays,
      approvedDays: approvedDays,
      totalDays: totalDays,
      leaveDays: leaveDays,
      excludeWeekends: true,
      excludeHolidays: leaveType.excludeHolidays,
      reason: plan.reason,
      documents: [],
      status: status,
      approvalHistory: history,
      reviewedByEmployee:
        wasDecided && plan.approver ? idOf(plan.approver) : null,
      reviewedAt: wasDecided ? decidedAt : null,
      reviewRemarks: wasDecided ? plan.reviewRemarks : "",
    });

    // Approving is the moment the days are really taken from the balance.
    if (approvedDays > 0) {
      const balance = balanceByKey.get(
        String(employee._id) + "|" + String(leaveType._id)
      );

      if (balance) {
        balance.used = balance.used + approvedDays;
        await balance.save();
      }

      // Remember the days, so the attendance below leaves them alone.
      if (!leaveDaysByEmployee.has(employeeIdText)) {
        leaveDaysByEmployee.set(employeeIdText, new Set<string>());
      }

      const takenDays = leaveDaysByEmployee.get(employeeIdText)!;

      for (const day of leaveDays) {
        if (day.status === "approved") {
          takenDays.add(toDayText(day.date));
        }
      }
    }

    leaveCount = leaveCount + 1;
  }

  console.log("Leave requests :", leaveCount);

  // -------------------------------------------------------------------
  // 9) The salaries
  // -------------------------------------------------------------------
  let salaryCount = 0;

  for (const plan of SALARIES) {
    const employeeId = idOf(plan.employee);

    if (!employeeId) {
      continue;
    }

    await Salary.create({
      organization: orgId,
      employee: employeeId,
      salaryType: "monthly",
      basicSalary: plan.basicSalary,
      grossSalary: plan.grossSalary,
      netSalary: plan.netSalary,
      allowances: plan.allowances,
    });

    salaryCount = salaryCount + 1;
  }

  console.log("Salaries       :", salaryCount);

  // -------------------------------------------------------------------
  // 10) The attendance of the last weeks
  // -------------------------------------------------------------------
  //
  // One row per employee per working day. A weekend gets no row at all, a
  // public holiday gets a "holiday" row, and a day the person is on an
  // approved leave is skipped here, because step 11 writes those.
  //
  // The half days and the absences follow a fixed pattern, so two runs of the
  // seed always give the same month and the numbers on the screen do not jump
  // around while you are looking at them.
  const holidaysOfWindow = await Holiday.find({
    organization: orgId,
    date: { $gte: dayFromNow(-ATTENDANCE_DAYS), $lte: dayFromNow(0) },
    isOptional: false,
  });

  const holidayNameByDay = new Map<string, string>();

  for (const holiday of holidaysOfWindow) {
    holidayNameByDay.set(toDayText(holiday.date), holiday.name);
  }

  const attendanceRows: any[] = [];

  for (let personIndex = 0; personIndex < employees.length; personIndex++) {
    const employee = employees[personIndex];
    const takenDays = leaveDaysByEmployee.get(String(employee._id));

    for (let back = ATTENDANCE_DAYS; back >= 0; back--) {
      const day = dayFromNow(-back);
      const dayText = toDayText(day);

      if (isWeekend(day)) {
        continue;
      }

      const holidayName = holidayNameByDay.get(dayText);

      if (holidayName) {
        attendanceRows.push({
          organization: orgId,
          employee: employee._id,
          department: employee.department,
          date: day,
          checkIn: null,
          checkOut: null,
          workedHours: 0,
          status: "holiday" as AttendanceStatus,
          remarks: holidayName,
        });
        continue;
      }

      // The leave of this person already answers this day.
      if (takenDays && takenDays.has(dayText)) {
        continue;
      }

      // The pattern: one day out of thirteen is an absence, one out of seven
      // a half day, and everything else a normal day.
      const step = personIndex * 3 + back;

      let status: AttendanceStatus = "present";

      if (step % 13 === 0) {
        status = "absent";
      } else if (step % 7 === 0) {
        status = "half_day";
      }

      if (status === "absent") {
        attendanceRows.push({
          organization: orgId,
          employee: employee._id,
          department: employee.department,
          date: day,
          checkIn: null,
          checkOut: null,
          workedHours: 0,
          status: status,
          remarks: "Did not come in and did not inform.",
        });
        continue;
      }

      // A check in between 09:00 and 09:50, so the rows do not all look the
      // same, and a check out that follows the kind of day it was.
      //
      // "date" above is the DAY and it is midnight UTC, but these two are real
      // moments with a time on them, so they are built in the timezone of the
      // computer - the same way a real check in is, which is simply the moment
      // the employee pressed the button.
      const startMinute = (personIndex * 7 + back * 5) % 50;

      const checkIn = momentFromNow(-back, 9, startMinute);

      const checkOut =
        status === "half_day"
          ? momentFromNow(-back, 13, startMinute)
          : momentFromNow(-back, 18, startMinute);

      attendanceRows.push({
        organization: orgId,
        employee: employee._id,
        department: employee.department,
        date: day,
        checkIn: checkIn,
        checkOut: checkOut,
        workedHours: hoursBetween(checkIn, checkOut),
        status: status,
        remarks: status === "half_day" ? "Left after lunch." : "",
      });
    }
  }

  await Attendance.insertMany(attendanceRows);

  console.log("Attendance     :", attendanceRows.length, "rows");

  // -------------------------------------------------------------------
  // 11) The attendance of the approved leaves
  // -------------------------------------------------------------------
  //
  // This is the very function the leave routes call, so a day off is marked
  // "on leave" here in exactly the way it would be after a real approval.
  await syncLeaveAttendance(
    orgIdText,
    dayFromNow(-ATTENDANCE_DAYS),
    dayFromNow(ATTENDANCE_DAYS)
  );

  const onLeaveRows = await Attendance.countDocuments({
    organization: orgId,
    status: "on_leave",
  });

  console.log("On leave rows  :", onLeaveRows);

  // -------------------------------------------------------------------
  // 12) The tasks, with their hand-overs
  // -------------------------------------------------------------------
  //
  // The timeline of a task is built here line by line: the first line is the
  // person who got it when the task was created, and every hand-over adds one
  // more. The last line is always the person who has the task right now, and
  // the department of the task follows that same person.
  //
  // The rows are written with insertOne instead of with create(), because the
  // clock rule in the model runs on save() and would open a second work
  // stretch on a task that is already "in progress". Writing the document as
  // it is keeps the stretches exactly the way the plans above describe them.
  let taskCount = 0;
  let handoverCount = 0;
  let commentCount = 0;

  for (const plan of TASKS) {
    const firstPerson = personOf(plan.assignee);

    if (!firstPerson) {
      console.log("Skipped task:", plan.title);
      continue;
    }

    const creatorId = plan.createdBy ? idOf(plan.createdBy) : null;
    const assignerType: TaskAssignerType = creatorId
      ? "manager"
      : "organization";

    // The moment the task was created: its start day, or a week ago when it
    // has no start day at all.
    const createdAt =
      plan.startDays === null
        ? momentFromNow(-7, 10, 0)
        : momentFromNow(plan.startDays, 10, 0);

    const timeline: any[] = [
      {
        employee: firstPerson._id,
        byEmployee: creatorId,
        byType: assignerType,
        reason: "",
        at: createdAt,
      },
    ];

    // Walk through the hand-overs and keep track of who holds the task.
    let holder = firstPerson;

    for (const handover of plan.handovers) {
      const nextPerson = personOf(handover.to);

      if (!nextPerson) {
        continue;
      }

      const moverId = handover.by ? idOf(handover.by) : null;

      timeline.push({
        employee: nextPerson._id,
        byEmployee: moverId,
        byType: moverId ? "manager" : "organization",
        reason: handover.reason,
        at: momentFromNow(-handover.daysAgo, 11, 30),
      });

      holder = nextPerson;
      handoverCount = handoverCount + 1;
    }

    // The stretches of real work. A running task has a stretch that is still
    // open, a task waiting for a review or called off has a closed one, a
    // finished task has the stretch that ended when it was finished, and a
    // task nobody started yet has none at all.
    const workSessions: { startedAt: Date; endedAt: Date | null }[] = [];

    const workStartedAt = momentFromNow(
      plan.startDays === null ? -5 : plan.startDays,
      11,
      0
    );

    if (plan.status === "in_progress") {
      workSessions.push({ startedAt: workStartedAt, endedAt: null });
    }

    if (plan.status === "in_review" || plan.status === "cancelled") {
      workSessions.push({
        startedAt: workStartedAt,
        endedAt: momentFromNow(-1, 16, 0),
      });
    }

    if (plan.status === "completed" && plan.completedDays !== null) {
      workSessions.push({
        startedAt: workStartedAt,
        endedAt: momentFromNow(plan.completedDays, 16, 30),
      });
    }

    const inserted = await Task.collection.insertOne({
      title: plan.title,
      description: plan.description,
      organization: orgId,
      // The department of a task always follows the person who has it now.
      department: holder.department,
      assignedTo: holder._id,
      assignedByType: assignerType,
      assignedByEmployee: creatorId,
      priority: plan.priority,
      status: plan.status,
      startDate: plan.startDays === null ? null : dayFromNow(plan.startDays),
      dueDate: plan.dueDays === null ? null : dayFromNow(plan.dueDays),
      completedAt:
        plan.completedDays === null
          ? null
          : momentFromNow(plan.completedDays, 16, 30),
      estimatedHours: plan.estimatedHours,
      tags: plan.tags,
      remarks: plan.remarks,
      attachments: [],
      assignmentHistory: timeline,
      workSessions: workSessions,
      createdAt: createdAt,
      updatedAt: new Date(),
    });

    const taskId = inserted.insertedId;

    for (const comment of plan.comments) {
      const authorId = comment.by ? idOf(comment.by) : null;
      const writtenAt = momentFromNow(-comment.daysAgo, 14, 0);

      await TaskComment.collection.insertOne({
        task: taskId,
        organization: orgId,
        author: authorId,
        authorType: authorId ? "employee" : "organization",
        message: comment.message,
        attachments: [],
        createdAt: writtenAt,
        updatedAt: writtenAt,
      });

      commentCount = commentCount + 1;
    }

    taskCount = taskCount + 1;
  }

  console.log(
    "Tasks          :",
    taskCount,
    "(" + handoverCount + " hand-overs)"
  );
  console.log("Task comments  :", commentCount);

  // -------------------------------------------------------------------
  // 13) The meetings
  // -------------------------------------------------------------------
  let meetingCount = 0;

  for (const plan of MEETINGS) {
    const organizerId = plan.organizer ? idOf(plan.organizer) : null;

    const startAt = momentFromNow(plan.startDays, plan.hour, plan.minute);
    const endAt = new Date(startAt.getTime() + plan.durationMinutes * 60 * 1000);

    const attendees: any[] = [];

    for (const invited of plan.attendees) {
      const attendeeId = idOf(invited.employee);

      if (!attendeeId) {
        continue;
      }

      attendees.push({
        employee: attendeeId,
        response: invited.response,
        note: invited.note,
        // Somebody who has not answered yet has no answer time either.
        respondedAt:
          invited.response === "invited"
            ? null
            : momentFromNow(plan.startDays - 1, 12, 0),
      });
    }

    // The history always opens with the day the meeting was put in the
    // calendar, and gets one more line when it moved on since then.
    const history: any[] = [
      {
        status: "scheduled",
        note: "Meeting scheduled.",
        byType: organizerId ? "manager" : "organization",
        byEmployee: organizerId,
        at: momentFromNow(plan.startDays - 4, 9, 0),
      },
    ];

    if (plan.status !== "scheduled") {
      history.push({
        status: plan.status,
        note: plan.statusNote,
        byType: organizerId ? "manager" : "organization",
        byEmployee: organizerId,
        at:
          plan.status === "cancelled"
            ? momentFromNow(plan.startDays - 2, 15, 0)
            : endAt,
      });
    }

    await Meeting.create({
      organization: orgId,
      title: plan.title,
      agenda: plan.agenda,
      startAt: startAt,
      durationMinutes: plan.durationMinutes,
      endAt: endAt,
      location: plan.location,
      meetingType: plan.meetingType,
      status: plan.status,
      organizedByType: organizerId ? "manager" : "organization",
      organizedByEmployee: organizerId,
      attendees: attendees,
      notes: plan.notes,
      actionItems: plan.actionItems,
      statusHistory: history,
    });

    meetingCount = meetingCount + 1;
  }

  console.log("Meetings       :", meetingCount);

  // -------------------------------------------------------------------
  // 14) A few lines in the bell
  // -------------------------------------------------------------------
  let notificationCount = 0;

  for (const plan of NOTIFICATIONS) {
    const employeeId = idOf(plan.employee);
    const actor = personOf(plan.actor);

    if (!employeeId || !actor) {
      continue;
    }

    // A notification is sent to a LOGIN account and not to an employee, so we
    // look up the account of that person first.
    const user = await User.findOne({ employee: employeeId });

    if (!user) {
      continue;
    }

    const arrivedAt = momentFromNow(-plan.daysAgo, 12, 0);

    await Notification.collection.insertOne({
      organization: orgId,
      recipient: user._id,
      type: plan.type,
      module: plan.module,
      title: plan.title,
      message: plan.message,
      actorName: actor.name,
      actorPhoto: actor.photo || "",
      link: plan.link,
      isRead: false,
      createdAt: arrivedAt,
      updatedAt: arrivedAt,
    });

    notificationCount = notificationCount + 1;
  }

  console.log("Notifications  :", notificationCount);

  // -------------------------------------------------------------------
  // 15) The summary
  // -------------------------------------------------------------------
  console.log("");
  console.log("Done. " + organization.name + " now has:");
  console.log("  " + teamCount + " teams, one per department");
  console.log(
    "  " +
      taskCount +
      " tasks, " +
      handoverCount +
      " of them handed over to somebody else"
  );
  console.log("  " + commentCount + " task comments");
  console.log("  " + meetingCount + " meetings, from finished to cancelled");
  console.log(
    "  " +
      leaveTypeByName.size +
      " leave types and " +
      holidayCount +
      " holidays"
  );
  console.log("  " + leaveCount + " leave requests with their approval trail");
  console.log(
    "  " + balanceByKey.size + " leave balance rows for " + thisYear
  );
  console.log("  " + salaryCount + " salaries with allowances");
  console.log(
    "  " +
      attendanceRows.length +
      " attendance rows over the last " +
      ATTENDANCE_DAYS +
      " days"
  );
  console.log("");
  console.log("The logins do not change: firstname@gmail.com / firstname123");
  console.log("");

  await mongoose.disconnect();
}

seedAlpha();
