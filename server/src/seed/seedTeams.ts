import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Organization } from "../modules/organization/organization.model.js";
import { Department } from "../modules/department/department.model.js";
import { Role } from "../modules/role/role.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { User } from "../modules/user/user.model.js";
import { Team } from "../modules/team/team.model.js";
import { Task } from "../modules/task/task.model.js";
import type { TaskPriority, TaskStatus } from "../modules/task/task.model.js";
import { Attendance } from "../modules/attendance/attendance.model.js";
import type { AttendanceStatus } from "../modules/attendance/attendance.model.js";
import { LeaveType } from "../modules/leaveType/leaveType.model.js";
import { LeaveRequest } from "../modules/leave/leave.model.js";
import { hashPassword } from "../utils/password.util.js";
import { todayStart } from "../utils/date.util.js";

// Run this file with "npm run seed:teams".
//
// It fills one organization with a whole cast of people and the seven teams
// they work in, so the team dashboard has something real to draw. Every tile
// of that page is answered by something in this file:
//
//   the ring      -> seven teams of very different sizes, and four people who
//                    are in no team at all
//   the coverage  -> teams in some departments and none in the others
//   the workload  -> every task status, spread over the teams
//   the panel     -> a switched-off team that still holds people, somebody who
//                    left the company but is still in a team, late work, leave
//                    requests waiting for an answer, a one-person team that is
//                    drowning
//   the split     -> one team where a single person holds two thirds of the
//                    open work, next to one that shares it evenly
//   the delivery  -> a team that finishes almost everything, and one that is
//                    late on almost everything
//   the presence  -> today marked as present, half day, on leave, absent and
//                    holiday, and one team nobody marked at all
//   the focus     -> a lead, a roster, and a member who comes from another
//                    department
//
// EVERYTHING this script makes can be recognised again:
//   - the employees have an email that ends with "@teamseed.local"
//   - the teams are the ones led by those employees
//   - the tasks carry the tag "seed-team"
//   - the attendance rows and the leave requests belong to those employees
//
// So the first thing the script does is delete what a previous run made. You
// can run it as many times as you like without making copies, and your own
// people, teams and tasks are never touched.

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// The email domain that marks a person as made by this seed. Nobody real will
// ever have an address here, which is what makes the clean-up safe.
const SEED_DOMAIN = "@teamseed.local";

// The password every seeded employee logs in with.
const SEED_PASSWORD = "Seed@12345";

// The tag every seeded task carries.
const SEED_TAG = "seed-team";

// A new Date a number of days after today, at noon so the date can never slip
// to the day before or after because of the timezone.
function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

// The day a number of months ago, as midnight UTC. That is how the app saves
// a joining date, so the "how long has this person been here" figures on the
// dashboard read the same way as for a real employee.
function monthsAgo(months: number) {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 15)
  );
}

// ---------------------------------------------------------------------------
// The cast: who works here
// ---------------------------------------------------------------------------

// One person the seed creates.
//
// "key" is only used inside this file, so the team list below can point at a
// person without repeating their name. "monthsHere" becomes the joining date,
// which is what the "average time in the company" figures are counted from.
interface PersonPlan {
  key: string;
  name: string;
  department: string;
  designation: string;
  // The name of the role this person gets. The seed looks it up in the roles
  // of the organization and falls back on any active role.
  roleName: string;
  monthsHere: number;
  gender: "male" | "female";
  employmentType: "full_time" | "part_time" | "intern" | "contract";
  // Somebody who does not work here any more. They keep their team on
  // purpose: a team still holding a person who left is exactly the kind of
  // thing the dashboard has to shout about.
  hasLeft?: boolean;
}

