// Everything the employee dashboard counts.
//
// The page has no endpoint of its own. The lists it reads (the employees, the
// teams, the tasks, the attendance of today, the leave requests) are the very
// same queries the module pages already load, so a number on this dashboard
// can never disagree with the number on the page it came from.
//
// Every function here takes plain lists and gives back plain objects. Nothing
// in this file talks to the server or to React, which is why the tiles stay
// short: they only draw what is worked out here.

import type { Employee } from "@/types/employee.types";
import type { Team } from "@/types/team.types";
import type { Task } from "@/types/task.types";
import { isTaskLate, isTaskOpen } from "@/types/task.types";
import type {
  Attendance,
  AttendanceStatus,
  LeaveRequest,
} from "@/types/hr.types";
import { isApprovedLeave } from "@/lib/leaveStatus";

// ---------------------------------------------------------------------------
// The colours of the charts
// ---------------------------------------------------------------------------

// One colour per slice, handed out in the order of the ranking: the biggest
// department (or role, or team) gets the first colour, the second biggest the
// second one, and so on. They are never shuffled, so the same group keeps the
// SAME colour in every tile of this page.
//
// These are the eight hexes the rest of the app already uses for its rings.
// They were run through a colour blindness check together, in exactly this
// order, and they work on the light and on the dark theme, which is why one
// list is enough for both.
export const SERIES_COLORS = [
  "#6366f1",
  "#d97706",
  "#0284c7",
  "#dc2626",
  "#059669",
  "#d946ef",
  "#0d9488",
  "#7c3aed",
];

// The grey of everything that is not one single group: the "everybody else"
// bundle of a ring, and the people no department claims.
export const REST_COLOR = "#94a3b8";

// A workspace can have more departments than we have colours. The ones past
// the end of the list share the grey, and they are always the small ones,
// because every list is ranked before the colours are handed out.
export function colorForRank(rank: number) {
  if (rank < SERIES_COLORS.length) {
    return SERIES_COLORS[rank];
  }
  return REST_COLOR;
}

// The look of a recharts tooltip. We read the theme colours, so the little box
// is white in the light theme and dark in the dark one without us writing the
// same colours twice.
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
};

// The four kinds of contract an employee can be on, with the words the charts
// show and the colour that kind carries on this whole page.
export const EMPLOYMENT_TYPES: {
  key: Employee["employmentType"];
  label: string;
  color: string;
}[] = [
  { key: "full_time", label: "Full time", color: "#6366f1" },
  { key: "part_time", label: "Part time", color: "#0284c7" },
  { key: "contract", label: "Contract", color: "#d97706" },
  { key: "intern", label: "Intern", color: "#d946ef" },
];

export function employmentTypeLabel(type: Employee["employmentType"]) {
  const found = EMPLOYMENT_TYPES.find((item) => item.key === type);
  return found ? found.label : type;
}

// The gender is optional on the employee form, so the empty text is one of the
// four choices here instead of being quietly dropped: a workforce where half
// the people never filled the field is a fact worth showing.
export const GENDERS: {
  key: Employee["gender"];
  label: string;
  color: string;
}[] = [
  { key: "male", label: "Male", color: "#0284c7" },
  { key: "female", label: "Female", color: "#d946ef" },
  { key: "other", label: "Other", color: "#7c3aed" },
  { key: "", label: "Not given", color: REST_COLOR },
];

// Where one person stands today.
//
// The five statuses are the ones of the attendance module, and "not marked" is
// added at the end: a day nobody answered for is not an absence, it is simply
// a day that is still open, and a dashboard that quietly turned it into an
// absence would accuse people of something they did not do.
export type PresenceKey = AttendanceStatus | "not_marked";

export const PRESENCE_META: {
  key: PresenceKey;
  label: string;
  color: string;
}[] = [
  { key: "present", label: "Present", color: "#059669" },
  { key: "half_day", label: "Half day", color: "#0284c7" },
  { key: "on_leave", label: "On leave", color: "#d97706" },
  { key: "absent", label: "Absent", color: "#dc2626" },
  { key: "holiday", label: "Holiday", color: "#7c3aed" },
  { key: "not_marked", label: "Not marked", color: REST_COLOR },
];

export function presenceLabel(key: PresenceKey) {
  const found = PRESENCE_META.find((item) => item.key === key);
  return found ? found.label : key;
}

export function presenceColor(key: PresenceKey) {
  const found = PRESENCE_META.find((item) => item.key === key);
  return found ? found.color : REST_COLOR;
}

