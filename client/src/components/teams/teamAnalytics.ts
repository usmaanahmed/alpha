// Everything the team dashboard counts.
//
// The page has no endpoint of its own. The lists it reads (the teams, the
// employees, the tasks, the attendance of today, the leave requests) are the
// very same queries the module pages already load, so a number on this
// dashboard can never disagree with the number on the page it came from.
//
// One thing has to be said out loud, because the whole page rests on it: a
// task does not belong to a team. It is given to a PERSON. So "the work of a
// team" here means the work its people are holding right now — the tasks of
// its lead and of its members added up. That is the only honest reading, and
// it is why moving somebody into another team moves their work with them.
//
// Every function here takes plain lists and gives back plain objects. Nothing
// in this file talks to the server or to React, which is why the tiles stay
// short: they only draw what is worked out here.

import type { Team, TeamPerson } from "@/types/team.types";
import type { Employee } from "@/types/employee.types";
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

// One colour per team, handed out in the order of the ranking: the biggest
// team gets the first colour, the second biggest the second one, and so on.
// They are never shuffled, so a team keeps the SAME colour in every tile of
// this page — the ring, the bars, the bubbles and the cards all point at the
// same team with the same colour.
//
// The eight hexes are the ones the department dashboard already uses, in
// exactly this order. They were run through a colour blindness check together,
// and they work on the light and on the dark theme, which is why one list is
// enough for both.
export const TEAM_COLORS = [
  "#6366f1",
  "#d97706",
  "#0284c7",
  "#dc2626",
  "#059669",
  "#d946ef",
  "#0d9488",
  "#7c3aed",
];

// The grey of everything that is not one single team: the "other teams"
// bundle of the ring, and the people no team claims.
export const REST_COLOR = "#94a3b8";