const PEOPLE: PersonPlan[] = [
  // --- Engineering ---------------------------------------------------
  {
    key: "adnan",
    name: "Adnan Raza",
    department: "Engineering",
    designation: "Engineering Lead",
    roleName: "Manager",
    monthsHere: 41,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "sara",
    name: "Sara Iqbal",
    department: "Engineering",
    designation: "Senior Backend Developer",
    roleName: "Developer",
    monthsHere: 28,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "bilal",
    name: "Bilal Khan",
    department: "Engineering",
    designation: "Backend Developer",
    roleName: "Developer",
    monthsHere: 14,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "hina",
    name: "Hina Aslam",
    department: "Engineering",
    designation: "DevOps Engineer",
    roleName: "Developer",
    monthsHere: 9,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "zoya",
    name: "Zoya Malik",
    department: "Engineering",
    designation: "Junior Developer",
    roleName: "Employee",
    monthsHere: 3,
    gender: "female",
    employmentType: "intern",
  },
  {
    key: "faisal",
    name: "Faisal Ahmed",
    department: "Engineering",
    designation: "Frontend Lead",
    roleName: "Manager",
    monthsHere: 33,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "nida",
    name: "Nida Shah",
    department: "Engineering",
    designation: "Frontend Developer",
    roleName: "Developer",
    monthsHere: 19,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "omar",
    name: "Omar Siddiqui",
    department: "Engineering",
    designation: "Frontend Developer",
    roleName: "Developer",
    monthsHere: 7,
    gender: "male",
    employmentType: "contract",
  },
  {
    key: "rida",
    name: "Rida Karim",
    department: "Engineering",
    designation: "QA Lead",
    roleName: "Manager",
    monthsHere: 22,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "talha",
    name: "Talha Javed",
    department: "Engineering",
    designation: "QA Engineer",
    roleName: "Employee",
    monthsHere: 5,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "ali",
    name: "Ali Hassan",
    department: "Engineering",
    designation: "Data Engineer",
    roleName: "Manager",
    monthsHere: 16,
    gender: "male",
    employmentType: "full_time",
  },
  {
    // This one sits in Engineering but works inside the design team, which is
    // what makes the "comes from another department" line appear.
    key: "kamran",
    name: "Kamran Butt",
    department: "Engineering",
    designation: "UI Engineer",
    roleName: "Developer",
    monthsHere: 11,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "danish",
    name: "Danish Iqbal",
    department: "Engineering",
    designation: "Mobile Developer",
    roleName: "Developer",
    monthsHere: 6,
    gender: "male",
    employmentType: "full_time",
  },

  // --- Design --------------------------------------------------------
  {
    key: "mahnoor",
    name: "Mahnoor Ali",
    department: "Design",
    designation: "Design Lead",
    roleName: "Manager",
    monthsHere: 26,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "hamza",
    name: "Hamza Sheikh",
    department: "Design",
    designation: "Product Designer",
    roleName: "Employee",
    monthsHere: 13,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "areeba",
    name: "Areeba Khan",
    department: "Design",
    designation: "Content Designer",
    roleName: "Employee",
    monthsHere: 2,
    gender: "female",
    employmentType: "part_time",
  },

  // --- Accounts ------------------------------------------------------
  {
    key: "sadia",
    name: "Sadia Noor",
    department: "Accounts",
    designation: "Accounts Manager",
    roleName: "Manager",
    monthsHere: 37,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "junaid",
    name: "Junaid Farooq",
    department: "Accounts",
    designation: "Accountant",
    roleName: "Employee",
    monthsHere: 18,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "rehan",
    name: "Rehan Ahmed",
    department: "Accounts",
    designation: "Accounts Assistant",
    roleName: "Employee",
    monthsHere: 24,
    gender: "male",
    employmentType: "full_time",
    hasLeft: true,
  },
  {
    key: "tariq",
    name: "Tariq Mehmood",
    department: "Accounts",
    designation: "Payroll Officer",
    roleName: "Employee",
    monthsHere: 8,
    gender: "male",
    employmentType: "full_time",
  },

  // --- IT ------------------------------------------------------------
  {
    key: "ayesha",
    name: "Ayesha Tariq",
    department: "IT",
    designation: "Support Lead",
    roleName: "Manager",
    monthsHere: 30,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "shahzeb",
    name: "Shahzeb Anwar",
    department: "IT",
    designation: "Support Engineer",
    roleName: "Employee",
    monthsHere: 10,
    gender: "male",
    employmentType: "full_time",
  },
  {
    key: "marium",
    name: "Marium Zia",
    department: "IT",
    designation: "Support Engineer",
    roleName: "Employee",
    monthsHere: 4,
    gender: "female",
    employmentType: "full_time",
  },
  {
    key: "saad",
    name: "Saad Munir",
    department: "IT",
    designation: "System Administrator",
    roleName: "Employee",
    monthsHere: 21,
    gender: "male",
    employmentType: "full_time",
  },
];