// How long people have been here, cut into bands.
//
// max is the first number that does NOT belong to the band any more, so a
// person of exactly 12 months falls in "1 to 2 years" and not in the band
// below it. The last band takes everything left over.
export const TENURE_BANDS: { label: string; max: number; color: string }[] = [
  { label: "Under 3 months", max: 3, color: "#c7d2fe" },
  { label: "3 to 6 months", max: 6, color: "#a5b4fc" },
  { label: "6 to 12 months", max: 12, color: "#818cf8" },
  { label: "1 to 2 years", max: 24, color: "#6366f1" },
  { label: "2 to 5 years", max: 60, color: "#4f46e5" },
  { label: "Over 5 years", max: Number.MAX_SAFE_INTEGER, color: "#3730a3" },
];

// How old the people are, cut into bands, read the same way as the tenure
// bands above.
export const AGE_BANDS: { label: string; max: number; color: string }[] = [
  { label: "Under 25", max: 25, color: "#99f6e4" },
  { label: "25 to 29", max: 30, color: "#5eead4" },
  { label: "30 to 34", max: 35, color: "#2dd4bf" },
  { label: "35 to 44", max: 45, color: "#14b8a6" },
  { label: "45 to 54", max: 55, color: "#0d9488" },
  { label: "55 and over", max: Number.MAX_SAFE_INTEGER, color: "#0f766e" },
];

// ---------------------------------------------------------------------------
// Small helpers the tiles share
// ---------------------------------------------------------------------------

// part of whole as a whole percent. A whole of zero gives 0 instead of a
// division by zero.
export function percentOf(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }
  return Math.round((part / whole) * 100);
}

// A number with one decimal at most, and no ".0" tail: 2 stays "2", 2.25
// becomes "2.3". Used for the averages, where "2.2564 tasks per person" would
// only be noise.
export function formatAverage(value: number) {
  return String(Math.round(value * 10) / 10);
}

// 14 -> "1y 2m", 7 -> "7m", 0 -> "new". How long somebody has been here reads
// better in years once it passes one.
export function formatMonths(months: number) {
  if (months <= 0) {
    return "new";
  }
  if (months < 12) {
    return months + "m";
  }

  const years = Math.floor(months / 12);
  const rest = months % 12;

  if (rest === 0) {
    return years + "y";
  }
  return years + "y " + rest + "m";
}

// "2026-07-30T00:00:00.000Z" -> "30 Jul". The day and the month are enough on
// a chart, where the year is either obvious or written next to it.
export function formatShortDay(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

// Midnight of today, so every "how long ago" on this page is counted from the
// same moment.
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// How many whole months lie between a date and today. A date in the future
// (somebody who starts next month) gives 0 and not a negative number.
function monthsSince(date: Date) {
  const today = startOfToday();

  const months =
    (today.getFullYear() - date.getFullYear()) * 12 +
    (today.getMonth() - date.getMonth());

  if (months < 0) {
    return 0;
  }
  return months;
}

// How old somebody is today, in whole years. A birthday that has not come
// round yet this year still counts for the year before it.
function yearsSince(date: Date) {
  const today = startOfToday();

  let years = today.getFullYear() - date.getFullYear();

  const hadBirthday =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());

  if (!hadBirthday) {
    years -= 1;
  }

  if (years < 0) {
    return 0;
  }
  return years;
}

// The attendance row of one day carries its employee either as a plain id or
// as the whole person, depending on which page asked for it. Both are fine
// here, we only ever need the id.
function employeeIdOfAttendance(row: Attendance) {
  if (typeof row.employee === "string") {
    return row.employee;
  }
  return row.employee._id;
}

// Which band of a list a number falls in. The bands are read from the first
// one down, so the first band whose max the number has not reached yet wins.
function bandIndex(
  bands: { label: string; max: number; color: string }[],
  value: number
) {
  for (let index = 0; index < bands.length; index += 1) {
    if (value < bands[index].max) {
      return index;
    }
  }

  return bands.length - 1;
}

// ---------------------------------------------------------------------------
// One person, read from every module at once
// ---------------------------------------------------------------------------

