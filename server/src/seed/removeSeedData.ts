import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Cheque } from "../modules/cheque/cheque.model.js";
import { Task } from "../modules/task/task.model.js";
import { TaskComment } from "../modules/task/taskComment.model.js";
import { Team } from "../modules/team/team.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { User } from "../modules/user/user.model.js";
import { Attendance } from "../modules/attendance/attendance.model.js";
import { LeaveRequest } from "../modules/leave/leave.model.js";
import { LeaveBalance } from "../modules/leave/leaveBalance.model.js";
import { Salary } from "../modules/salary/salary.model.js";
import { Meeting } from "../modules/meeting/meeting.model.js";
import { Notification } from "../modules/notification/notification.model.js";
import { Department } from "../modules/department/department.model.js";

// Run this file with "npm run seed:remove".
//
// It deletes everything the three seed scripts made:
//   - seedCheques.ts -> the cheques whose number starts with "SEED-"
//   - seedTasks.ts   -> the tasks tagged "seed"
//   - seedTeams.ts   -> the employees on "@teamseed.local" and all the teams,
//                       tasks, attendance, leave, salary, meetings and
//                       notifications that belong to them, plus the
//                       departments that seed had to create
//
// Nothing you typed in yourself is touched, because every one of those marks
// is something a real record never carries.
//
// Add "--dry" to only count what would go, without deleting anything:
//   npx tsx src/seed/removeSeedData.ts --dry

// The marks the seed scripts leave behind.
const SEED_DOMAIN = "@teamseed.local";
const SEED_TASK_TAG = "seed";
const SEED_TEAM_TAG = "seed-team";
const SEED_CHEQUE_PREFIX = "^SEED-";
const SEED_DEPARTMENT_NOTE = "Created by the team seed.";

// When this is true we only look, we never delete.
const dryRun = process.argv.includes("--dry");

// Every line of the report, so the summary at the end is easy to read.
const report: { label: string; count: number }[] = [];

// Deletes with a filter, or only counts when "--dry" was passed.
async function removeWith(
  label: string,
  model: mongoose.Model<any>,
  filter: Record<string, unknown>
) {
  if (dryRun) {
    const count = await model.countDocuments(filter);
    report.push({ label: label, count: count });
    return;
  }

  const result = await model.deleteMany(filter);
  report.push({ label: label, count: result.deletedCount });
}

async function removeSeedData() {
  await connectDatabase();

  // 1) The seeded employees. Almost everything seedTeams.ts made hangs off
  //    these people, so we look them up first and keep their ids.
  const seedEmployees = await Employee.find({
    email: { $regex: SEED_DOMAIN + "$" },
  });

  const seedIds = seedEmployees.map(
    (employee) => employee._id as mongoose.Types.ObjectId
  );
  const seedEmails = seedEmployees.map((employee) => employee.email);

  // 2) The teams those people lead or belong to.
  await removeWith("teams", Team, {
    $or: [{ teamLead: { $in: seedIds } }, { members: { $in: seedIds } }],
  });

  // 3) The tasks. A comment points at a task, not at a tag, so we read the
  //    task ids first and delete the comments before the tasks themselves.
  const taskFilter = {
    $or: [
      { tags: SEED_TASK_TAG },
      { tags: SEED_TEAM_TAG },
      { assignedTo: { $in: seedIds } },
      { assignedByEmployee: { $in: seedIds } },
    ],
  };

  const seedTasks = await Task.find(taskFilter).select("_id");
  const seedTaskIds = seedTasks.map(
    (task) => task._id as mongoose.Types.ObjectId
  );

  await removeWith("task comments", TaskComment, {
    task: { $in: seedTaskIds },
  });

  await removeWith("tasks", Task, taskFilter);

  // 4) The day to day records of those people.
  await removeWith("attendance rows", Attendance, {
    employee: { $in: seedIds },
  });

  await removeWith("leave requests", LeaveRequest, {
    employee: { $in: seedIds },
  });

  await removeWith("leave balances", LeaveBalance, {
    employee: { $in: seedIds },
  });

  await removeWith("salaries", Salary, { employee: { $in: seedIds } });

  await removeWith("meetings", Meeting, {
    $or: [
      { organizedByEmployee: { $in: seedIds } },
      { "attendees.employee": { $in: seedIds } },
    ],
  });

  // 5) The people themselves, and the login accounts that go with them.
  //    A notification points at a login account and not at an employee, so
  //    the accounts are read before they go.
  const seedUsers = await User.find({ email: { $in: seedEmails } }).select(
    "_id"
  );
  const seedUserIds = seedUsers.map(
    (user) => user._id as mongoose.Types.ObjectId
  );

  await removeWith("notifications", Notification, {
    recipient: { $in: seedUserIds },
  });

  await removeWith("login accounts", User, { email: { $in: seedEmails } });
  await removeWith("employees", Employee, { _id: { $in: seedIds } });

  // 6) The departments the team seed had to create. It writes its own note in
  //    the description, so a department you made yourself is never matched.
  await removeWith("departments", Department, {
    description: SEED_DEPARTMENT_NOTE,
  });

  // 7) The seeded cheques.
  await removeWith("cheques", Cheque, {
    chequeNumber: { $regex: SEED_CHEQUE_PREFIX },
  });

  // 8) The summary.
  console.log("");
  console.log(dryRun ? "Seed data found:" : "Seed data removed:");

  let total = 0;
  report.forEach((line) => {
    console.log("  " + line.label.padEnd(16) + ":", line.count);
    total = total + line.count;
  });

  console.log("  " + "total".padEnd(16) + ":", total);
  console.log("");

  if (dryRun) {
    console.log("Nothing was deleted. Run without --dry to delete.");
  }

  await mongoose.connection.close();
}

removeSeedData();