// ---------------------------------------------------------------------------
// The rooms: which team each of them works in
// ---------------------------------------------------------------------------

interface TeamPlan {
  name: string;
  description: string;
  department: string;
  status: "active" | "inactive";
  // The keys of the cast above.
  lead: string;
  members: string[];
}

const TEAMS: TeamPlan[] = [
  {
    // The big one, and the one where a single person carries the load.
    name: "Platform Squad",
    description: "The api, the database and everything the product stands on.",
    department: "Engineering",
    status: "active",
    lead: "adnan",
    members: ["sara", "bilal", "hina", "zoya"],
  },
  {
    // The healthy one: the work is shared evenly.
    name: "Frontend Guild",
    description: "The screens the customer actually touches.",
    department: "Engineering",
    status: "active",
    lead: "faisal",
    members: ["nida", "omar"],
  },
  {
    // The one that is late on almost everything.
    name: "QA Circle",
    description: "Nothing goes out before this team has broken it once.",
    department: "Engineering",
    status: "active",
    lead: "rida",
    members: ["talha"],
  },
  {
    // A lead on his own. One person, six open tasks: the panel will say so.
    name: "Data Lab",
    description: "Reports, exports and the numbers the owner asks for.",
    department: "Engineering",
    status: "active",
    lead: "ali",
    members: [],
  },
  {
    // The one that finishes what it starts, with a member borrowed from
    // another department.
    name: "Design Studio",
    description: "The look of the product, from the first sketch to the css.",
    department: "Design",
    status: "active",
    lead: "mahnoor",
    members: ["hamza", "kamran"],
  },
  {
    // The one still holding somebody who left the company.
    name: "Payables Desk",
    description: "Bills in, cheques out, and the month closed on time.",
    department: "Accounts",
    status: "active",
    lead: "sadia",
    members: ["junaid", "rehan"],
  },
  {
    // Switched off, and still holding three people.
    name: "Support Line",
    description: "The old first-line support rota, kept for the records.",
    department: "IT",
    status: "inactive",
    lead: "ayesha",
    members: ["shahzeb", "marium"],
  },
];

// The four people who are in NO team at all. They are what the grey slice of
// the ring and the "in no team" bars of the coverage chart are made of.
const PEOPLE_WITHOUT_TEAM = ["danish", "areeba", "tariq", "saad"];

// ---------------------------------------------------------------------------
// The work: how much each of them is holding
// ---------------------------------------------------------------------------

// How many tasks one person gets, and what shape they are in.
//
// "late" is a part of "open" and not something on top of it: a late task is
// still an open task. That is the same rule the dashboard reads by, so the
// numbers on the page will match this table exactly.
interface WorkPlan {
  person: string;
  open: number;
  late: number;
  done: number;
  cancelled: number;
}