// Everything this page knows about ONE person.
//
// It is built once, in buildEmployeeRows below, and then shared by every tile.
// So the rings, the bars, the panels and the scorecards can never tell three
// different stories about the same person: they all read this row.
export interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  photo: string;
  designation: string;
  status: "active" | "inactive";

  // --- Who they are ---------------------------------------------------
  departmentId: string;
  departmentName: string;
  roleName: string;
  // True when the role this person carries was switched off. They keep every
  // permission of it until somebody moves them, so it is worth showing.
  roleIsOff: boolean;
  employmentType: Employee["employmentType"];
  gender: Employee["gender"];

  // --- How long they have been here -----------------------------------
  joiningDate: string | null;
  exitDate: string | null;
  // Whole months since the joining date. 0 when the date was never filled in.
  tenureMonths: number;
  hasJoiningDate: boolean;
  dateOfBirth: string | null;
  // Whole years. 0 when the birth date was never filled in.
  ageYears: number;
  hasBirthDate: boolean;

  // --- Who they answer to ---------------------------------------------
  teamName: string;
  inTeam: boolean;
  isTeamLead: boolean;

  // --- The work they hold ---------------------------------------------
  tasks: number;
  todo: number;
  in_progress: number;
  in_review: number;
  completed: number;
  cancelled: number;
  // Everything that is neither done nor called off.
  open: number;
  // Open tasks whose due date is already gone.
  overdue: number;
  // Of the tasks that were really worked on (the cancelled ones left out),
  // how many are finished, as a whole percent.
  doneRate: number;
  // Of the open tasks, how many are late.
  lateRate: number;

  // --- Today ----------------------------------------------------------
  presence: PresenceKey;
  // The hours the attendance row of today carries. 0 when there is none.
  workedHours: number;

  // --- The leaves -----------------------------------------------------
  pendingLeaves: number;
  // Approved leave days of this year, and the same days cut in two by whether
  // the leave type is paid.
  leaveDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
}

// Everything the page hands over to build the rows. A list that the person
// looking at the page is not allowed to read simply arrives empty, and the
// tiles that need it are not drawn at all.
export interface EmployeeInput {
  employees: Employee[];
  teams: Team[];
  tasks: Task[];
  attendanceToday: Attendance[];
  leaves: LeaveRequest[];
}

// Build one row per employee, in alphabetical order.
//
// The order here is only the starting point: every tile sorts the rows the way
// its own chart is read (the fullest hands first, the newest joiner first...).
// Alphabetical is what the lists fall back on, so the page never shuffles two
// people between two reads.
export function buildEmployeeRows(input: EmployeeInput): EmployeeRow[] {
  const thisYear = startOfToday().getFullYear();

  // Which team each person sits in, worked out one time for everybody instead
  // of walking the team list again for every employee.
  const teamNameOf: Record<string, string> = {};
  const isLeadOf: Record<string, boolean> = {};

  input.teams.forEach((team) => {
    if (team.teamLead) {
      teamNameOf[team.teamLead._id] = team.name;
      isLeadOf[team.teamLead._id] = true;
    }

    (team.members || []).forEach((member) => {
      // Somebody who leads one team and is a member of another keeps the team
      // they lead, because that is the one they are known by.
      if (!teamNameOf[member._id]) {
        teamNameOf[member._id] = team.name;
      }
    });
  });

  const rows = input.employees.map((employee) => {
    // --- The work of this person --------------------------------------
    const ownTasks = input.tasks.filter(
      (task) => task.assignedTo?._id === employee._id
    );

    const openTasks = ownTasks.filter((task) => isTaskOpen(task));
    const overdueTasks = ownTasks.filter((task) => isTaskLate(task));

    const completed = ownTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const cancelled = ownTasks.filter(
      (task) => task.status === "cancelled"
    ).length;

    // A cancelled task was never finished and never will be, so it is left out
    // of the "how much of the work is done" question. Counting it would punish
    // somebody for dropping work they were right to drop.
    const realTasks = ownTasks.length - cancelled;

    // --- Where this person stands today -------------------------------
    const todayRow = input.attendanceToday.find(
      (row) => employeeIdOfAttendance(row) === employee._id
    );

    // --- The leaves of this person ------------------------------------
    const ownLeaves = input.leaves.filter(
      (leave) => leave.employee?._id === employee._id
    );

    let leaveDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;

    ownLeaves.forEach((leave) => {
      // A partly approved leave counts too: its approved days are real days
      // off, and totalDays already holds only those.
      if (!isApprovedLeave(leave.status)) {
        return;
      }

      if (new Date(leave.fromDate).getFullYear() !== thisYear) {
        return;
      }

      leaveDays += leave.totalDays;

      if (leave.leaveType?.isPaid) {
        paidLeaveDays += leave.totalDays;
      } else {
        unpaidLeaveDays += leave.totalDays;
      }
    });

    const joined = employee.joiningDate ? new Date(employee.joiningDate) : null;
    const born = employee.dateOfBirth ? new Date(employee.dateOfBirth) : null;

    const row: EmployeeRow = {
      id: employee._id,
      name: employee.name,
      email: employee.email,
      photo: employee.photo,
      designation: employee.designation,
      status: employee.status,

      departmentId: employee.department?._id || "",
      departmentName: employee.department?.name || "",
      roleName: employee.role?.name || "",
      roleIsOff: employee.role?.status === "inactive",
      employmentType: employee.employmentType,
      gender: employee.gender,

      joiningDate: employee.joiningDate,
      exitDate: employee.exitDate,
      tenureMonths: joined ? monthsSince(joined) : 0,
      hasJoiningDate: joined !== null,
      dateOfBirth: employee.dateOfBirth,
      ageYears: born ? yearsSince(born) : 0,
      hasBirthDate: born !== null,

      teamName: teamNameOf[employee._id] || "",
      inTeam: Boolean(teamNameOf[employee._id]),
      isTeamLead: Boolean(isLeadOf[employee._id]),

      tasks: ownTasks.length,
      todo: ownTasks.filter((task) => task.status === "todo").length,
      in_progress: ownTasks.filter((task) => task.status === "in_progress")
        .length,
      in_review: ownTasks.filter((task) => task.status === "in_review").length,
      completed: completed,
      cancelled: cancelled,
      open: openTasks.length,
      overdue: overdueTasks.length,
      doneRate: percentOf(completed, realTasks),
      lateRate: percentOf(overdueTasks.length, openTasks.length),

      presence: todayRow ? todayRow.status : "not_marked",
      workedHours: todayRow ? todayRow.workedHours : 0,

      pendingLeaves: ownLeaves.filter((leave) => leave.status === "pending")
        .length,
      leaveDays: leaveDays,
      paidLeaveDays: paidLeaveDays,
      unpaidLeaveDays: unpaidLeaveDays,
    };

    return row;
  });

  rows.sort((left, right) => left.name.localeCompare(right.name));

  return rows;
}

