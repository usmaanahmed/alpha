import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Task } from "../modules/task/task.model.js";
import type { TaskPriority, TaskStatus } from "../modules/task/task.model.js";
import { Meeting } from "../modules/meeting/meeting.model.js";
import type { AttendeeResponse, MeetingType } from "../modules/meeting/meeting.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { Team } from "../modules/team/team.model.js";
import { LeaveRequest } from "../modules/leave/leave.model.js";

// Run this file with "npm run seed:leave-workload", and give it a name when
// more than one request is waiting:
//
//   npm run seed:leave-workload Farhan
//
// WHY THIS FILE EXISTS
//
// The approval screen has a panel called "What <name> has on". It asks the
// server which tasks and meetings of that employee touch the requested days,
// and on a fresh database the honest answer is "0 tasks and 0 meetings", so
// the panel, its four counters and the warnings above them all look broken
// when they are in fact simply empty.
//
// So this script takes ONE leave request that is still waiting for an answer
// and gives that employee a realistic week: work that is late, work that is
// due while they are away, work that runs straight through the leave, and
// three meetings in those same days. Then the panel has something to show.
//
// Everything is built around the DATES OF THAT REQUEST and not around today,
// so it works for any request, of any employee, in any month.
//
// Everything it makes is marked (the tasks carry the tag below, the meetings
// carry these titles), and it deletes the marked rows of the previous run
// before it inserts, so you can run it as often as you like.

// The tag that says "this task came from this script". It is deliberately NOT
// the plain "seed" tag: that one belongs to "npm run seed:tasks", and the two
// scripts must never delete each other's work.
const SEED_TAG = "seed-leave";

// ---------------------------------------------------------------------------
// Small date helpers
// ---------------------------------------------------------------------------

// The dates of a leave are saved as midnight UTC, so every date this script
// builds is worked out in UTC too. Noon is used as the time of day, because a
// date at noon can never slip into the day before or after when the server
// and the browser sit in different timezones.

