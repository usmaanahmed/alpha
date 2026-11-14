import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Task } from "../modules/task/task.model.js";
import type {
  TaskAssignerType,
  TaskPriority,
  TaskStatus,
} from "../modules/task/task.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { Organization } from "../modules/organization/organization.model.js";

// Run this file with "npm run seed:tasks".
//
// It fills the task board with 15 tasks of every kind, so you can see that
// all the columns, the priority colours, the "overdue only" filter and the
// charts really work:
//   - every status  : todo, in_progress, in_review, completed, cancelled
//   - every priority: low, medium, high, urgent
//   - every kind of date: already late, due today, due this week, due later,
//     no due date at all, and finished tasks (on time and late)
//   - a different tag category on each one (bug, design, finance, hr, ...)
//
// Every task made here carries the tag "seed". Before it inserts anything the
// script deletes the old tasks with that tag again, so you can run it as many
// times as you like without making copies, and your own real tasks are never
// touched.

// ---------------------------------------------------------------------------
// Small date helper, worked out from "right now"
// ---------------------------------------------------------------------------

// A new Date that is a number of days after today. A negative number gives a
// day in the past. The time of day is set to noon so the date never slips to
// the day before or after because of the timezone.
function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function seedTasks() {
  await connectDatabase();

  // 1) Find the organization to attach the tasks to.
  //
  // We prefer the organization that already owns a task, so the seed shows up
  // on the very same board you are looking at. If there are no tasks yet, we
  // take the first organization in the database.
  const existingTask = await Task.findOne().sort({ createdAt: -1 });

  const organization = existingTask
    ? await Organization.findById(existingTask.organization)
    : await Organization.findOne();

  if (!organization) {
    console.log(
      "No organization found. Create an organization first, then run this seed."
    );
    await mongoose.disconnect();
    return;
  }

  const orgId = organization._id as mongoose.Types.ObjectId;

  // 2) Every task needs an employee to work on it, so we read the active
  //    employees of this organization and hand the tasks around between them.
  const employees = await Employee.find({
    organization: orgId,
    status: "active",
  }).sort({ createdAt: 1 });

  if (employees.length === 0) {
    console.log(
      "No active employee found in " +
        organization.name +
        ". Create an employee first, then run this seed."
    );
    await mongoose.disconnect();
    return;
  }

  console.log("Seeding tasks for organization:", organization.name);
  console.log("Employees found:", employees.length);

  // Give the tasks out one after the other: employee 0, 1, 2, 0, 1, 2 ...
  // This also works when the organization has only one employee.
  function assignee(index: number) {
    return employees[index % employees.length];
  }

  // The employee we pretend is the manager for the "assigned by a manager"
  // tasks. Normally that is the oldest employee, but nobody assigns a task to
  // himself in this app, so when the task lands on him we take the next
  // employee instead. With only one employee there is nobody left, so we
  // answer null and the organization account becomes the assigner.
  function managerFor(index: number) {
    if (employees.length === 1) {
      return null;
    }
    const firstId = employees[0]._id as mongoose.Types.ObjectId;
    const workerId = assignee(index)._id as mongoose.Types.ObjectId;
    if (firstId.equals(workerId)) {
      return employees[1];
    }
    return employees[0];
  }

  // 3) Build the list. Each entry says which employee gets the task, which
  //    status and priority it has, and where its dates sit compared to today.
  //
  //    "byManager" means the manager above created it; when it is false the
  //    organization account created it.
  const plans = [
    // --- TODO ---
    {
      title: "Fix the checkout page crash",
      description:
        "Customers see a white screen when they press Pay. Find the error and fix it.",
      status: "todo" as TaskStatus,
      priority: "urgent" as TaskPriority,
      startDate: daysFromNow(-4),
      dueDate: daysFromNow(-2), // already late
      completedAt: null,
      estimatedHours: 6,
      tags: ["seed", "bug", "frontend"],
      remarks: "",
      byManager: true,
    },
    {
      title: "Send the July invoice to Ali Traders",
      description: "Make the invoice from the delivery notes and email it.",
      status: "todo" as TaskStatus,
      priority: "high" as TaskPriority,
      startDate: daysFromNow(0),
      dueDate: daysFromNow(0), // due today
      completedAt: null,
      estimatedHours: 2,
      tags: ["seed", "finance", "client"],
      remarks: "",
      byManager: false,
    },
    {
      title: "Design the new dashboard icons",
      description: "One icon set for the sidebar, light and dark version.",
      status: "todo" as TaskStatus,
      priority: "medium" as TaskPriority,
      startDate: daysFromNow(1),
      dueDate: daysFromNow(6), // due this week
      completedAt: null,
      estimatedHours: 10,
      tags: ["seed", "design"],
      remarks: "",
      byManager: true,
    },
    {
      title: "Read about push notifications",
      description:
        "Small research task: how much work would web push be for us?",
      status: "todo" as TaskStatus,
      priority: "low" as TaskPriority,
      startDate: null,
      dueDate: null, // no due date at all
      completedAt: null,
      estimatedHours: 4,
      tags: ["seed", "research"],
      remarks: "",
      byManager: false,
    },

    // --- IN PROGRESS ---
    {
      title: "Restore the backup server",
      description:
        "The night backup did not run since Friday. Bring it back and check the logs.",
      status: "in_progress" as TaskStatus,
      priority: "urgent" as TaskPriority,
      startDate: daysFromNow(-3),
      dueDate: daysFromNow(-1), // already late
      completedAt: null,
      estimatedHours: 8,
      tags: ["seed", "infrastructure", "production"],
      remarks: "Half of the disks are copied again.",
      byManager: true,
    },
    {
      title: "Build the reports API",
      description: "The endpoint that gives the monthly numbers to the client.",
      status: "in_progress" as TaskStatus,
      priority: "high" as TaskPriority,
      startDate: daysFromNow(-2),
      dueDate: daysFromNow(3), // due this week
      completedAt: null,
      estimatedHours: 16,
      tags: ["seed", "development", "api"],
      remarks: "The queries are ready, the routes are next.",
      byManager: false,
    },
    {
      title: "Write the August newsletter",
      description: "Three product news items and one customer story.",
      status: "in_progress" as TaskStatus,
      priority: "medium" as TaskPriority,
      startDate: daysFromNow(-1),
      dueDate: daysFromNow(12), // due later
      completedAt: null,
      estimatedHours: 5,
      tags: ["seed", "marketing"],
      remarks: "",
      byManager: true,
    },
    {
      title: "Update the user manual",
      description: "The screenshots are from the old design, take new ones.",
      status: "in_progress" as TaskStatus,
      priority: "low" as TaskPriority,
      startDate: daysFromNow(-6),
      dueDate: daysFromNow(24), // due later
      completedAt: null,
      estimatedHours: 12,
      tags: ["seed", "documentation"],
      remarks: "Chapter 1 and 2 are done.",
      byManager: false,
    },

    // --- IN REVIEW ---
    {
      title: "Check the login security",
      description:
        "Go through the token and cookie settings before we go live.",
      status: "in_review" as TaskStatus,
      priority: "urgent" as TaskPriority,
      startDate: daysFromNow(-5),
      dueDate: daysFromNow(1), // due tomorrow
      completedAt: null,
      estimatedHours: 7,
      tags: ["seed", "security"],
      remarks: "Waiting for the review of the manager.",
      byManager: true,
    },
    {
      title: "Close the June accounts",
      description: "Match the bank statement with the cheque register.",
      status: "in_review" as TaskStatus,
      priority: "high" as TaskPriority,
      startDate: daysFromNow(-14),
      dueDate: daysFromNow(-3), // already late
      completedAt: null,
      estimatedHours: 9,
      tags: ["seed", "finance", "audit"],
      remarks: "Two cheques still do not match.",
      byManager: false,
    },
    {
      title: "Rewrite the leave policy",
      description: "Add the new carry-forward rule and send it for approval.",
      status: "in_review" as TaskStatus,
      priority: "medium" as TaskPriority,
      startDate: daysFromNow(-9),
      dueDate: daysFromNow(8), // due later
      completedAt: null,
      estimatedHours: 6,
      tags: ["seed", "hr", "policy"],
      remarks: "",
      byManager: true,
    },

    // --- COMPLETED ---
    {
      title: "Move the website to the new server",
      description: "Copy the files, change the DNS, test everything.",
      status: "completed" as TaskStatus,
      priority: "high" as TaskPriority,
      startDate: daysFromNow(-20),
      dueDate: daysFromNow(-10),
      completedAt: daysFromNow(-12), // finished before the due date
      estimatedHours: 20,
      tags: ["seed", "infrastructure"],
      remarks: "Everything works, old server switched off.",
      byManager: false,
    },
    {
      title: "Answer the open support tickets",
      description: "Clear the ticket list of last week.",
      status: "completed" as TaskStatus,
      priority: "medium" as TaskPriority,
      startDate: daysFromNow(-16),
      dueDate: daysFromNow(-9),
      completedAt: daysFromNow(-5), // finished after the due date
      estimatedHours: 8,
      tags: ["seed", "support", "client"],
      remarks: "Finished late, there were more tickets than we thought.",
      byManager: true,
    },
    {
      title: "Order the office supplies",
      description: "Paper, ink and the two chairs we talked about.",
      status: "completed" as TaskStatus,
      priority: "low" as TaskPriority,
      startDate: daysFromNow(-3),
      dueDate: daysFromNow(1),
      completedAt: daysFromNow(0), // finished today
      estimatedHours: 1,
      tags: ["seed", "admin"],
      remarks: "Delivery comes on Monday.",
      byManager: false,
    },

    // --- CANCELLED ---
    {
      title: "Organize the summer team event",
      description: "Book a place for 20 people and plan the food.",
      status: "cancelled" as TaskStatus,
      priority: "medium" as TaskPriority,
      startDate: daysFromNow(-7),
      dueDate: daysFromNow(14),
      completedAt: null,
      estimatedHours: 6,
      tags: ["seed", "event"],
      remarks: "Cancelled, the budget was used for the new server.",
      byManager: true,
    },
  ];

  // 4) Remove the tasks a previous run of this seed made, so re-running does
  //    not pile up copies. We recognise them by the "seed" tag.
  const removed = await Task.deleteMany({ organization: orgId, tags: "seed" });
  if (removed.deletedCount > 0) {
    console.log("Removed old seed tasks:", removed.deletedCount);
  }

  // 5) Turn every plan above into a real task document.
  const tasks = plans.map((plan, index) => {
    const employee = assignee(index);
    const employeeId = employee._id as mongoose.Types.ObjectId;

    // The manager for this one task, or null when there is nobody else in the
    // organization. Then the organization account gives the task out.
    const manager = managerFor(index);
    const managerId = manager ? (manager._id as mongoose.Types.ObjectId) : null;

    const fromManager = plan.byManager && managerId !== null;

    // Who gave the task out, written the way the model wants it.
    const assignerType: TaskAssignerType = fromManager
      ? "manager"
      : "organization";

    // The moment the task was created: its start date, or 7 days ago when the
    // task has no start date.
    const createdMoment = plan.startDate ? plan.startDate : daysFromNow(-7);

    return {
      title: plan.title,
      description: plan.description,
      organization: orgId,
      // The department always comes from the employee who does the work.
      department: employee.department,
      assignedTo: employeeId,
      assignedByType: assignerType,
      assignedByEmployee: fromManager ? managerId : null,
      priority: plan.priority,
      status: plan.status,
      startDate: plan.startDate,
      dueDate: plan.dueDate,
      // Only a finished task has a completion date.
      completedAt: plan.completedAt,
      estimatedHours: plan.estimatedHours,
      tags: plan.tags,
      remarks: plan.remarks,
      attachments: [],
      // The first line of the timeline: the task was created and given out.
      assignmentHistory: [
        {
          employee: employeeId,
          byEmployee: fromManager ? managerId : null,
          byType: assignerType,
          reason: "",
          at: createdMoment,
        },
      ],
    };
  });

  // 6) Save them all.
  await Task.insertMany(tasks);

  console.log("Inserted seed tasks:", tasks.length);
  console.log("");
  console.log("What the board should now show (plus your own tasks):");
  console.log("  To Do        : 4  (1 late, 1 due today, 1 this week, 1 no date)");
  console.log("  In Progress  : 4  (1 late)");
  console.log("  In Review    : 3  (1 late)");
  console.log("  Completed    : 3  (1 early, 1 late, 1 today)");
  console.log("  Cancelled    : 1");
  console.log("  Overdue only : 3  (checkout crash, backup server, June accounts)");
  console.log("  Priorities   : 3 urgent, 4 high, 5 medium, 3 low");
  console.log("  Assigned by  : 8 by a manager, 7 by the organization");

  await mongoose.disconnect();
}

seedTasks();