// The people who still work here. Almost every tile asks for exactly this
// list: somebody who left is not part of today's workforce, and counting them
// would make every distribution on the page describe a company that no longer
// exists.
export function activeRows(rows: EmployeeRow[]) {
  return rows.filter((row) => row.status === "active");
}

// ---------------------------------------------------------------------------
// The banner
// ---------------------------------------------------------------------------

// The figures written across the top of the page, before any chart is read.
export interface EmployeeHeadline {
  // Everybody the organization has on file, and the two halves of that.
  total: number;
  active: number;
  left: number;

  joinedLastYear: number;
  leftLastYear: number;
  // The people who left over the last twelve months against the team those
  // twelve months started with, as a whole percent.
  attritionRate: number;

  averageTenure: number;
  // The middle person of the team: half of it has been here longer, half of it
  // shorter. It says more than the average when one founder drags the average
  // up on their own.
  medianTenure: number;
  newest: EmployeeRow | null;
  longest: EmployeeRow | null;

  departments: number;
  roles: number;
  withoutDepartment: number;
  notInTeam: number;

  openTasks: number;
  overdueTasks: number;
  openPerPerson: number;
  busiest: EmployeeRow | null;

  inToday: number;
  awayToday: number;
  notMarked: number;

  pendingLeaves: number;
  leaveDays: number;
}