const WORK: WorkPlan[] = [
  // Platform Squad — 15 open, and 10 of them on Sara alone (67%).
  { person: "adnan", open: 2, late: 0, done: 2, cancelled: 0 },
  { person: "sara", open: 10, late: 3, done: 2, cancelled: 1 },
  { person: "bilal", open: 2, late: 1, done: 1, cancelled: 0 },
  { person: "hina", open: 1, late: 0, done: 1, cancelled: 0 },
  { person: "zoya", open: 0, late: 0, done: 1, cancelled: 0 },

  // Frontend Guild — 9 open, three each. Nothing to shout about, which is
  // the point: the load chart needs an even bar to compare against.
  { person: "faisal", open: 3, late: 0, done: 2, cancelled: 0 },
  { person: "nida", open: 3, late: 1, done: 2, cancelled: 0 },
  { person: "omar", open: 3, late: 0, done: 1, cancelled: 0 },

  // QA Circle — small, and late on four of its five open tasks.
  { person: "rida", open: 3, late: 2, done: 1, cancelled: 0 },
  { person: "talha", open: 2, late: 2, done: 0, cancelled: 0 },

  // Data Lab — one man, six open tasks.
  { person: "ali", open: 6, late: 1, done: 0, cancelled: 0 },

  // Design Studio — finishes almost everything it starts.
  { person: "mahnoor", open: 1, late: 0, done: 4, cancelled: 1 },
  { person: "hamza", open: 1, late: 0, done: 3, cancelled: 0 },
  { person: "kamran", open: 1, late: 0, done: 3, cancelled: 0 },

  // Payables Desk — including one task still sitting on the person who left.
  { person: "sadia", open: 2, late: 1, done: 2, cancelled: 0 },
  { person: "junaid", open: 2, late: 0, done: 1, cancelled: 0 },
  { person: "rehan", open: 1, late: 1, done: 0, cancelled: 0 },

  // Support Line — switched off, so almost nothing moves.
  { person: "ayesha", open: 1, late: 0, done: 1, cancelled: 0 },
  { person: "shahzeb", open: 1, late: 0, done: 0, cancelled: 0 },
  { person: "marium", open: 0, late: 0, done: 1, cancelled: 0 },

  // And the people who are in no team: they carry work too, so the workspace
  // figures are bigger than the teams added up.
  { person: "danish", open: 2, late: 0, done: 1, cancelled: 0 },
  { person: "areeba", open: 1, late: 0, done: 1, cancelled: 0 },
  { person: "tariq", open: 1, late: 1, done: 0, cancelled: 0 },
  { person: "saad", open: 0, late: 0, done: 1, cancelled: 0 },
];

// The titles the tasks are made from. They are handed out one after the other
// so the board reads like real work and not like "Task 1, Task 2, Task 3".
const TASK_TITLES = [
  "Fix the login redirect loop",
  "Split the invoice service in two",
  "Write the migration for the new index",
  "Review the pull request of the payment module",
  "Update the api documentation",
  "Chase the failing night build",
  "Add the export button to the report page",
  "Clean up the old feature flags",
  "Answer the tickets of last week",
  "Prepare the demo for the client call",
  "Redesign the empty states",
  "Cut the new release notes",
  "Move the images to the cdn",
  "Rewrite the search query",
  "Check the backup of the database",
  "Close the month in the ledger",
  "Reconcile the bank statement",
  "Send the reminder for the open invoices",
  "Draft the onboarding checklist",
  "Test the mobile layout on a small screen",
  "Fix the broken filter on the task board",
  "Collect the numbers for the quarterly report",
  "Refresh the icon set",
  "Set up the staging environment",
];

// The four priorities, handed out in turn so every colour of the board is
// used.
const PRIORITIES: TaskPriority[] = ["urgent", "high", "medium", "low"];

// The three statuses an open task can be in, also handed out in turn.
const OPEN_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review"];

// ---------------------------------------------------------------------------
// Today: who is in, and who is not
// ---------------------------------------------------------------------------

// The attendance of today. Whoever is not on this list is left unmarked on
// purpose — a day nobody answered for is a real thing, and the dashboard draws
// it grey. The whole QA Circle is missing from this list, so the panel can say
// "has nobody marked in today's attendance".
const TODAY: { person: string; status: AttendanceStatus }[] = [
  { person: "adnan", status: "present" },
  { person: "sara", status: "present" },
  { person: "bilal", status: "on_leave" },
  { person: "hina", status: "half_day" },
  { person: "zoya", status: "present" },
  { person: "faisal", status: "present" },
  { person: "nida", status: "on_leave" },
  { person: "omar", status: "absent" },
  { person: "ali", status: "present" },
  { person: "mahnoor", status: "present" },
  { person: "hamza", status: "half_day" },
  { person: "kamran", status: "present" },
  { person: "sadia", status: "present" },
  { person: "junaid", status: "absent" },
  { person: "ayesha", status: "holiday" },
  { person: "shahzeb", status: "present" },
  { person: "danish", status: "present" },
  { person: "areeba", status: "holiday" },
];

