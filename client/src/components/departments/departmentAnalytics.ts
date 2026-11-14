// Everything the department dashboard counts.
//
// The page has no endpoint of its own. The lists it reads (departments,
// employees, teams, tasks, the attendance of today, the leave requests) are
// the very same queries the module pages already load, so a number on this
// dashboard can never disagree with the number on the page it came from.
//
// Every function here takes plain lists and gives back plain objects. Nothing
// in this file talks to the server or to React, which is why the tiles stay
// short: they only draw what is worked out here.

import type { Department } from "@/types/department.types";
import type { Employee } from "@/types/employee.types";
import type { Team } from "@/types/team.types";
import type { Task } from "@/types/task.types";
import { isTaskLate, isTaskOpen } from "@/types/task.types";
import type { Attendance, AttendanceStatus, LeaveRequest } from "@/types/hr.types";
import { isApprovedLeave } from "@/lib/leaveStatus";

// ---------------------------------------------------------------------------
// The colours of the charts
// ---------------------------------------------------------------------------

// One colour per department, handed out in the order of the ranking: the
// biggest department gets the first colour, the second biggest the second one,
// and so on. They are never shuffled, so a department keeps the SAME colour in
// every tile of this page — the ring, the bars and the scorecards all point at
// the same team with the same colour.
//
// The eight hexes are the ones the main dashboard already uses for its
// department ring. They were run through a colour blindness check together, in
// exactly this order, and they work on the light and on the dark theme, which
// is why one list is enough for both.
export const DEPARTMENT_COLORS = [
  "#6366f1",
  "#d97706",
  "#0284c7",
  "#dc2626",
  "#059669",
  "#d946ef",
  "#0d9488",
  "#7c3aed",
];

// The grey of everything that is not one single department: the "other
// departments" bundle of the ring, and the people no department claims.
export const REST_COLOR = "#94a3b8";