export function buildHeadline(rows: EmployeeRow[]): EmployeeHeadline {
  const today = startOfToday();
  const people = activeRows(rows);

  // The first day of the same month one year ago, for "joined" and "left".
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);

  let joinedLastYear = 0;
  let leftLastYear = 0;

  rows.forEach((row) => {
    if (
      row.joiningDate &&
      new Date(row.joiningDate).getTime() >= oneYearAgo.getTime()
    ) {
      joinedLastYear += 1;
    }

    if (
      row.exitDate &&
      new Date(row.exitDate).getTime() >= oneYearAgo.getTime()
    ) {
      leftLastYear += 1;
    }
  });

  // How long the team has been here. Both readings are taken over the people
  // whose joining date was filled in, because a missing date is not "zero
  // months here", it is simply unknown.
  const withJoining = people.filter((row) => row.hasJoiningDate);

  let tenureTotal = 0;

  withJoining.forEach((row) => {
    tenureTotal += row.tenureMonths;
  });

  const sortedTenure = [...withJoining].sort(
    (left, right) => left.tenureMonths - right.tenureMonths
  );

  const middle = Math.floor(sortedTenure.length / 2);

  const departmentIds: string[] = [];
  const roleNames: string[] = [];

  people.forEach((row) => {
    if (row.departmentId && !departmentIds.includes(row.departmentId)) {
      departmentIds.push(row.departmentId);
    }
    if (row.roleName && !roleNames.includes(row.roleName)) {
      roleNames.push(row.roleName);
    }
  });

  let openTasks = 0;
  let overdueTasks = 0;
  let pendingLeaves = 0;
  let leaveDays = 0;
  let inToday = 0;
  let awayToday = 0;
  let notMarked = 0;

  people.forEach((row) => {
    openTasks += row.open;
    overdueTasks += row.overdue;
    pendingLeaves += row.pendingLeaves;
    leaveDays += row.leaveDays;

    // A half day is still a day somebody turned up for, so it counts as being
    // in. A holiday is neither: nobody was expected.
    if (row.presence === "present" || row.presence === "half_day") {
      inToday += 1;
    }
    if (row.presence === "on_leave" || row.presence === "absent") {
      awayToday += 1;
    }
    if (row.presence === "not_marked") {
      notMarked += 1;
    }
  });

  const byOpen = [...people].sort((left, right) => right.open - left.open);
  const byTenure = [...withJoining].sort(
    (left, right) => right.tenureMonths - left.tenureMonths
  );

  return {
    total: rows.length,
    active: people.length,
    left: rows.length - people.length,

    joinedLastYear: joinedLastYear,
    leftLastYear: leftLastYear,
    // The team the year started with is roughly the team of today, minus the
    // people who joined since, plus the people who walked out.
    attritionRate: percentOf(
      leftLastYear,
      people.length - joinedLastYear + leftLastYear
    ),

    averageTenure:
      withJoining.length === 0
        ? 0
        : Math.round(tenureTotal / withJoining.length),
    medianTenure:
      sortedTenure.length === 0 ? 0 : sortedTenure[middle].tenureMonths,
    newest: byTenure.length > 0 ? byTenure[byTenure.length - 1] : null,
    longest: byTenure.length > 0 ? byTenure[0] : null,

    departments: departmentIds.length,
    roles: roleNames.length,
    withoutDepartment: people.filter((row) => row.departmentId === "").length,
    notInTeam: people.filter((row) => !row.inTeam).length,

    openTasks: openTasks,
    overdueTasks: overdueTasks,
    openPerPerson: people.length === 0 ? 0 : openTasks / people.length,
    busiest: byOpen.length > 0 && byOpen[0].open > 0 ? byOpen[0] : null,

    inToday: inToday,
    awayToday: awayToday,
    notMarked: notMarked,

    pendingLeaves: pendingLeaves,
    leaveDays: leaveDays,
  };
}

// ---------------------------------------------------------------------------
// How the workforce is made up
// ---------------------------------------------------------------------------

// One slice of a ring or one bar of a distribution: what it is, how many
// people it holds, and the colour it carries on this page.
export interface Slice {
  key: string;
  name: string;
  value: number;
  color: string;
}

// The people cut by the kind of contract they are on. The four kinds are
// always drawn in the same order, even the ones nobody is on, so two reads of
// the page never swap two colours around.
export function buildEmploymentSlices(rows: EmployeeRow[]): Slice[] {
  return EMPLOYMENT_TYPES.map((type) => ({
    key: type.key,
    name: type.label,
    value: rows.filter((row) => row.employmentType === type.key).length,
    color: type.color,
  }));
}

// The people cut by gender, the empty answer included as its own slice.
export function buildGenderSlices(rows: EmployeeRow[]): Slice[] {
  return GENDERS.map((gender) => ({
    key: gender.key || "unknown",
    name: gender.label,
    value: rows.filter((row) => row.gender === gender.key).length,
    color: gender.color,
  }));
}

// The people cut by department, the biggest first. Whoever has no department
// at all is gathered in one last grey slice instead of being dropped.
export function buildDepartmentSlices(rows: EmployeeRow[]): Slice[] {
  const slices: Slice[] = [];

  rows.forEach((row) => {
    if (!row.departmentId) {
      return;
    }

    const found = slices.find((slice) => slice.key === row.departmentId);

    if (found) {
      found.value += 1;
    } else {
      slices.push({
        key: row.departmentId,
        name: row.departmentName,
        value: 1,
        color: REST_COLOR,
      });
    }
  });

  slices.sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }
    return left.name.localeCompare(right.name);
  });

  slices.forEach((slice, index) => {
    slice.color = colorForRank(index);
  });

  const orphans = rows.filter((row) => !row.departmentId).length;

  if (orphans > 0) {
    slices.push({
      key: "none",
      name: "No department",
      value: orphans,
      color: REST_COLOR,
    });
  }

  return slices;
}

