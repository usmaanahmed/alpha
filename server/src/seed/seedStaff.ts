import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Organization } from "../modules/organization/organization.model.js";
import { Department } from "../modules/department/department.model.js";
import { Role } from "../modules/role/role.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import type { EmploymentType, Gender } from "../modules/employee/employee.model.js";
import { User } from "../modules/user/user.model.js";
import { Team } from "../modules/team/team.model.js";
import { Task } from "../modules/task/task.model.js";
import { TaskComment } from "../modules/task/taskComment.model.js";
import { Attendance } from "../modules/attendance/attendance.model.js";
import { LeaveRequest } from "../modules/leave/leave.model.js";
import { LeaveBalance } from "../modules/leave/leaveBalance.model.js";
import { Salary } from "../modules/salary/salary.model.js";
import { Meeting } from "../modules/meeting/meeting.model.js";
import { Notification } from "../modules/notification/notification.model.js";
import { hashPassword } from "../utils/password.util.js";

// Run this file with "npm run seed:staff".
//
// It gives one organization three new departments and ten new employees, and
// it hands out every role and every department of that organization between
// those ten people, so no role and no department is left empty.
//
// Each person logs in with their own first name:
//
//   email    : ayesha@gmail.com
//   password : ayesha123
//
// The script is safe to run again: before it inserts anything it deletes the
// ten people of the previous run, together with the work that hangs off them.
// Nobody you typed in yourself is touched, because the ten emails below are
// the only thing it ever looks for.

// ---------------------------------------------------------------------------
// Small date helper
// ---------------------------------------------------------------------------

// A new Date that is a number of months before today. The time of day is set
// to noon so the date never slips to the day before because of the timezone.
function monthsAgo(months: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setMonth(date.getMonth() - months);
  return date;
}

// ---------------------------------------------------------------------------
// The three new departments
// ---------------------------------------------------------------------------

// This note is written at the end of the description of every department the
// seed had to create, so you can always tell them apart from the ones you
// typed in yourself.
const SEED_DEPARTMENT_NOTE = "Created by the staff seed.";

const NEW_DEPARTMENTS = [
  {
    name: "Engineering",
    description: "Builds and looks after the software of the company.",
  },
  {
    name: "Sales",
    description: "Finds new clients and closes the deals with them.",
  },
  {
    name: "Finance",
    description: "Handles the invoices, the salaries and the cheques.",
  },
];

// ---------------------------------------------------------------------------
// The ten people
// ---------------------------------------------------------------------------

// "key" is the first name in small letters. The email is key + "@gmail.com"
// and the password is key + "123", so Ayesha logs in with ayesha@gmail.com
// and ayesha123.
//
// "roleName" is the name of a role of the organization and "department" the
// name of one of its departments. Between the ten of them every role and
// every department is used at least one time.
interface Person {
  key: string;
  name: string;
  department: string;
  roleName: string;
  designation: string;
  employmentType: EmploymentType;
  gender: Gender;
  phone: string;
  monthsHere: number;
  ageInYears: number;
  address: string;
}

const PEOPLE: Person[] = [
  // --- Engineering ---
  {
    key: "ayesha",
    name: "Ayesha Khan",
    department: "Engineering",
    roleName: "Manager",
    designation: "Engineering Manager",
    employmentType: "full_time",
    gender: "female",
    phone: "0300-1110001",
    monthsHere: 34,
    ageInYears: 33,
    address: "12-B, Gulberg III, Lahore",
  },
  {
    key: "bilal",
    name: "Bilal Ahmed",
    department: "Engineering",
    roleName: "Employee",
    designation: "Frontend Developer",
    employmentType: "full_time",
    gender: "male",
    phone: "0300-1110002",
    monthsHere: 16,
    ageInYears: 26,
    address: "House 44, Johar Town, Lahore",
  },
  {
    key: "hina",
    name: "Hina Raza",
    department: "Engineering",
    roleName: "Employee",
    designation: "Backend Developer",
    employmentType: "full_time",
    gender: "female",
    phone: "0300-1110003",
    monthsHere: 9,
    ageInYears: 28,
    address: "Flat 7, Askari 10, Lahore",
  },

  // --- Sales ---
  {
    key: "danish",
    name: "Danish Iqbal",
    department: "Sales",
    roleName: "Manager",
    designation: "Sales Manager",
    employmentType: "full_time",
    gender: "male",
    phone: "0300-1110004",
    monthsHere: 41,
    ageInYears: 36,
    address: "House 9, DHA Phase 5, Karachi",
  },
  {
    key: "sana",
    name: "Sana Malik",
    department: "Sales",
    roleName: "Employee",
    designation: "Sales Executive",
    employmentType: "full_time",
    gender: "female",
    phone: "0300-1110005",
    monthsHere: 7,
    ageInYears: 25,
    address: "Block C, Bahria Town, Rawalpindi",
  },

  // --- Finance ---
  {
    key: "kamran",
    name: "Kamran Sheikh",
    department: "Finance",
    roleName: "Admin",
    designation: "Head of Finance",
    employmentType: "full_time",
    gender: "male",
    phone: "0300-1110006",
    monthsHere: 52,
    ageInYears: 41,
    address: "House 21, F-11/1, Islamabad",
  },
  {
    key: "zainab",
    name: "Zainab Fatima",
    department: "Finance",
    roleName: "Employee",
    designation: "Accounts Officer",
    employmentType: "part_time",
    gender: "female",
    phone: "0300-1110007",
    monthsHere: 13,
    ageInYears: 29,
    address: "Street 5, Model Town, Lahore",
  },

  // --- HR ---
  {
    key: "imran",
    name: "Imran Yousuf",
    department: "HR",
    roleName: "HR",
    designation: "HR Officer",
    employmentType: "full_time",
    gender: "male",
    phone: "0300-1110008",
    monthsHere: 27,
    ageInYears: 34,
    address: "House 3, Cantt, Multan",
  },
  {
    key: "maryam",
    name: "Maryam Noor",
    department: "HR",
    roleName: "HR",
    designation: "Recruitment Executive",
    employmentType: "contract",
    gender: "female",
    phone: "0300-1110009",
    monthsHere: 5,
    ageInYears: 24,
    address: "Flat 12, Clifton, Karachi",
  },

  // --- Social Media ---
  {
    key: "tariq",
    name: "Tariq Mehmood",
    department: "Social Media",
    roleName: "Employee",
    designation: "Content Creator",
    employmentType: "intern",
    gender: "male",
    phone: "0300-1110010",
    monthsHere: 3,
    ageInYears: 22,
    address: "House 88, Satellite Town, Gujranwala",
  },
];