// A copy of one day, at noon.
function noonOf(day: Date) {
  const date = new Date(day);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

// A number of days after a given day. A negative number gives a day before.
function daysAfter(day: Date, days: number) {
  const date = noonOf(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

// A number of days before today.
function daysBeforeToday(days: number) {
  return daysAfter(new Date(), -days);
}

// One real moment on a given day: "this day at 11:30".
function momentOn(day: Date, hour: number, minute: number) {
  const date = new Date(day);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

// Every day of the leave that is not a Saturday or a Sunday.
//
// The deadlines and the meetings this script makes are put on these days. A
// meeting on the Sunday inside the leave would still show up in the panel,
// but nobody schedules one, and a seed that looks made up is a seed you stop
// trusting.
function workingDaysBetween(fromDate: Date, toDate: Date) {
  const days: Date[] = [];
  let day = noonOf(fromDate);

  while (day.getTime() <= noonOf(toDate).getTime()) {
    const weekday = day.getUTCDay();

    if (weekday !== 0 && weekday !== 6) {
      days.push(new Date(day));
    }

    day = daysAfter(day, 1);
  }

  // A leave that is only a weekend has no working day at all. Then the first
  // day of the leave has to do, otherwise there is nowhere to put anything.
  if (days.length === 0) {
    days.push(noonOf(fromDate));
  }

  return days;
}

async function seedLeaveWorkload() {
  await connectDatabase();

  // -------------------------------------------------------------------
  // 1. Which request are we filling the panel for?
  // -------------------------------------------------------------------

  // A name may be typed after the command. Without one we take the newest
  // request that is still waiting, which is almost always the one you just
  // made and are looking at on the screen.
  const wantedName = process.argv[2] || "";

  let employeeFilter = {};

  if (wantedName !== "") {
    const matches = await Employee.find({
      name: new RegExp(wantedName, "i"),
    }).select("_id name");

    if (matches.length === 0) {
      console.log("No employee found with a name like: " + wantedName);
      await mongoose.disconnect();
      return;
    }

    employeeFilter = { employee: { $in: matches.map((one) => one._id) } };
  }

  const leaveRequest = await LeaveRequest.findOne({
    status: "pending",
    ...employeeFilter,
  })
    .sort({ createdAt: -1 })
    .populate("employee", "name department");

  if (!leaveRequest) {
    console.log(
      wantedName === ""
        ? "No pending leave request found. Apply for a leave first, then run this seed."
        : "No pending leave request found for: " + wantedName
    );
    await mongoose.disconnect();
    return;
  }

  const employee = leaveRequest.employee as any;
  const orgId = leaveRequest.organization as mongoose.Types.ObjectId;
  const employeeId = employee._id as mongoose.Types.ObjectId;
  const fromDate = leaveRequest.fromDate;
  const toDate = leaveRequest.toDate;

  // A task always belongs to the department of the person doing it, and the
  // model insists on having one, so a person without a department cannot be
  // given work here.
  if (!employee.department) {
    console.log(
      employee.name +
        " has no department, and a task needs one. Put them in a department first."
    );
    await mongoose.disconnect();
    return;
  }

  console.log("Filling the workload panel of:", employee.name);
  console.log(
    "Leave period                 :",
    fromDate.toISOString().slice(0, 10),
    "->",
    toDate.toISOString().slice(0, 10)
  );

  // -------------------------------------------------------------------
  // 2. Who hands the work out
  // -------------------------------------------------------------------

  // The team lead of this employee, when they are in a team, because that is
  // who really gives them their work. When there is no team the tasks come
  // from the organization account instead, which the model also allows.
  const team = await Team.findOne({
    organization: orgId,
    status: "active",
    members: employeeId,
  }).select("teamLead name");

  const leadId = team ? (team.teamLead as mongoose.Types.ObjectId) : null;

  console.log(
    "Work handed out by           :",
    leadId ? "their team lead" : "the organization account"
  );

  // The days inside the leave that the deadlines and the meetings use.
  const workingDays = workingDaysBetween(fromDate, toDate);
  const firstWorkingDay = workingDays[0];
  const secondWorkingDay = workingDays[1] || workingDays[0];
  const lastWorkingDay = workingDays[workingDays.length - 1];

  // -------------------------------------------------------------------
  // 3. The five tasks
  // -------------------------------------------------------------------

  // The server sorts the open tasks of an employee into three groups, and
  // there is one task here for each of them, so every kind of row the panel
  // can draw really appears:
  //
  //   overdue      : late already, and shown whatever the leave dates are
  //   due_in_leave : the deadline falls inside the requested days
  //   spans_leave  : the work runs from before the leave to after it
  //
  // The fifth task touches none of those days on purpose. It proves the panel
  // is really filtering: it counts under "Open tasks" and stays out of the
  // list underneath.
  const taskPlans = [
    {
      title: "Schedule the campaign posts for the last week of the month",
      description:
        "The captions are approved. Put them in the scheduler and check the timings.",
      status: "in_progress" as TaskStatus,
      priority: "urgent" as TaskPriority,
      startDate: daysAfter(fromDate, -6),
      dueDate: secondWorkingDay,
      estimatedHours: 6,
      remarks: "Half of them are queued.",
    },
    {
      title: "Answer the comments left on the brand page",
      description:
        "The backlog of the last two weeks, starting with the complaints.",
      status: "todo" as TaskStatus,
      priority: "high" as TaskPriority,
      startDate: daysBeforeToday(10),
      dueDate: daysBeforeToday(3),
      estimatedHours: 4,
      remarks: "",
    },
    {
      title: "Build the content calendar for next quarter",
      description: "One sheet with the themes, the posting days and the owner.",
      status: "in_progress" as TaskStatus,
      priority: "medium" as TaskPriority,
      startDate: daysAfter(fromDate, -10),
      dueDate: daysAfter(toDate, 14),
      estimatedHours: 18,
      remarks: "The themes are agreed, the days are not.",
    },
    {
      title: "Send the monthly reach report to the client",
      description:
        "Pull the numbers of the three channels and write the short summary.",
      status: "in_review" as TaskStatus,
      priority: "high" as TaskPriority,
      startDate: daysAfter(fromDate, -3),
      dueDate: lastWorkingDay,
      estimatedHours: 5,
      remarks: "Waiting for the review.",
    },
    {
      title: "Refresh the highlight covers",
      description: "New covers in the colours of the new brand sheet.",
      status: "todo" as TaskStatus,
      priority: "low" as TaskPriority,
      startDate: daysAfter(toDate, 5),
      dueDate: daysAfter(toDate, 20),
      estimatedHours: 3,
      remarks: "",
    },
  ];

  // -------------------------------------------------------------------
  // 4. The three meetings, all inside the requested days
  // -------------------------------------------------------------------

  // One of them is RUN by this employee. That is the worse case for an
  // approver — somebody else can be missed in a meeting, the person holding
  // it cannot — so the panel puts a crown on that line and the warning counts
  // it separately.
  const meetingPlans = [
    {
      title: "October content plan review",
      agenda: "Walk through the plan for October and agree the posting days.",
      day: firstWorkingDay,
      hour: 11,
      minute: 0,
      durationMinutes: 60,
      meetingType: "in_person" as MeetingType,
      location: "Meeting Room 1",
      isOrganizer: true,
      response: "accepted" as AttendeeResponse,
    },
    {
      title: "Client call about the campaign numbers",
      agenda: "The client wants the reach of the last campaign explained.",
      day: secondWorkingDay,
      hour: 15,
      minute: 30,
      durationMinutes: 45,
      meetingType: "online" as MeetingType,
      location: "https://meet.google.com/leave-workload-seed",
      isOrganizer: false,
      response: "accepted" as AttendeeResponse,
    },
    {
      title: "Weekly team standup",
      agenda: "What everybody is on this week.",
      day: lastWorkingDay,
      hour: 9,
      minute: 30,
      durationMinutes: 30,
      meetingType: "in_person" as MeetingType,
      location: "Meeting Room 2",
      isOrganizer: false,
      response: "invited" as AttendeeResponse,
    },
  ];

  // -------------------------------------------------------------------
  // 5. Clear what the last run left behind
  // -------------------------------------------------------------------

  // Only the rows of THIS employee with THIS tag, and the meetings with
  // exactly THESE titles, are ever touched. Your own work is safe.
  const removedTasks = await Task.deleteMany({
    organization: orgId,
    assignedTo: employeeId,
    tags: SEED_TAG,
  });

  const removedMeetings = await Meeting.deleteMany({
    organization: orgId,
    title: { $in: meetingPlans.map((plan) => plan.title) },
  });

  if (removedTasks.deletedCount > 0 || removedMeetings.deletedCount > 0) {
    console.log(
      "Removed from the last run    :",
      removedTasks.deletedCount,
      "tasks,",
      removedMeetings.deletedCount,
      "meetings"
    );
  }

  // -------------------------------------------------------------------
  // 6. Write the tasks
  // -------------------------------------------------------------------

  const tasks = taskPlans.map((plan) => {
    return {
      title: plan.title,
      description: plan.description,
      organization: orgId,
      department: employee.department,
      assignedTo: employeeId,
      assignedByType: leadId ? "manager" : "organization",
      assignedByEmployee: leadId,
      priority: plan.priority,
      status: plan.status,
      startDate: plan.startDate,
      dueDate: plan.dueDate,
      completedAt: null,
      estimatedHours: plan.estimatedHours,
      tags: [SEED_TAG, "social-media"],
      remarks: plan.remarks,
      attachments: [],
      // The first line of the timeline: the day the task was handed over.
      assignmentHistory: [
        {
          employee: employeeId,
          byEmployee: leadId,
          byType: leadId ? "manager" : "organization",
          reason: "",
          at: plan.startDate,
        },
      ],
    };
  });

  await Task.insertMany(tasks);

  // -------------------------------------------------------------------
  // 7. Write the meetings
  // -------------------------------------------------------------------

  for (const plan of meetingPlans) {
    const startAt = momentOn(plan.day, plan.hour, plan.minute);
    const endAt = new Date(startAt.getTime() + plan.durationMinutes * 60 * 1000);

    // The meeting this employee runs is organized by them; the other two are
    // organized by the team lead, or by the organization when there is none.
    const organizerId = plan.isOrganizer ? employeeId : leadId;

    await Meeting.create({
      organization: orgId,
      title: plan.title,
      agenda: plan.agenda,
      startAt: startAt,
      durationMinutes: plan.durationMinutes,
      endAt: endAt,
      location: plan.location,
      meetingType: plan.meetingType,
      status: "scheduled",
      organizedByType: organizerId ? "manager" : "organization",
      organizedByEmployee: organizerId,
      // The employee is on the guest list even for the meeting they run
      // themselves: that is how the meeting screens show it.
      attendees: [
        {
          employee: employeeId,
          response: plan.response,
          note: "",
          respondedAt: plan.response === "invited" ? null : daysBeforeToday(1),
        },
      ],
      notes: "",
      actionItems: [],
      statusHistory: [
        {
          status: "scheduled",
          note: "Meeting scheduled.",
          byType: organizerId ? "manager" : "organization",
          byEmployee: organizerId,
          at: daysBeforeToday(2),
        },
      ],
    });
  }

  // -------------------------------------------------------------------
  // 8. Say what the screen should now show
  // -------------------------------------------------------------------

  // So you can check the panel against this instead of counting rows by hand.
  //
  // "Open tasks" is the only number that is read back from the database
  // instead of being written down here: it counts EVERY unfinished task of
  // this employee, and they may well have had some of their own before this
  // script ran.
  const openTaskCount = await Task.countDocuments({
    organization: orgId,
    assignedTo: employeeId,
    status: { $in: ["todo", "in_progress", "in_review"] },
  });

  console.log("");
  console.log(
    "Inserted                     :",
    tasks.length,
    "tasks,",
    meetingPlans.length,
    "meetings"
  );
  console.log("");
  console.log("What " + employee.name + " has on, should now say:");
  console.log("  Open tasks               :", openTaskCount);
  console.log("  High or urgent           : 3");
  console.log("  Due in the leave         : 2");
  console.log("  Overdue                  : 1");
  console.log("  Work touching these days : 4 rows (the low one is filtered out)");
  console.log("  Meetings inside the leave: 3, one with the organizer crown");
  console.log("");
  console.log("And three more warnings should appear above the panels:");
  console.log("  Critical resource  - 3 high or urgent tasks");
  console.log("  Deadline conflict  - 2 due inside the leave, 1 already overdue");
  console.log("  Meeting conflict   - 3 meetings, 1 of them run by this employee");

  await mongoose.disconnect();
}

seedLeaveWorkload();