// The people cut by the role they carry, the biggest first. The role is what
// decides what somebody may do in the app, so this is the permission map of
// the company read as a head count.
export function buildRoleSlices(rows: EmployeeRow[]): Slice[] {
  const slices: Slice[] = [];

  rows.forEach((row) => {
    const key = row.roleName || "none";
    const found = slices.find((slice) => slice.key === key);

    if (found) {
      found.value += 1;
    } else {
      slices.push({
        key: key,
        name: row.roleName || "No role",
        value: 1,
        color: REST_COLOR,
      });
    }
  });

  slices.sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }
    return left.name.localeCompare(right.name);
  });

  slices.forEach((slice, index) => {
    slice.color = colorForRank(index);
  });

  return slices;
}

// The people cut into bands of how long they have been here.
//
// Only the people whose joining date was filled in can be placed, so the
// tile also gets back how many were left out — a chart drawn over half the
// team without saying so would be a lie.
export function buildTenureBands(rows: EmployeeRow[]) {
  const placed = rows.filter((row) => row.hasJoiningDate);

  const bands = TENURE_BANDS.map((band) => ({
    key: band.label,
    name: band.label,
    value: 0,
    color: band.color,
  }));

  placed.forEach((row) => {
    bands[bandIndex(TENURE_BANDS, row.tenureMonths)].value += 1;
  });

  return { bands: bands, placed: placed.length, missing: rows.length - placed.length };
}

// The people cut into bands of age, read exactly like the tenure bands.
export function buildAgeBands(rows: EmployeeRow[]) {
  const placed = rows.filter((row) => row.hasBirthDate);

  const bands = AGE_BANDS.map((band) => ({
    key: band.label,
    name: band.label,
    value: 0,
    color: band.color,
  }));

  let ageTotal = 0;

  placed.forEach((row) => {
    bands[bandIndex(AGE_BANDS, row.ageYears)].value += 1;
    ageTotal += row.ageYears;
  });

  return {
    bands: bands,
    placed: placed.length,
    missing: rows.length - placed.length,
    averageAge: placed.length === 0 ? 0 : Math.round(ageTotal / placed.length),
  };
}

// How today's attendance falls out over the whole workforce.
export function buildPresenceSlices(rows: EmployeeRow[]): Slice[] {
  return PRESENCE_META.map((item) => ({
    key: item.key,
    name: item.label,
    value: rows.filter((row) => row.presence === item.key).length,
    color: item.color,
  }));
}

// ---------------------------------------------------------------------------
// The last twelve months
// ---------------------------------------------------------------------------

// One month of the growth chart.
export interface GrowthPoint {
  key: string;
  // "Aug", and the year written next to January so the axis stays readable.
  label: string;
  joined: number;
  left: number;
  // The same number as left, written as a minus, so recharts draws it under
  // the middle line. The tooltip always shows the real, positive number.
  leftAsNegative: number;
  // Everybody who was on the books on the last day of that month.
  headcount: number;
}

// The last twelve months of the whole workforce: who came in, who walked out,
// and how big the team was at the end of each month.
//
// Somebody whose joining date was never filled in is counted as having always
// been here: they exist, and dropping them would make the headcount line lower
// than the team the rest of the page counts.
export function buildGrowthPoints(rows: EmployeeRow[]): GrowthPoint[] {
  const today = startOfToday();
  const points: GrowthPoint[] = [];

  for (let back = 11; back >= 0; back -= 1) {
    const monthStart = new Date(
      today.getFullYear(),
      today.getMonth() - back,
      1
    );
    // The first moment of the NEXT month, which is the line every "before the
    // end of this month" question is asked against.
    const monthEnd = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      1
    );

    let joined = 0;
    let left = 0;
    let headcount = 0;

    rows.forEach((row) => {
      const joinedAt = row.joiningDate ? new Date(row.joiningDate) : null;
      const leftAt = row.exitDate ? new Date(row.exitDate) : null;

      if (
        joinedAt &&
        joinedAt.getTime() >= monthStart.getTime() &&
        joinedAt.getTime() < monthEnd.getTime()
      ) {
        joined += 1;
      }

      if (
        leftAt &&
        leftAt.getTime() >= monthStart.getTime() &&
        leftAt.getTime() < monthEnd.getTime()
      ) {
        left += 1;
      }

      // Was this person on the books when that month closed?
      const wasHere = !joinedAt || joinedAt.getTime() < monthEnd.getTime();
      const stillHere = !leftAt || leftAt.getTime() >= monthEnd.getTime();

      if (wasHere && stillHere) {
        headcount += 1;
      }
    });

    const month = monthStart.toLocaleDateString(undefined, { month: "short" });

    points.push({
      key: monthStart.getFullYear() + "-" + monthStart.getMonth(),
      label:
        monthStart.getMonth() === 0
          ? month + " " + monthStart.getFullYear()
          : month,
      joined: joined,
      left: left,
      leftAsNegative: -left,
      headcount: headcount,
    });
  }

  return points;
}