// A workspace can have more departments than we have colours. The ones past
// the end of the list share the grey, and they are always the small ones,
// because the list is ranked before the colours are handed out.
export function colorForRank(rank: number) {
  if (rank < DEPARTMENT_COLORS.length) {
    return DEPARTMENT_COLORS[rank];
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

// Where one person of a department stands today.
//
// The five statuses are the ones of the attendance module, and "not marked" is
// added at the end: a day nobody answered for is not an absence, it is simply
// a day that is still open, and a dashboard that quietly turned it into an
// absence would accuse people of something they did not do.
export type PresenceKey = AttendanceStatus | "not_marked";

export const PRESENCE_COLORS: {
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

// The attendance row of one day carries its employee either as a plain id or
// as the whole person, depending on which page asked for it. Both are fine
// here, we only ever need the id.
function employeeIdOfAttendance(row: Attendance) {
  if (typeof row.employee === "string") {
    return row.employee;
  }
  return row.employee._id;
}

// Midnight of today, so "the last twelve months" is the same moment for every
// department of the page.
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

// ---------------------------------------------------------------------------
// One department, read from every module at once
// ---------------------------------------------------------------------------

// Everything this page knows about ONE department.
//
// It is built once, in buildDepartmentRows below, and then shared by every
// tile. So the ring, the bars, the panel and the scorecards can never tell
// three different stories about the same department: they all read this row.
export interface DepartmentRow {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  // The colour this department carries on the whole page.
  color: string;

  // --- The people -----------------------------------------------------
  // Only the people who still work here. Somebody who left does not sit in
  // a department any more, so counting them would make the department look
  // bigger than the team it really has today.
  people: number;
  // The people of this department who have left. They are counted apart,
  // because "12 people, 5 of them gone" is a different department from "12
  // people, none gone".
  leftPeople: number;
  // Of the active people: how many are in a team of this department, and how
  // many are in none.
  inTeam: number;
  notInTeam: number;
  teams: number;
  // Teams of this department that have nobody at their head.
  teamsWithoutLead: number;
  // How long the active people have been here, on average, in months.
  averageTenure: number;
  joinedLastYear: number;
  leftLastYear: number;

  // --- The work -------------------------------------------------------
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
  openPerPerson: number;

  // --- Today ----------------------------------------------------------
  present: number;
  half_day: number;
  on_leave: number;
  absent: number;
  holiday: number;
  not_marked: number;

  // --- The leaves -----------------------------------------------------
  pendingLeaves: number;
  // Approved leave days of this year.
  leaveDays: number;
}

// Everything the page hands over to build the rows. A list that the person
// looking at the page is not allowed to read simply arrives empty, and the
// tiles that need it are not drawn at all.
export interface DepartmentInput {
  departments: Department[];
  employees: Employee[];
  teams: Team[];
  tasks: Task[];
  attendanceToday: Attendance[];
  leaves: LeaveRequest[];
}

// Build one row per department, biggest team first.
//
// The ranking is what decides the colours, so it happens before they are
// handed out: the biggest department is the first colour of the list on every
// tile of the page.
export function buildDepartmentRows(input: DepartmentInput): DepartmentRow[] {
  const today = startOfToday();
  const thisYear = today.getFullYear();

  // The first day of the same month one year ago, for "joined" and "left".
  const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), 1);

  const rows = input.departments.map((department) => {
    // --- The people of this department --------------------------------
    const ownEmployees = input.employees.filter(
      (employee) => employee.department?._id === department._id
    );

    const activeEmployees = ownEmployees.filter(
      (employee) => employee.status === "active"
    );

    // --- The teams of this department ---------------------------------
    const ownTeams = input.teams.filter(
      (team) => team.department?._id === department._id
    );

    // Everybody who sits in one of those teams, as a lead or as a member.
    // The same person can be in the lead line of one team and in the member
    // list of another, so the ids go into a list that keeps each one once.
    const peopleInTeams: string[] = [];

    ownTeams.forEach((team) => {
      if (team.teamLead && !peopleInTeams.includes(team.teamLead._id)) {
        peopleInTeams.push(team.teamLead._id);
      }

      (team.members || []).forEach((member) => {
        if (!peopleInTeams.includes(member._id)) {
          peopleInTeams.push(member._id);
        }
      });
    });

    const inTeam = activeEmployees.filter((employee) =>
      peopleInTeams.includes(employee._id)
    ).length;

    // --- How long the team has been here ------------------------------
    let tenureTotal = 0;
    let tenureCount = 0;
    let joinedLastYear = 0;

    activeEmployees.forEach((employee) => {
      if (!employee.joiningDate) {
        return;
      }

      const joined = new Date(employee.joiningDate);

      tenureTotal += monthsSince(joined);
      tenureCount += 1;

      if (joined.getTime() >= oneYearAgo.getTime()) {
        joinedLastYear += 1;
      }
    });

    let leftLastYear = 0;

    ownEmployees.forEach((employee) => {
      if (!employee.exitDate) {
        return;
      }

      if (new Date(employee.exitDate).getTime() >= oneYearAgo.getTime()) {
        leftLastYear += 1;
      }
    });

    // --- The work of this department ----------------------------------
    const ownTasks = input.tasks.filter(
      (task) => task.department?._id === department._id
    );

    const openTasks = ownTasks.filter((task) => isTaskOpen(task));
    const overdueTasks = ownTasks.filter((task) => isTaskLate(task));

    const completed = ownTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const cancelled = ownTasks.filter(
      (task) => task.status === "cancelled"
    ).length;

    // A cancelled task was never finished and never will be, so it is left
    // out of the "how much of the work is done" question. Counting it would
    // punish a department for dropping work it was right to drop.
    const realTasks = ownTasks.length - cancelled;

    // --- Where those people stand today -------------------------------
    const ownPeopleIds = activeEmployees.map((employee) => employee._id);

    const ownAttendance = input.attendanceToday.filter((row) =>
      ownPeopleIds.includes(employeeIdOfAttendance(row))
    );

    function countPresence(status: AttendanceStatus) {
      return ownAttendance.filter((row) => row.status === status).length;
    }

    const present = countPresence("present");
    const halfDay = countPresence("half_day");
    const onLeave = countPresence("on_leave");
    const absent = countPresence("absent");
    const holiday = countPresence("holiday");

    // Everybody the attendance of today says nothing about yet. It can never
    // go below zero, not even when somebody has a row after they left.
    let notMarked =
      activeEmployees.length - present - halfDay - onLeave - absent - holiday;

    if (notMarked < 0) {
      notMarked = 0;
    }

    // --- The leaves of this department --------------------------------
    const ownLeaves = input.leaves.filter(
      (leave) => leave.department?._id === department._id
    );

    const pendingLeaves = ownLeaves.filter(
      (leave) => leave.status === "pending"
    ).length;

    let leaveDays = 0;

    ownLeaves.forEach((leave) => {
      // A partly approved leave counts too: its approved days are real days
      // off, and totalDays already holds only those.
      if (!isApprovedLeave(leave.status)) {
        return;
      }

      if (new Date(leave.fromDate).getFullYear() === thisYear) {
        leaveDays += leave.totalDays;
      }
    });

    const row: DepartmentRow = {
      id: department._id,
      name: department.name,
      description: department.description,
      status: department.status,
      createdAt: department.createdAt,
      // The real colour is written below, once the ranking is known.
      color: REST_COLOR,

      people: activeEmployees.length,
      leftPeople: ownEmployees.length - activeEmployees.length,
      inTeam: inTeam,
      notInTeam: activeEmployees.length - inTeam,
      teams: ownTeams.length,
      teamsWithoutLead: ownTeams.filter((team) => !team.teamLead).length,
      averageTenure:
        tenureCount === 0 ? 0 : Math.round(tenureTotal / tenureCount),
      joinedLastYear: joinedLastYear,
      leftLastYear: leftLastYear,

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
      openPerPerson:
        activeEmployees.length === 0
          ? 0
          : openTasks.length / activeEmployees.length,

      present: present,
      half_day: halfDay,
      on_leave: onLeave,
      absent: absent,
      holiday: holiday,
      not_marked: notMarked,

      pendingLeaves: pendingLeaves,
      leaveDays: leaveDays,
    };

    return row;
  });

  // The biggest team first. Two departments of the same size stay in
  // alphabetical order, so the page never shuffles them between two reads.
  rows.sort((left, right) => {
    if (right.people !== left.people) {
      return right.people - left.people;
    }
    return left.name.localeCompare(right.name);
  });

  // Now that the ranking is fixed, every department gets its colour.
  rows.forEach((row, index) => {
    row.color = colorForRank(index);
  });

  return rows;
}

// ---------------------------------------------------------------------------
// The banner
// ---------------------------------------------------------------------------

// The figures written across the top of the page, before any chart is read.
export interface DepartmentHeadline {
  departments: number;
  activeDepartments: number;
  // Departments nobody works in yet.
  emptyDepartments: number;
  people: number;
  averageSize: number;
  biggest: DepartmentRow | null;
  // The people whose department was deleted, so they now sit nowhere.
  withoutDepartment: number;
  teams: number;
  openTasks: number;
  overdueTasks: number;
  awayToday: number;
  pendingLeaves: number;
}

export function buildHeadline(
  rows: DepartmentRow[],
  employees: Employee[]
): DepartmentHeadline {
  let people = 0;
  let teams = 0;
  let openTasks = 0;
  let overdueTasks = 0;
  let awayToday = 0;
  let pendingLeaves = 0;

  rows.forEach((row) => {
    people += row.people;
    teams += row.teams;
    openTasks += row.open;
    overdueTasks += row.overdue;
    awayToday += row.on_leave + row.absent;
    pendingLeaves += row.pendingLeaves;
  });

  const activeEmployees = employees.filter(
    (employee) => employee.status === "active"
  );

  // Somebody whose department was deleted is in no row above. We do not go
  // looking for them one by one: whoever the departments did not claim is
  // exactly that person.
  let withoutDepartment = activeEmployees.length - people;

  if (withoutDepartment < 0) {
    withoutDepartment = 0;
  }

  return {
    departments: rows.length,
    activeDepartments: rows.filter((row) => row.status === "active").length,
    emptyDepartments: rows.filter((row) => row.people === 0).length,
    people: people,
    averageSize: rows.length === 0 ? 0 : people / rows.length,
    biggest: rows.length > 0 && rows[0].people > 0 ? rows[0] : null,
    withoutDepartment: withoutDepartment,
    teams: teams,
    openTasks: openTasks,
    overdueTasks: overdueTasks,
    awayToday: awayToday,
    pendingLeaves: pendingLeaves,
  };
}

// ---------------------------------------------------------------------------
// What needs somebody to look at it
// ---------------------------------------------------------------------------

// One line of the attention panel: which department, what is wrong, and how
// bad it is.
export interface AttentionItem {
  // React needs a key, and one department can raise several lines.
  key: string;
  departmentId: string;
  departmentName: string;
  color: string;
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

// Read every row and write down what is wrong with it.
//
// The panel is the one tile of this page that does not draw a chart, because
// "three departments have late work" is a sentence and not a shape. Every line
// it writes comes from a number that is also somewhere on a chart above it.
export function buildAttentionItems(rows: DepartmentRow[]): AttentionItem[] {
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
        departmentId: row.id,
        departmentName: row.name,
        color: row.color,
        text: text,
        tone: tone,
        value: value,
      });
    }

    // A department that was switched off but still has people in it. Nobody
    // can be added to it any more, yet the team is still there.
    if (row.status === "inactive" && row.people > 0) {
      add(
        "inactive",
        "is switched off but still holds " +
          row.people +
          (row.people === 1 ? " person" : " people"),
        "danger",
        row.people
      );
    }

    if (row.overdue > 0) {
      add(
        "overdue",
        row.overdue +
          (row.overdue === 1 ? " task is late" : " tasks are late") +
          " (" +
          row.lateRate +
          "% of the open work)",
        "danger",
        row.overdue
      );
    }

    // Nobody works here. It is not broken, but a department without a single
    // person is a name and not a team.
    if (row.people === 0 && row.status === "active") {
      add("empty", "has nobody in it yet", "warning", 0);
    }

    if (row.pendingLeaves > 0) {
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

    // More than five open tasks per head is where a team starts to queue.
    if (row.people > 0 && row.openPerPerson > 5) {
      add(
        "load",
        "carries " +
          formatAverage(row.openPerPerson) +
          " open tasks per person",
        "warning",
        row.openPerPerson
      );
    }

    if (row.teamsWithoutLead > 0) {
      add(
        "lead",
        row.teamsWithoutLead +
          (row.teamsWithoutLead === 1
            ? " team has no lead"
            : " teams have no lead"),
        "warning",
        row.teamsWithoutLead
      );
    }

    if (row.people > 0 && row.teams === 0) {
      add("noteam", "has people but not a single team", "info", row.people);
    } else if (row.notInTeam > 0) {
      add(
        "outside",
        row.notInTeam +
          (row.notInTeam === 1 ? " person is" : " people are") +
          " in no team",
        "info",
        row.notInTeam
      );
    }

    // The whole department is still an open page in today's attendance.
    if (row.people > 0 && row.not_marked === row.people) {
      add("attendance", "has nobody marked in today's attendance", "info", row.people);
    }
  });

  items.sort((left, right) => {
    if (toneWeight(right.tone) !== toneWeight(left.tone)) {
      return toneWeight(right.tone) - toneWeight(left.tone);
    }
    return right.value - left.value;
  });

  return items;
}