// ---------------------------------------------------------------------------
// The seed itself
// ---------------------------------------------------------------------------

async function seedStaff() {
  await connectDatabase();

  // -------------------------------------------------------------------
  // 1) Which organization gets the people
  // -------------------------------------------------------------------
  //
  // We prefer the organization that owns the newest employee, so the seed
  // lands in the workspace you are actually looking at. If there is no
  // employee yet we take the first organization in the database.
  const newestEmployee = await Employee.findOne().sort({ createdAt: -1 });

  const organization = newestEmployee
    ? await Organization.findById(newestEmployee.organization)
    : await Organization.findOne();

  if (!organization) {
    console.log(
      "No organization found. Create an organization first, then run this seed."
    );
    await mongoose.disconnect();
    return;
  }

  const orgId = organization._id as mongoose.Types.ObjectId;

  console.log("Seeding staff for organization:", organization.name);
  console.log("");

  // -------------------------------------------------------------------
  // 2) The three new departments
  // -------------------------------------------------------------------
  //
  // A department that already carries the same name is used as it is, so
  // running the seed a second time never makes a double.
  for (const plan of NEW_DEPARTMENTS) {
    const existing = await Department.findOne({
      organization: orgId,
      name: plan.name,
    });

    if (existing) {
      console.log("Department already there:", plan.name);
      continue;
    }

    await Department.create({
      name: plan.name,
      description: plan.description + " " + SEED_DEPARTMENT_NOTE,
      organization: orgId,
      status: "active",
    });

    console.log("Created department:", plan.name);
  }

  // -------------------------------------------------------------------
  // 3) Read back every department and every role of this organization
  // -------------------------------------------------------------------
  //
  // The ten people above point at a department and at a role by name, so we
  // keep both lists here and look those names up in them.
  const departments = await Department.find({
    organization: orgId,
    status: "active",
  });

  const roles = await Role.find({ organization: orgId, status: "active" });

  if (roles.length === 0) {
    console.log(
      "This organization has no active role. Open the Roles page, add one, then run this seed again."
    );
    await mongoose.disconnect();
    return;
  }

  // The department that carries this name, or null when the organization does
  // not have it. A person whose department is missing is skipped further down.
  function departmentIdFor(departmentName: string) {
    const found = departments.find(
      (department) =>
        department.name.toLowerCase() === departmentName.toLowerCase()
    );

    if (!found) {
      return null;
    }

    return found._id as mongoose.Types.ObjectId;
  }

  // The role that carries this name. When the organization renamed or deleted
  // that role we fall back on its first active role, so the seed still runs.
  function roleIdFor(roleName: string) {
    const found = roles.find(
      (role) => role.name.toLowerCase() === roleName.toLowerCase()
    );

    if (!found) {
      console.log(
        "Role '" +
          roleName +
          "' not found, using '" +
          roles[0].name +
          "' instead."
      );
      return roles[0]._id as mongoose.Types.ObjectId;
    }

    return found._id as mongoose.Types.ObjectId;
  }

  // -------------------------------------------------------------------
  // 4) Remove what a previous run of this seed made
  // -------------------------------------------------------------------
  //
  // Only the ten emails of this file are looked for, and only inside this
  // organization. Everything that hangs off those people goes with them,
  // otherwise the pages would be left pointing at somebody who is gone.
  const seedEmails = PEOPLE.map((person) => person.key + "@gmail.com");

  const oldEmployees = await Employee.find({
    organization: orgId,
    email: { $in: seedEmails },
  });

  if (oldEmployees.length > 0) {
    const oldIds = oldEmployees.map(
      (employee) => employee._id as mongoose.Types.ObjectId
    );

    // A comment points at a task and not at a person, so the tasks of those
    // people are read first and their comments are deleted before them.
    const oldTasks = await Task.find({
      organization: orgId,
      $or: [
        { assignedTo: { $in: oldIds } },
        { assignedByEmployee: { $in: oldIds } },
      ],
    }).select("_id");

    const oldTaskIds = oldTasks.map(
      (task) => task._id as mongoose.Types.ObjectId
    );

    await TaskComment.deleteMany({ task: { $in: oldTaskIds } });
    await Task.deleteMany({ _id: { $in: oldTaskIds } });

    await Attendance.deleteMany({ employee: { $in: oldIds } });
    await LeaveRequest.deleteMany({ employee: { $in: oldIds } });
    await LeaveBalance.deleteMany({ employee: { $in: oldIds } });
    await Salary.deleteMany({ employee: { $in: oldIds } });

    await Meeting.deleteMany({
      $or: [
        { organizedByEmployee: { $in: oldIds } },
        { "attendees.employee": { $in: oldIds } },
      ],
    });

    // A team is not deleted, it only loses the people of this seed.
    await Team.updateMany(
      { organization: orgId },
      { $pull: { members: { $in: oldIds } } }
    );

    // A notification points at a login account and not at an employee, so the
    // accounts are read before they go.
    const oldUsers = await User.find({ email: { $in: seedEmails } }).select(
      "_id"
    );

    const oldUserIds = oldUsers.map(
      (user) => user._id as mongoose.Types.ObjectId
    );

    await Notification.deleteMany({ recipient: { $in: oldUserIds } });

    await User.deleteMany({ email: { $in: seedEmails } });
    await Employee.deleteMany({ _id: { $in: oldIds } });

    console.log("");
    console.log(
      "Removed the " + oldEmployees.length + " people of the previous run."
    );
  }

  // -------------------------------------------------------------------
  // 5) The ten people, with their login accounts
  // -------------------------------------------------------------------
  //
  // Every employee of this app can log in, so the seed creates the login
  // account right next to the employee, exactly like the employee form does.
  console.log("");
  console.log("  NAME            EMAIL                 PASSWORD    ROLE      DEPARTMENT");

  let created = 0;

  for (const person of PEOPLE) {
    const email = person.key + "@gmail.com";
    const password = person.key + "123";

    const departmentId = departmentIdFor(person.department);

    if (!departmentId) {
      console.log(
        "Skipped " +
          person.name +
          ": this organization has no department called '" +
          person.department +
          "'."
      );
      continue;
    }

    // The email of a login account is unique over the whole database, so a
    // person whose email is already taken by somebody else is skipped.
    const emailTaken = await User.findOne({ email: email });

    if (emailTaken) {
      console.log("Skipped " + person.name + ": " + email + " is already used.");
      continue;
    }

    const employee = await Employee.create({
      name: person.name,
      email: email,
      phone: person.phone,
      organization: orgId,
      department: departmentId,
      role: roleIdFor(person.roleName),
      status: "active",
      photo: "",
      designation: person.designation,
      employmentType: person.employmentType,
      joiningDate: monthsAgo(person.monthsHere),
      dateOfBirth: monthsAgo(person.ageInYears * 12),
      gender: person.gender,
      address: person.address,
      exitDate: null,
      exitReason: "",
    });

    const hashedPassword = await hashPassword(password);

    await User.create({
      name: person.name,
      email: email,
      password: hashedPassword,
      role: "employee",
      organization: orgId,
      employee: employee._id,
      isActive: true,
    });

    created = created + 1;

    console.log(
      "  " +
        person.name.padEnd(16) +
        email.padEnd(22) +
        password.padEnd(12) +
        person.roleName.padEnd(10) +
        person.department
    );
  }

  // -------------------------------------------------------------------
  // 6) The summary
  // -------------------------------------------------------------------
  console.log("");
  console.log("Employees created:", created);
  console.log(
    "Departments now  :",
    departments.map((department) => department.name).join(", ")
  );
  console.log("Roles now        :", roles.map((role) => role.name).join(", "));
  console.log("");
  console.log("Everybody logs in with their own first name:");
  console.log("  email    -> firstname@gmail.com  (for example ayesha@gmail.com)");
  console.log("  password -> firstname123         (for example ayesha123)");
  console.log("");

  await mongoose.disconnect();
}

seedStaff();