// A workspace can have more teams than we have colours. The ones past the end
// of the list share the grey, and they are always the small ones, because the
// list is ranked before the colours are handed out.
export function colorForRank(rank: number) {
  if (rank < TEAM_COLORS.length) {
    return TEAM_COLORS[rank];
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

// Where one person of a team stands today.
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

export function presenceLabel(key: PresenceKey) {
  const found = PRESENCE_COLORS.find((item) => item.key === key);
  return found ? found.label : key;
}

export function presenceColor(key: PresenceKey) {
  const found = PRESENCE_COLORS.find((item) => item.key === key);
  return found ? found.color : REST_COLOR;
}

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

// Midnight of today, so "this year" and "how long here" are the same moment
// for every team of the page.
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
// One person of a team
// ---------------------------------------------------------------------------

// Everything this page knows about ONE person inside ONE team.
//
// The name, the picture and the job title come from the team itself: the
// server sends them filled in, so the roster can be drawn even by somebody
// whose role does not open the employee module. The department, the joining
// date and the work only appear when those lists were readable, and they are
// simply empty otherwise.
export interface TeamPersonRow {
  id: string;
  name: string;
  photo: string;
  designation: string;
  // The lead is a person of the team too, they are just not one of the
  // members. Everything below is counted for them exactly like for anybody
  // else.
  isLead: boolean;
  // Somebody who left the company can still be sitting in a team nobody
  // cleaned up. They are kept in the roster and marked, because hiding them
  // would hide the problem.
  isActive: boolean;

  // --- From the employee list, when it is readable --------------------
  departmentName: string;
  // True when this person's own department is NOT the department of the team
  // they sit in. It is not forbidden, but it is worth knowing.
  isOutsideDepartment: boolean;
  // How long this person has been in the company, in months.
  months: number;
  hasJoiningDate: boolean;

  // --- The work they are holding --------------------------------------
  tasks: number;
  open: number;
  overdue: number;
  completed: number;

  // --- Today ----------------------------------------------------------
  presence: PresenceKey;
}

// ---------------------------------------------------------------------------
// One team, read from every module at once
// ---------------------------------------------------------------------------

// Everything this page knows about ONE team.
//
// It is built once, in buildTeamRows below, and then shared by every tile. So
// the ring, the bars, the bubbles and the cards can never tell three different
// stories about the same team: they all read this row.
export interface TeamRow {
  id: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  // The colour this team carries on the whole page.
  color: string;
  departmentId: string;
  departmentName: string;

  // --- The people -----------------------------------------------------
  lead: TeamPersonRow | null;
  // The lead first, then the members, the fullest hands first.
  people: TeamPersonRow[];
  // Everybody in the room, the lead counted with them.
  size: number;
  // Of them: how many still work here, and how many have left.
  activeSize: number;
  leftPeople: number;
  // People whose own department is not the department of this team.
  outsidePeople: number;
  // How long the active people have been in the company, on average, in
  // months, and how long the team itself has existed.
  averageTenure: number;
  ageMonths: number;

  // --- The work its people are holding --------------------------------
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
  // The person holding the most open work, and the share of the team's open
  // work that sits on them alone. A share near 100% is a team where one
  // person is carrying everybody.
  busiestName: string;
  busiestOpen: number;
  loadShare: number;
  // The even share, for comparison: what one person would hold if the work
  // were split equally. 4 people -> 25%.
  evenShare: number;
  // People of the team with no open task at all.
  freePeople: number;

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
export interface TeamInput {
  teams: Team[];
  employees: Employee[];
  tasks: Task[];
  attendanceToday: Attendance[];
  leaves: LeaveRequest[];
}

// Build one row per team, biggest team first.
//
// The ranking is what decides the colours, so it happens before they are
// handed out: the biggest team is the first colour of the list on every tile
// of the page.
export function buildTeamRows(input: TeamInput): TeamRow[] {
  const today = startOfToday();
  const thisYear = today.getFullYear();

  const rows = input.teams.map((team) => {
    // --- Who is in the room -------------------------------------------
    //
    // The lead first, then the members. The same person could in theory be
    // written in both places, so an id is only taken once: counting somebody
    // twice would make the team look bigger than the room really is.
    const roster: { person: TeamPerson; isLead: boolean }[] = [];

    if (team.teamLead) {
      roster.push({ person: team.teamLead, isLead: true });
    }

    (team.members || []).forEach((member) => {
      const alreadyThere = roster.some(
        (entry) => entry.person._id === member._id
      );

      if (!alreadyThere) {
        roster.push({ person: member, isLead: false });
      }
    });

    // --- Every person of the team, read from every module --------------
    const people: TeamPersonRow[] = roster.map((entry) => {
      const person = entry.person;

      // The employee record, when this person's role opens the employee
      // module. Without it we still know the name, the picture and the job
      // title, because the team itself carries them.
      const employee = input.employees.find(
        (item) => item._id === person._id
      );

      const ownTasks = input.tasks.filter(
        (task) => task.assignedTo?._id === person._id
      );

      const attendanceRow = input.attendanceToday.find(
        (row) => employeeIdOfAttendance(row) === person._id
      );

      const joiningDate = employee?.joiningDate || null;

      return {
        id: person._id,
        name: person.name,
        photo: person.photo,
        designation: person.designation,
        isLead: entry.isLead,
        isActive: person.status === "active",

        departmentName: employee?.department?.name || "",
        isOutsideDepartment:
          !!employee?.department &&
          !!team.department &&
          employee.department._id !== team.department._id,
        months: joiningDate ? monthsSince(new Date(joiningDate)) : 0,
        hasJoiningDate: joiningDate !== null,

        tasks: ownTasks.length,
        open: ownTasks.filter((task) => isTaskOpen(task)).length,
        overdue: ownTasks.filter((task) => isTaskLate(task)).length,
        completed: ownTasks.filter((task) => task.status === "completed")
          .length,

        presence: attendanceRow ? attendanceRow.status : "not_marked",
      };
    });

    // The lead stays on top, and under them the fullest hands first: that is
    // the order the roster and the load chart both read.
    people.sort((left, right) => {
      if (left.isLead !== right.isLead) {
        return left.isLead ? -1 : 1;
      }
      if (right.open !== left.open) {
        return right.open - left.open;
      }
      return left.name.localeCompare(right.name);
    });

    const activePeople = people.filter((person) => person.isActive);

    // --- How long the team has been together ---------------------------
    let tenureTotal = 0;
    let tenureCount = 0;

    activePeople.forEach((person) => {
      if (!person.hasJoiningDate) {
        return;
      }
      tenureTotal += person.months;
      tenureCount += 1;
    });

    // --- The work its people are holding -------------------------------
    //
    // A task belongs to a person, so the work of the team is the work of the
    // people in it. The ids are collected once and the task list is then read
    // one single time, instead of once per person.
    const peopleIds = people.map((person) => person.id);

    const teamTasks = input.tasks.filter(
      (task) => !!task.assignedTo && peopleIds.includes(task.assignedTo._id)
    );

    const openTasks = teamTasks.filter((task) => isTaskOpen(task));
    const overdueTasks = teamTasks.filter((task) => isTaskLate(task));

    const completed = teamTasks.filter(
      (task) => task.status === "completed"
    ).length;
    const cancelled = teamTasks.filter(
      (task) => task.status === "cancelled"
    ).length;

    // A cancelled task was never finished and never will be, so it is left
    // out of the "how much of the work is done" question. Counting it would
    // punish a team for dropping work it was right to drop.
    const realTasks = teamTasks.length - cancelled;

    // Who is carrying the most. The roster is already sorted by open work, but
    // the lead was pinned on top of it, so the busiest person is looked for
    // and not simply taken from the front.
    //
    // A team where nobody holds anything leaves the name empty, and that is
    // fine: the tiles only ever write this name when there is open work.
    let busiestName = "";
    let busiestOpen = 0;

    people.forEach((person) => {
      if (person.open > busiestOpen) {
        busiestOpen = person.open;
        busiestName = person.name;
      }
    });

    // --- Where those people stand today --------------------------------
    function countPresence(key: PresenceKey) {
      return activePeople.filter((person) => person.presence === key).length;
    }

    // --- The leaves of its people --------------------------------------
    const teamLeaves = input.leaves.filter((leave) =>
      peopleIds.includes(leave.employee._id)
    );

    let leaveDays = 0;

    teamLeaves.forEach((leave) => {
      // A partly approved leave counts too: its approved days are real days
      // off, and totalDays already holds only those.
      if (!isApprovedLeave(leave.status)) {
        return;
      }

      if (new Date(leave.fromDate).getFullYear() === thisYear) {
        leaveDays += leave.totalDays;
      }
    });

    const row: TeamRow = {
      id: team._id,
      name: team.name,
      description: team.description,
      status: team.status,
      createdAt: team.createdAt,
      // The real colour is written below, once the ranking is known.
      color: REST_COLOR,
      departmentId: team.department ? team.department._id : "",
      departmentName: team.department ? team.department.name : "",

      lead: people.find((person) => person.isLead) || null,
      people: people,
      size: people.length,
      activeSize: activePeople.length,
      leftPeople: people.length - activePeople.length,
      outsidePeople: people.filter((person) => person.isOutsideDepartment)
        .length,
      averageTenure:
        tenureCount === 0 ? 0 : Math.round(tenureTotal / tenureCount),
      ageMonths: monthsSince(new Date(team.createdAt)),

      tasks: teamTasks.length,
      todo: teamTasks.filter((task) => task.status === "todo").length,
      in_progress: teamTasks.filter((task) => task.status === "in_progress")
        .length,
      in_review: teamTasks.filter((task) => task.status === "in_review").length,
      completed: completed,
      cancelled: cancelled,
      open: openTasks.length,
      overdue: overdueTasks.length,
      doneRate: percentOf(completed, realTasks),
      lateRate: percentOf(overdueTasks.length, openTasks.length),
      openPerPerson:
        people.length === 0 ? 0 : openTasks.length / people.length,
      busiestName: busiestName,
      busiestOpen: busiestOpen,
      loadShare: percentOf(busiestOpen, openTasks.length),
      evenShare: people.length === 0 ? 0 : Math.round(100 / people.length),
      freePeople: people.filter((person) => person.open === 0).length,

      present: countPresence("present"),
      half_day: countPresence("half_day"),
      on_leave: countPresence("on_leave"),
      absent: countPresence("absent"),
      holiday: countPresence("holiday"),
      not_marked: countPresence("not_marked"),

      pendingLeaves: teamLeaves.filter((leave) => leave.status === "pending")
        .length,
      leaveDays: leaveDays,
    };

    return row;
  });

  // The biggest team first. Two teams of the same size stay in alphabetical
  // order, so the page never shuffles them between two reads.
  rows.sort((left, right) => {
    if (right.size !== left.size) {
      return right.size - left.size;
    }
    return left.name.localeCompare(right.name);
  });

  // Now that the ranking is fixed, every team gets its colour.
  rows.forEach((row, index) => {
    row.color = colorForRank(index);
  });

  return rows;
}

// ---------------------------------------------------------------------------
// The banner
// ---------------------------------------------------------------------------

// The figures written across the top of the page, before any chart is read.
export interface TeamHeadline {
  teams: number;
  activeTeams: number;
  // Teams with nobody in them at all.
  emptyTeams: number;
  teamsWithoutLead: number;
  // How many different people sit in a team. Somebody who is in two teams is
  // still one person, so this is not the sum of the team sizes.
  people: number;
  // Active employees who are in no team at all. It stays 0 for somebody whose
  // role does not open the employee module, because we then cannot know.
  peopleWithoutTeam: number;
  // Whether the line above could be worked out at all.
  knowsEveryone: boolean;
  averageSize: number;
  biggest: TeamRow | null;
  departments: number;
  openTasks: number;
  overdueTasks: number;
  awayToday: number;
  inToday: number;
  pendingLeaves: number;
}

export function buildTeamHeadline(
  rows: TeamRow[],
  employees: Employee[]
): TeamHeadline {
  // Everybody who sits in a team, each person counted once even when they are
  // written in two of them.
  const peopleIds: string[] = [];
  const departmentIds: string[] = [];

  let openTasks = 0;
  let overdueTasks = 0;
  let awayToday = 0;
  let inToday = 0;
  let pendingLeaves = 0;
  let size = 0;

  rows.forEach((row) => {
    row.people.forEach((person) => {
      if (!peopleIds.includes(person.id)) {
        peopleIds.push(person.id);
      }
    });

    if (row.departmentId && !departmentIds.includes(row.departmentId)) {
      departmentIds.push(row.departmentId);
    }

    size += row.size;
    openTasks += row.open;
    overdueTasks += row.overdue;
    awayToday += row.on_leave + row.absent;
    inToday += row.present + row.half_day;
    pendingLeaves += row.pendingLeaves;
  });

  const activeEmployees = employees.filter(
    (employee) => employee.status === "active"
  );

  let peopleWithoutTeam = 0;

  activeEmployees.forEach((employee) => {
    if (!peopleIds.includes(employee._id)) {
      peopleWithoutTeam += 1;
    }
  });

  return {
    teams: rows.length,
    activeTeams: rows.filter((row) => row.status === "active").length,
    emptyTeams: rows.filter((row) => row.size === 0).length,
    teamsWithoutLead: rows.filter((row) => row.lead === null).length,
    people: peopleIds.length,
    peopleWithoutTeam: peopleWithoutTeam,
    knowsEveryone: employees.length > 0,
    averageSize: rows.length === 0 ? 0 : size / rows.length,
    biggest: rows.length > 0 && rows[0].size > 0 ? rows[0] : null,
    departments: departmentIds.length,
    openTasks: openTasks,
    overdueTasks: overdueTasks,
    awayToday: awayToday,
    inToday: inToday,
    pendingLeaves: pendingLeaves,
  };
}

// ---------------------------------------------------------------------------
// The departments, read through their teams
// ---------------------------------------------------------------------------

// One department, and how much of it is organised into teams.
export interface CoverageRow {
  id: string;
  name: string;
  // Active people of this department.
  people: number;
  // Of them: how many sit in one of its teams, and how many sit in none.
  inTeam: number;
  notInTeam: number;
  teams: number;
  teamsWithoutLead: number;
}

// Which departments are cut into teams, and which ones are not.
//
// The list of departments is not asked for: a department is named either by a
// team that lives in it or by a person who works in it, and those two lists
// are already here. A department with no team AND no person would be missing,
// but it is also a department that has nothing to cover.
export function buildCoverageRows(
  teams: Team[],
  employees: Employee[]
): CoverageRow[] {
  const rows: CoverageRow[] = [];

  function findOrAdd(id: string, name: string) {
    const existing = rows.find((row) => row.id === id);

    if (existing) {
      return existing;
    }

    const created: CoverageRow = {
      id: id,
      name: name,
      people: 0,
      inTeam: 0,
      notInTeam: 0,
      teams: 0,
      teamsWithoutLead: 0,
    };

    rows.push(created);
    return created;
  }

  // Every department that has a team in it.
  teams.forEach((team) => {
    if (!team.department) {
      return;
    }

    const row = findOrAdd(team.department._id, team.department.name);

    row.teams += 1;

    if (!team.teamLead) {
      row.teamsWithoutLead += 1;
    }
  });

  // Everybody who sits in any team, each id kept once.
  const peopleInTeams: string[] = [];

  teams.forEach((team) => {
    if (team.teamLead && !peopleInTeams.includes(team.teamLead._id)) {
      peopleInTeams.push(team.teamLead._id);
    }

    (team.members || []).forEach((member) => {
      if (!peopleInTeams.includes(member._id)) {
        peopleInTeams.push(member._id);
      }
    });
  });

  // Every department that has a person in it. Somebody who left does not sit
  // in a department any more, so they are not counted.
  employees.forEach((employee) => {
    if (employee.status !== "active" || !employee.department) {
      return;
    }

    const row = findOrAdd(employee.department._id, employee.department.name);

    row.people += 1;

    if (peopleInTeams.includes(employee._id)) {
      row.inTeam += 1;
    } else {
      row.notInTeam += 1;
    }
  });

  // The department with the most people first.
  rows.sort((left, right) => {
    if (right.people !== left.people) {
      return right.people - left.people;
    }
    return left.name.localeCompare(right.name);
  });

  return rows;
}

// ---------------------------------------------------------------------------
// How the open work is split inside a team
// ---------------------------------------------------------------------------

// How many people the load chart draws per team before it bundles the rest.
// A team of twenty would otherwise turn one bar into a rainbow nobody can
// read.
const MAX_SEGMENTS = 8;

// One block of a team's load bar: one person, and the open work on them.
export interface LoadSegment {
  name: string;
  open: number;
}

// One bar of the load chart.
//
// The blocks are written as m0, m1, m2... because recharts needs a fixed key
// per piece of a stacked bar, and every team has a different number of people.
// The names behind those keys are kept in `segments`, which is what the
// tooltip reads.
export interface LoadRow {
  id: string;
  name: string;
  color: string;
  open: number;
  size: number;
  loadShare: number;
  evenShare: number;
  segments: LoadSegment[];
  // m0, m1, m2 ... one number per drawn block.
  [key: string]: string | number | LoadSegment[];
}

// Turn every team into one bar made of one block per person.
//
// Only the teams that are actually holding open work get a bar: a row of zeros
// under a name says nothing, and the tiles above already count the teams with
// nothing to do.
export function buildLoadRows(rows: TeamRow[]) {
  const loadRows: LoadRow[] = [];

  rows.forEach((row) => {
    if (row.open === 0) {
      return;
    }

    // The fullest hands first, so a bar is read left to right from the person
    // carrying the most to the person carrying the least.
    const carrying = row.people
      .filter((person) => person.open > 0)
      .sort((left, right) => right.open - left.open);

    const segments: LoadSegment[] = [];

    carrying.forEach((person, index) => {
      if (index < MAX_SEGMENTS) {
        segments.push({ name: person.name, open: person.open });
        return;
      }

      // Everybody past the eighth is added into one last block, so the bar
      // still adds up to the whole open work of the team.
      const last = segments[MAX_SEGMENTS];

      if (last) {
        last.name = "and " + (carrying.length - MAX_SEGMENTS) + " more";
        last.open += person.open;
      } else {
        segments.push({ name: "and 1 more", open: person.open });
      }
    });

    const loadRow: LoadRow = {
      id: row.id,
      name: row.name,
      color: row.color,
      open: row.open,
      size: row.size,
      loadShare: row.loadShare,
      evenShare: row.evenShare,
      segments: segments,
    };

    segments.forEach((segment, index) => {
      loadRow["m" + index] = segment.open;
    });

    loadRows.push(loadRow);
  });

  // The team holding the most open work on top.
  loadRows.sort((left, right) => {
    if (right.open !== left.open) {
      return right.open - left.open;
    }
    return left.name.localeCompare(right.name);
  });

  return loadRows;
}

// How many blocks the widest bar of the chart has. The chart draws that many
// <Bar> pieces, and a team with fewer people simply has nothing under the
// last keys.
export function countLoadSegments(loadRows: LoadRow[]) {
  let most = 0;

  loadRows.forEach((row) => {
    if (row.segments.length > most) {
      most = row.segments.length;
    }
  });

  return most;
}

// The blocks of one bar fade from the full colour of the team to a pale one,
// so the person carrying the most is the darkest block and the eye lands on
// them first. It is only a shade of the same colour: the tooltip and the
// roster are what name the people.
export function segmentOpacity(index: number) {
  const opacity = 1 - index * 0.11;

  if (opacity < 0.3) {
    return 0.3;
  }
  return opacity;
}

// ---------------------------------------------------------------------------
// What needs somebody to look at it
// ---------------------------------------------------------------------------

// One line of the attention panel: which team, what is wrong, and how bad it
// is.
export interface AttentionItem {
  // React needs a key, and one team can raise several lines.
  key: string;
  teamId: string;
  teamName: string;
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
// This is the one tile of the page that draws no chart, because "two teams
// have no lead" is a sentence and not a shape. Every line it writes comes from
// a number that is also somewhere on a chart above it.
export function buildTeamAttentionItems(rows: TeamRow[]): AttentionItem[] {
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
        teamId: row.id,
        teamName: row.name,
        color: row.color,
        text: text,
        tone: tone,
        value: value,
      });
    }

    // A team with nobody at its head. Nothing else on this page matters as
    // much: a team without a lead has nobody to answer for its work.
    if (!row.lead && row.size > 0) {
      add(
        "lead",
        "has " +
          row.size +
          (row.size === 1 ? " person" : " people") +
          " and nobody leading them",
        "danger",
        row.size
      );
    }

    // A team that was switched off but still holds people.
    if (row.status === "inactive" && row.size > 0) {
      add(
        "inactive",
        "is switched off but still holds " +
          row.size +
          (row.size === 1 ? " person" : " people"),
        "danger",
        row.size
      );
    }

    if (row.overdue > 0) {
      add(
        "overdue",
        row.overdue +
          (row.overdue === 1 ? " task is late" : " tasks are late") +
          " (" +
          row.lateRate +
          "% of its open work)",
        "danger",
        row.overdue
      );
    }

    // Somebody who left the company is still written in this team.
    if (row.leftPeople > 0) {
      add(
        "left",
        row.leftPeople +
          (row.leftPeople === 1 ? " person has" : " people have") +
          " left the company but are still in it",
        "danger",
        row.leftPeople
      );
    }

    // Nobody is in it. It is not broken, but a team without a single person
    // is a name and not a team.
    if (row.size === 0) {
      add("empty", "has nobody in it yet", "warning", 0);
    }

    // One person is carrying the team. Two thirds is where it stops being a
    // shared load and starts being one person's problem.
    if (row.open > 2 && row.size > 1 && row.loadShare >= 66) {
      add(
        "load",
        row.busiestName +
          " alone holds " +
          row.loadShare +
          "% of its open work",
        "warning",
        row.loadShare
      );
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
    if (row.size > 0 && row.openPerPerson > 5) {
      add(
        "queue",
        "carries " +
          formatAverage(row.openPerPerson) +
          " open tasks per person",
        "warning",
        row.openPerPerson
      );
    }

    if (row.outsidePeople > 0) {
      add(
        "outside",
        row.outsidePeople +
          (row.outsidePeople === 1 ? " person comes" : " people come") +
          " from another department",
        "info",
        row.outsidePeople
      );
    }

    if (row.size > 0 && row.tasks === 0) {
      add("nowork", "has not been given a single task", "info", row.size);
    } else if (row.freePeople > 0 && row.open > 0) {
      add(
        "free",
        row.freePeople +
          (row.freePeople === 1 ? " person has" : " people have") +
          " nothing open while the team still has " +
          row.open,
        "info",
        row.freePeople
      );
    }

    // The whole team is still an open page in today's attendance.
    if (row.activeSize > 0 && row.not_marked === row.activeSize) {
      add(
        "attendance",
        "has nobody marked in today's attendance",
        "info",
        row.activeSize
      );
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