// ---------------------------------------------------------------------------
// One department on its own
// ---------------------------------------------------------------------------

// One person of the department, with the work they are holding right now.
export interface DepartmentPerson {
  id: string;
  name: string;
  photo: string;
  designation: string;
  open: number;
  overdue: number;
  completed: number;
}

// The people of one department, the fullest hands first.
//
// The drill-down panel draws the first handful of them as bars, so a lead can
// see in one look who is buried and who is free.
export function buildDepartmentPeople(
  departmentId: string,
  employees: Employee[],
  tasks: Task[]
): DepartmentPerson[] {
  const people = employees.filter(
    (employee) =>
      employee.department?._id === departmentId && employee.status === "active"
  );

  const rows = people.map((employee) => {
    const ownTasks = tasks.filter(
      (task) => task.assignedTo?._id === employee._id
    );

    return {
      id: employee._id,
      name: employee.name,
      photo: employee.photo,
      designation: employee.designation,
      open: ownTasks.filter((task) => isTaskOpen(task)).length,
      overdue: ownTasks.filter((task) => isTaskLate(task)).length,
      completed: ownTasks.filter((task) => task.status === "completed").length,
    };
  });

  rows.sort((left, right) => {
    if (right.open !== left.open) {
      return right.open - left.open;
    }
    return left.name.localeCompare(right.name);
  });

  return rows;
}

// The teams of one department, biggest first. The lead is counted with the
// members, because a lead is a person in the room too.
export function buildDepartmentTeams(departmentId: string, teams: Team[]) {
  const ownTeams = teams.filter((team) => team.department?._id === departmentId);

  const rows = ownTeams.map((team) => ({
    id: team._id,
    name: team.name,
    leadName: team.teamLead ? team.teamLead.name : "",
    leadPhoto: team.teamLead ? team.teamLead.photo : "",
    status: team.status,
    size: (team.members || []).length + (team.teamLead ? 1 : 0),
  }));

  rows.sort((left, right) => {
    if (right.size !== left.size) {
      return right.size - left.size;
    }
    return left.name.localeCompare(right.name);
  });

  return rows;
}