// ---------------------------------------------------------------------------
// The dates that are coming up
// ---------------------------------------------------------------------------

// One line of the moments panel: a birthday, a work anniversary, or somebody
// who has just started.
export interface Moment {
  key: string;
  employeeId: string;
  name: string;
  photo: string;
  designation: string;
  // "12 Aug", the day the thing happens (or happened).
  when: string;
  // How many days from today. It is negative for something in the last days.
  inDays: number;
  // "turns 34", "5 years here", "joined 12 days ago".
  detail: string;
}

// How far ahead the panel looks.
const MOMENT_WINDOW_DAYS = 45;

// How many days back a "just joined" line is still worth a line.
const NEW_JOINER_DAYS = 60;

// How many whole days lie between today and a date.
function daysUntil(date: Date) {
  const today = startOfToday();
  const oneDay = 24 * 60 * 60 * 1000;

  return Math.round((date.getTime() - today.getTime()) / oneDay);
}

// The next time a day and a month come round: this year if it is still ahead
// of us, next year if it has already gone by.
function nextOccurrence(date: Date) {
  const today = startOfToday();

  const thisYear = new Date(
    today.getFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );

  if (thisYear.getTime() >= today.getTime()) {
    return thisYear;
  }

  return new Date(today.getFullYear() + 1, date.getUTCMonth(), date.getUTCDate());
}