// ---------------------------------------------------------------------------
// The leave requests
// ---------------------------------------------------------------------------

// A few days off: two waiting for an answer, and three already approved.
//
// The two approved ones that cover today belong to the two people the list
// above marks "on leave", so the attendance and the leave module tell the same
// story instead of two different ones.
const LEAVES: {
  person: string;
  status: "pending" | "approved";
  fromDays: number;
  toDays: number;
  days: number;
  reason: string;
}[] = [
  {
    person: "bilal",
    status: "approved",
    fromDays: -1,
    toDays: 2,
    days: 4,
    reason: "Family wedding out of town.",
  },
  {
    person: "nida",
    status: "approved",
    fromDays: 0,
    toDays: 1,
    days: 2,
    reason: "Not well, resting at home.",
  },
  {
    person: "hamza",
    status: "approved",
    fromDays: -40,
    toDays: -36,
    days: 5,
    reason: "Holiday booked at the start of the year.",
  },
  {
    person: "sara",
    status: "pending",
    fromDays: 9,
    toDays: 13,
    days: 5,
    reason: "Trip with the family, booked already.",
  },
  {
    person: "sadia",
    status: "pending",
    fromDays: 4,
    toDays: 4,
    days: 1,
    reason: "Bank work that cannot be done after hours.",
  },
];

// ---------------------------------------------------------------------------
// The seed itself
// ---------------------------------------------------------------------------

async function seedTeams() {
  await connectDatabase();

  // -------------------------------------------------------------------
  // 1) Which organization gets the teams
  // -------------------------------------------------------------------
  //
  // We prefer the organization that already owns the newest task, so the seed
  // lands in the workspace you are actually looking at. If there is no task
  // yet we take the first organization in the database.
  const newestTask = await Task.findOne().sort({ createdAt: -1 });

  const organization = newestTask
    ? await Organization.findById(newestTask.organization)
    : await Organization.findOne();

  if (!organization) {
    console.log(
      "No organization found. Create an organization first, then run this seed."
    );
    await mongoose.disconnect();
    return;
  }

  const orgId = organization._id as mongoose.Types.ObjectId;

  console.log("Seeding teams for organization:", organization.name);

  // -------------------------------------------------------------------
  // 2) The roles the people are given
  // -------------------------------------------------------------------
  //
  // Every employee needs a role, and a role belongs to the organization. We
  // look for the ones the app creates by default; whatever is missing falls
  // back on any active role of this organization.
  const roles = await Role.find({ organization: orgId, status: "active" });

  if (roles.length === 0) {
    console.log(
      "This organization has no active role. Open the Roles page, add one, then run this seed again."
    );
    await mongoose.disconnect();
    return;
  }

  function roleIdFor(roleName: string) {
    const found = roles.find((role) => role.name === roleName);
    const role = found ? found : roles[0];
    return role._id as mongoose.Types.ObjectId;
  }

  // -------------------------------------------------------------------
  // 3) The departments the plan needs
  // -------------------------------------------------------------------
  //
  // A team lives inside one department, so the departments have to exist
  // before the teams do. The ones the organization already has are used as
  // they are; only the missing ones are created.
  const departmentNames: string[] = [];

  PEOPLE.forEach((person) => {
    if (!departmentNames.includes(person.department)) {
      departmentNames.push(person.department);
    }
  });

  // The department id of every name, so the rest of the script can look one
  // up without asking the database again.
  const departmentIdByName: Record<string, mongoose.Types.ObjectId> = {};

  for (const name of departmentNames) {
    const existing = await Department.findOne({
      organization: orgId,
      name: name,
    });

    if (existing) {
      departmentIdByName[name] = existing._id as mongoose.Types.ObjectId;
      continue;
    }

    const created = await Department.create({
      name: name,
      description: "Created by the team seed.",
      organization: orgId,
      status: "active",
    });

    departmentIdByName[name] = created._id as mongoose.Types.ObjectId;
    console.log("Created the missing department:", name);
  }

  // -------------------------------------------------------------------
  // 4) Remove what a previous run of this seed made
  // -------------------------------------------------------------------
  //
  // The order matters: the teams and the work are found THROUGH the seeded
  // employees, so the employees are the last thing to go.
  const oldEmployees = await Employee.find({
    organization: orgId,
    email: { $regex: SEED_DOMAIN + "$" },
  });

  if (oldEmployees.length > 0) {
    const oldIds = oldEmployees.map(
      (employee) => employee._id as mongoose.Types.ObjectId
    );
    const oldEmails = oldEmployees.map((employee) => employee.email);

    // A seeded team is a team whose lead or whose members are seeded people.
    const removedTeams = await Team.deleteMany({
      organization: orgId,
      $or: [{ teamLead: { $in: oldIds } }, { members: { $in: oldIds } }],
    });

    const removedTasks = await Task.deleteMany({
      organization: orgId,
      $or: [{ tags: SEED_TAG }, { assignedTo: { $in: oldIds } }],
    });

    const removedAttendance = await Attendance.deleteMany({
      organization: orgId,
      employee: { $in: oldIds },
    });

    const removedLeaves = await LeaveRequest.deleteMany({
      organization: orgId,
      employee: { $in: oldIds },
    });

    await User.deleteMany({ email: { $in: oldEmails } });
    await Employee.deleteMany({ _id: { $in: oldIds } });

    console.log("");
    console.log("Removed what the previous run made:");
    console.log("  employees      :", oldEmployees.length);
    console.log("  teams          :", removedTeams.deletedCount);
    console.log("  tasks          :", removedTasks.deletedCount);
    console.log("  attendance rows:", removedAttendance.deletedCount);
    console.log("  leave requests :", removedLeaves.deletedCount);
    console.log("");
  }

  // -------------------------------------------------------------------
  // 5) The people, with their login accounts
  // -------------------------------------------------------------------
  //
  // Every employee of this app can log in, so the seed creates the login too.
  // They all share the same password, which is fine for a demo database and
  // is written at the end of this script.
  const hashedPassword = await hashPassword(SEED_PASSWORD);

  // The employee id of every person key, so the teams, the tasks, the
  // attendance and the leaves below can point at them.
  const employeeIdByKey: Record<string, mongoose.Types.ObjectId> = {};

  for (const person of PEOPLE) {
    const email = person.key + SEED_DOMAIN;

    const employee = await Employee.create({
      name: person.name,
      email: email,
      phone: "0300-0000000",
      organization: orgId,
      department: departmentIdByName[person.department],
      role: roleIdFor(person.roleName),
      status: person.hasLeft ? "inactive" : "active",
      photo: "",
      designation: person.designation,
      employmentType: person.employmentType,
      joiningDate: monthsAgo(person.monthsHere),
      dateOfBirth: monthsAgo(person.monthsHere + 300),
      gender: person.gender,
      address: "",
      // Somebody who left the company left two months ago.
      exitDate: person.hasLeft ? monthsAgo(2) : null,
      exitReason: person.hasLeft ? "Moved to another company." : "",
    });

    employeeIdByKey[person.key] = employee._id as mongoose.Types.ObjectId;

    await User.create({
      name: person.name,
      email: email,
      password: hashedPassword,
      role: "employee",
      organization: orgId,
      employee: employee._id,
      isActive: !person.hasLeft,
    });
  }

  console.log("Created employees:", PEOPLE.length);

  // -------------------------------------------------------------------
  // 6) The teams
  // -------------------------------------------------------------------
  const teams = TEAMS.map((plan) => ({
    name: plan.name,
    description: plan.description,
    organization: orgId,
    department: departmentIdByName[plan.department],
    teamLead: employeeIdByKey[plan.lead],
    members: plan.members.map((key) => employeeIdByKey[key]),
    status: plan.status,
  }));

  await Team.insertMany(teams);

  console.log("Created teams:", teams.length);

  // -------------------------------------------------------------------
  // 7) The work those people are holding
  // -------------------------------------------------------------------
  //
  // Which team a person is in, so a task can be written as "given out by the
  // lead of this person". Somebody in no team gets their work from the
  // organization account instead.
  const leadKeyByPerson: Record<string, string> = {};

  TEAMS.forEach((plan) => {
    plan.members.forEach((memberKey) => {
      leadKeyByPerson[memberKey] = plan.lead;
    });
  });

  // The titles are handed out one after the other over the whole seed, so the
  // same title does not come back twice in the same team.
  let titleIndex = 0;

  function nextTitle() {
    const title = TASK_TITLES[titleIndex % TASK_TITLES.length];
    titleIndex += 1;
    return title;
  }

  // One task, ready to be inserted.
  function buildTask(input: {
    personKey: string;
    departmentName: string;
    status: TaskStatus;
    priority: TaskPriority;
    startDate: Date;
    dueDate: Date;
    completedAt: Date | null;
    remarks: string;
  }) {
    const employeeId = employeeIdByKey[input.personKey];

    // The lead of this person gives the work out. Without a lead it is the
    // organization account, exactly like in the app itself.
    const leadKey = leadKeyByPerson[input.personKey];
    const leadId = leadKey ? employeeIdByKey[leadKey] : null;

    const byManager = leadId !== null;

    return {
      title: nextTitle(),
      description: "Seeded work, so the team dashboard has something to draw.",
      organization: orgId,
      // The department always comes from the person doing the work.
      department: departmentIdByName[input.departmentName],
      assignedTo: employeeId,
      assignedByType: byManager ? "manager" : "organization",
      assignedByEmployee: byManager ? leadId : null,
      priority: input.priority,
      status: input.status,
      startDate: input.startDate,
      dueDate: input.dueDate,
      completedAt: input.completedAt,
      estimatedHours: 4,
      tags: [SEED_TAG, input.departmentName.toLowerCase()],
      remarks: input.remarks,
      attachments: [],
      assignmentHistory: [
        {
          employee: employeeId,
          byEmployee: byManager ? leadId : null,
          byType: byManager ? "manager" : "organization",
          reason: "",
          at: input.startDate,
        },
      ],
    };
  }

  const tasks: ReturnType<typeof buildTask>[] = [];

  // How many tasks were built so far, only used to turn the priorities and
  // the statuses around.
  let taskCount = 0;

  WORK.forEach((plan) => {
    const person = PEOPLE.find((item) => item.key === plan.person);

    if (!person) {
      return;
    }

    // --- The open work ------------------------------------------------
    for (let index = 0; index < plan.open; index += 1) {
      // The first ones of the pile are the late ones: their due date is
      // already gone and nobody has finished them.
      const isLate = index < plan.late;

      tasks.push(
        buildTask({
          personKey: plan.person,
          departmentName: person.department,
          status: OPEN_STATUSES[taskCount % OPEN_STATUSES.length],
          priority: PRIORITIES[taskCount % PRIORITIES.length],
          startDate: daysFromNow(-(index + 6)),
          dueDate: isLate ? daysFromNow(-(index + 2)) : daysFromNow(index + 3),
          completedAt: null,
          remarks: isLate ? "Past its due date." : "",
        })
      );

      taskCount += 1;
    }

    // --- The finished work --------------------------------------------
    for (let index = 0; index < plan.done; index += 1) {
      tasks.push(
        buildTask({
          personKey: plan.person,
          departmentName: person.department,
          status: "completed",
          priority: PRIORITIES[taskCount % PRIORITIES.length],
          startDate: daysFromNow(-(24 + index)),
          dueDate: daysFromNow(-(10 + index)),
          // Finished two days before it was due.
          completedAt: daysFromNow(-(12 + index)),
          remarks: "",
        })
      );

      taskCount += 1;
    }

    // --- The work that was called off ---------------------------------
    for (let index = 0; index < plan.cancelled; index += 1) {
      tasks.push(
        buildTask({
          personKey: plan.person,
          departmentName: person.department,
          status: "cancelled",
          priority: PRIORITIES[taskCount % PRIORITIES.length],
          startDate: daysFromNow(-(18 + index)),
          dueDate: daysFromNow(-(4 + index)),
          completedAt: null,
          remarks: "Dropped, the customer changed their mind.",
        })
      );

      taskCount += 1;
    }
  });

  await Task.insertMany(tasks);

  console.log("Created tasks:", tasks.length);

  // -------------------------------------------------------------------
  // 8) Today's attendance
  // -------------------------------------------------------------------
  const today = todayStart();

  const attendanceRows = TODAY.map((entry) => {
    const person = PEOPLE.find((item) => item.key === entry.person);

    // A present day gets a real check in, so the attendance page has
    // something to show next to the status.
    const checkIn = entry.status === "absent" ? null : daysFromNow(0);

    return {
      organization: orgId,
      employee: employeeIdByKey[entry.person],
      department: departmentIdByName[person ? person.department : "IT"],
      date: today,
      checkIn: checkIn,
      checkOut: null,
      workedHours: 0,
      status: entry.status,
      remarks: "",
    };
  });

  await Attendance.insertMany(attendanceRows);

  console.log("Marked today's attendance for:", attendanceRows.length);

  // -------------------------------------------------------------------
  // 9) The leave requests
  // -------------------------------------------------------------------
  //
  // A leave request needs a leave type, and that is something the
  // organization writes itself. If it has none yet we simply skip this part
  // instead of inventing one.
  const leaveType = await LeaveType.findOne({
    organization: orgId,
    status: "active",
  });

  if (!leaveType) {
    console.log(
      "No active leave type in this organization, so no leave request was made."
    );
  } else {
    const leaveRows = LEAVES.map((entry) => {
      const person = PEOPLE.find((item) => item.key === entry.person);

      return {
        organization: orgId,
        employee: employeeIdByKey[entry.person],
        department: departmentIdByName[person ? person.department : "IT"],
        leaveType: leaveType._id,
        fromDate: daysFromNow(entry.fromDays),
        toDate: daysFromNow(entry.toDays),
        // The seed writes plain rows without a day by day plan. Everything
        // that reads a leave falls back to "the whole period" when leaveDays
        // is empty, so these rows behave exactly like the older ones.
        requestedDays: entry.days,
        approvedDays: entry.status === "approved" ? entry.days : 0,
        totalDays: entry.days,
        reason: entry.reason,
        status: entry.status,
        // An approved request was answered by the organization account, so
        // there is no employee to name.
        reviewedByEmployee: null,
        reviewedAt: entry.status === "approved" ? daysFromNow(-3) : null,
        reviewRemarks: entry.status === "approved" ? "Approved." : "",
      };
    });

    await LeaveRequest.insertMany(leaveRows);

    console.log("Created leave requests:", leaveRows.length);
  }

  // -------------------------------------------------------------------
  // 10) What the dashboard should now show
  // -------------------------------------------------------------------
  console.log("");
  console.log("Open the Team Dashboard. It should now show:");
  console.log("  Teams          : 7 (6 active, 1 switched off)");
  console.log(
    "  People in teams: 20, one of whom has already left the company"
  );
  console.log(
    "  In no team     : " +
      PEOPLE_WITHOUT_TEAM.length +
      " of the seeded people, plus whoever you already had"
  );
  console.log("  Biggest team   : Platform Squad, 5 people");
  console.log("  Load split     : Sara Iqbal alone holds 67% of Platform Squad");
  console.log("  Delivery       : Design Studio finishes 77% of its work, QA Circle is late on 80% of its open work");
  console.log("  Needs a look   : Support Line is off but still holds 3 people,");
  console.log("                   Payables Desk still holds Rehan Ahmed who has left,");
  console.log("                   Data Lab carries 6 open tasks for one person,");
  console.log("                   QA Circle has nobody marked in today's attendance,");
  console.log("                   Design Studio has a member from another department");
  console.log("  Presence       : present, half day, on leave, absent and holiday are all used");
  console.log("");
  console.log("Every seeded person logs in with their own email and the password " + SEED_PASSWORD);
  console.log("For example: adnan" + SEED_DOMAIN + " (lead of Platform Squad)");
  console.log("");
  console.log("Run this seed again to rebuild all of it from scratch.");

  await mongoose.disconnect();
}

seedTeams();