// "12 Aug" for a date that is already a real day of a real year.
function formatDayMonth(date: Date) {
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

// The birthdays coming up in the next few weeks, the closest first.
export function buildBirthdays(rows: EmployeeRow[]): Moment[] {
  const moments: Moment[] = [];

  rows.forEach((row) => {
    if (!row.dateOfBirth) {
      return;
    }

    const next = nextOccurrence(new Date(row.dateOfBirth));
    const inDays = daysUntil(next);

    if (inDays > MOMENT_WINDOW_DAYS) {
      return;
    }

    moments.push({
      key: "birthday-" + row.id,
      employeeId: row.id,
      name: row.name,
      photo: row.photo,
      designation: row.designation,
      when: formatDayMonth(next),
      inDays: inDays,
      detail: "turns " + (row.ageYears + (inDays === 0 ? 0 : 1)),
    });
  });

  moments.sort((left, right) => left.inDays - right.inDays);

  return moments;
}

// The work anniversaries coming up. The first one is not an anniversary, so
// somebody who joined less than a year ago is left for the "just joined" list.
export function buildAnniversaries(rows: EmployeeRow[]): Moment[] {
  const moments: Moment[] = [];

  rows.forEach((row) => {
    if (!row.joiningDate || row.tenureMonths < 12) {
      return;
    }

    const next = nextOccurrence(new Date(row.joiningDate));
    const inDays = daysUntil(next);

    if (inDays > MOMENT_WINDOW_DAYS) {
      return;
    }

    // How many years they will have been here on that day.
    const years =
      next.getFullYear() - new Date(row.joiningDate).getUTCFullYear();

    moments.push({
      key: "anniversary-" + row.id,
      employeeId: row.id,
      name: row.name,
      photo: row.photo,
      designation: row.designation,
      when: formatDayMonth(next),
      inDays: inDays,
      detail: years + (years === 1 ? " year here" : " years here"),
    });
  });

  moments.sort((left, right) => left.inDays - right.inDays);

  return moments;
}

// The people who started in the last two months, the newest first. They are
// the ones whose onboarding is still somebody's job.
export function buildNewJoiners(rows: EmployeeRow[]): Moment[] {
  const moments: Moment[] = [];

  rows.forEach((row) => {
    if (!row.joiningDate) {
      return;
    }

    const joined = new Date(row.joiningDate);
    const inDays = daysUntil(joined);

    // Ahead of us is somebody who has not started yet, and that is worth a
    // line too. Behind us it is only worth one for the first two months.
    if (inDays < -NEW_JOINER_DAYS) {
      return;
    }

    // Today is the starting point, and the two branches below move it either
    // forward (somebody who has not started yet) or back.
    let detail = "starts today";

    if (inDays > 0) {
      detail = "starts in " + inDays + (inDays === 1 ? " day" : " days");
    } else if (inDays < 0) {
      detail = "joined " + -inDays + (inDays === -1 ? " day ago" : " days ago");
    }

    moments.push({
      key: "joiner-" + row.id,
      employeeId: row.id,
      name: row.name,
      photo: row.photo,
      designation: row.designation,
      when: formatDayMonth(joined),
      inDays: inDays,
      detail: detail,
    });
  });

  moments.sort((left, right) => right.inDays - left.inDays);

  return moments;
}

// ---------------------------------------------------------------------------
// What needs somebody to look at it
// ---------------------------------------------------------------------------

// One line of the attention panel: which person, what is wrong, and how bad
// it is.
export interface AttentionItem {
  // React needs a key, and one person can raise several lines.
  key: string;
  employeeId: string;
  name: string;
  photo: string;
  text: string;
  // How loud the line is drawn. It is also what sorts the panel.
  tone: "danger" | "warning" | "info";
  // The number the line is about, used to sort two lines of the same tone.
  value: number;
}

// How loud each tone is, so the panel can sort by it.
function toneWeight(tone: "danger" | "warning" | "info") {
  if (tone === "danger") {
    return 3;
  }
  if (tone === "warning") {
    return 2;
  }
  return 1;
}

// More open tasks than this on one pair of hands is where a person starts to
// queue instead of working.
const HEAVY_LOAD = 8;

// Read every row and write down what is wrong with it.
//
// The panel is the one tile of this page that does not draw a chart, because
// "three people are carrying late work" is a sentence and not a shape. Every
// line it writes comes from a number that is also somewhere on a chart above
// it.
//
// canReadTasks / canReadTeams / canReadLeaves keep the panel honest: a list
// this person is not allowed to read arrives empty, and an empty list must
// never turn into "nobody has any late work".
export function buildAttentionItems(
  rows: EmployeeRow[],
  input: {
    canReadTasks: boolean;
    canReadTeams: boolean;
    canReadLeaves: boolean;
  }
): AttentionItem[] {
  const items: AttentionItem[] = [];

  rows.forEach((row) => {
    function add(
      name: string,
      text: string,
      tone: "danger" | "warning" | "info",
      value: number
    ) {
      items.push({
        key: row.id + "-" + name,
        employeeId: row.id,
        name: row.name,
        photo: row.photo,
        text: text,
        tone: tone,
        value: value,
      });
    }

    // Somebody who has left but is still holding open work. Nobody is going
    // to finish it, because nobody is there any more.
    if (row.status === "inactive") {
      if (input.canReadTasks && row.open > 0) {
        add(
          "gone",
          "has left but still holds " +
            row.open +
            (row.open === 1 ? " open task" : " open tasks"),
          "danger",
          row.open
        );
      }

      // Everything below is about the people who are still here.
      return;
    }

    if (input.canReadTasks && row.overdue > 0) {
      add(
        "overdue",
        row.overdue +
          (row.overdue === 1 ? " task is late" : " tasks are late") +
          " (" +
          row.lateRate +
          "% of their open work)",
        "danger",
        row.overdue
      );
    }

    if (input.canReadTasks && row.open > HEAVY_LOAD) {
      add(
        "load",
        "is carrying " + row.open + " open tasks",
        "warning",
        row.open
      );
    }

    if (input.canReadLeaves && row.pendingLeaves > 0) {
      add(
        "leaves",
        row.pendingLeaves +
          (row.pendingLeaves === 1
            ? " leave request is waiting for an answer"
            : " leave requests are waiting for an answer"),
        "warning",
        row.pendingLeaves
      );
    }

    // The role was switched off, but this person still carries every
    // permission it holds until somebody moves them to another one.
    if (row.roleIsOff) {
      add(
        "role",
        "carries the switched-off role “" + row.roleName + "”",
        "warning",
        1
      );
    }

    if (row.departmentId === "") {
      add("department", "sits in no department", "warning", 1);
    }

    if (!row.hasJoiningDate) {
      add(
        "joining",
        "has no joining date, so they are missing from the tenure and growth charts",
        "info",
        1
      );
    }

    if (input.canReadTeams && !row.inTeam) {
      add("team", "is in no team", "info", 1);
    }
  });

  items.sort((left, right) => {
    if (toneWeight(right.tone) !== toneWeight(left.tone)) {
      return toneWeight(right.tone) - toneWeight(left.tone);
    }
    if (right.value !== left.value) {
      return right.value - left.value;
    }
    return left.name.localeCompare(right.name);
  });

  return items;
}
