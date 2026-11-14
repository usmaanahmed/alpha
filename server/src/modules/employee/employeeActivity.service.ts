import type { ActivityEvent, EmployeeIds } from "./employee.types.js";
import * as repository from "./employeeActivity.repository.js";
import type { ServiceActor } from "../../types/service.types.js";
import type { TaskStatus } from "../task/task.model.js";
import type { MeetingStatus } from "../meeting/meeting.model.js";
import { todayStart } from "../../utils/date.util.js";
import { readTaskTime } from "../../utils/taskTime.util.js";
import { syncLeaveAttendance } from "../../utils/leaveAttendance.util.js";

// ---------------------------------------------------------------------------
// GET /api/employees/:id/activity
//
// Everything one employee is busy with RIGHT NOW, in one answer.
//
// It is read by the accordion of the employee table: somebody opens a row and
// wants to know, in two seconds, "is this person free today, what is on their
// plate, and what did they last do". Four modules hold pieces of that answer
// (tasks, meetings, attendance, leaves), so instead of the browser asking for
// four whole lists and cutting them down itself, the server puts the small
// answer together here and sends only what the panel really draws.
//
// A row is opened one person at a time, so this runs only when somebody
// really asked for it, never for the whole table at once.
// ---------------------------------------------------------------------------
// The three statuses that mean "this task is still work". A cancelled task is
// not work any more, and a completed one is history.
const OPEN_TASK_STATUSES: TaskStatus[] = ["todo", "in_progress", "in_review"];

// The two statuses that mean "this meeting is still going to happen".
const OPEN_MEETING_STATUSES: MeetingStatus[] = ["scheduled", "in_progress"];

// How many lines each list of the panel is allowed to have. The panel is a
// quick look, not a page: more than this and nobody reads it any more.
const MAX_TASKS = 6;

const MAX_MEETINGS = 6;

const MAX_TIMELINE = 8;

// The word the feed writes for each meeting status. It is a lookup and not a
// chain of ifs, so a new status is one line to add.
const MEETING_ACTION_WORD: Record<string, string> = {
  scheduled: "Meeting set",
  in_progress: "In a meeting",
  completed: "Met about",
  cancelled: "Meeting called off",
};

// The same idea for a leave request.
const LEAVE_ACTION_WORD: Record<string, string> = {
  pending: "Asked for leave",
  approved: "Leave approved",
  partially_approved: "Leave partly approved",
  rejected: "Leave rejected",
  cancelled: "Leave cancelled",
};

// One line of the "recent activity" feed. The four modules all end up in this
// same shape, so the panel draws one list instead of four.
// Is this date the same UTC day as that one? Every day of the app is stored
// as midnight UTC, so comparing the three parts is enough and the answer
// never moves by one because of a timezone.
function isSameDay(a: Date, b: Date) {
  return (a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate());
}

// What this employee answered to the invitation of that meeting, or null when
// they are not on the attendee list at all (they organized it themselves).
function readMyResponse(attendees: {
  employee: unknown;
  response: string;
}[], employeeId: string) {
  const mine = attendees.find((attendee) => String(attendee.employee) === employeeId);
  return mine ? mine.response : null;
}

// populate() replaced the id with the whole leave type, but TypeScript still
// sees the id written in the model, so we read the name through this small
// helper instead of writing the same cast in four places.
function readLeaveTypeName(leaveType: unknown) {
  const filled = leaveType as {
    name?: string;
  } | null;
  return filled?.name || "Leave";
}

export async function getEmployeeActivity(actor: ServiceActor, ids: EmployeeIds) {
  // The organization id always comes from the login token, so one workspace
  // can never read the day of somebody in another one.
  const organizationId = String(actor.user?.organizationId);
  const employee = await repository.findEmployee(ids, organizationId);
  if (!employee) {
    return {
      status: "not_found",
      message: "Employee not found",
    };
  }
  const employeeId = employee._id;
  // Midnight UTC of today, the same "day" the whole HR module works with.
  const today = todayStart();
  // The moment this request is being answered. The meeting rail uses it to
  // know what is already over and what is still coming.
  const now = new Date();
  // Today as a window of real moments, for the records that carry a time: a
  // meeting starts at 14:30, it does not simply "happen on a day".
  const dayStart = today;
  const dayEnd = new Date(today);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  // Somebody with an approved leave for today has no attendance row until a
  // page asks for that day. We write those rows first, exactly like the
  // attendance page does, so "on leave" here says the same thing the HR sees.
  await syncLeaveAttendance(organizationId, today, today, String(employeeId));
  // -------------------------------------------------------------------------
  // 1. Where is this person today: present, away, or not in yet
  // -------------------------------------------------------------------------
  const attendanceToday = await repository.findAttendanceToday(organizationId, employeeId, today);
  // The approved leave that covers today, when there is one. It is what turns
  // "absent" into "away on purpose", so the panel never shouts about a person
  // who is on a holiday everybody agreed to.
  const leaveToday = await repository.findLeaveToday(organizationId, employeeId, today);
  // The next approved leave that has not started yet: "away from Thursday".
  const upcomingLeave = await repository.findUpcomingLeave(organizationId, employeeId, today);
  // A request nobody has answered yet is work waiting on somebody ELSE, and
  // that is worth showing on the row of the person who is waiting.
  const pendingLeaveCount = await repository.countPendingLeaveRequests(organizationId, employeeId);
  // -------------------------------------------------------------------------
  // 2. The work on their plate
  // -------------------------------------------------------------------------
  // Every task that is still real work. The list is short in practice (it is
  // one person's open work), so we read it once and count from it, instead of
  // asking the database the same question four times.
  const openTasks = await repository.findOpenTasks(organizationId, employeeId, OPEN_TASK_STATUSES);
  let overdueTasks = 0;
  let dueTodayTasks = 0;
  let inProgressTasks = 0;
  // The estimated hours of the work that lands on TODAY. A task counts here
  // when it is already late, when it is due today, or when it has been
  // started, because all three mean somebody is spending hours on it now. A
  // task due next week is real work, but it is not work that takes an hour
  // out of this day, so it stays out of this sum.
  let taskHoursToday = 0;
  openTasks.forEach((task) => {
    const isStarted = task.status === "in_progress";
    if (isStarted) {
      inProgressTasks = inProgressTasks + 1;
    }
    // A task without a deadline can never be late. It still costs hours today
    // if somebody has already started it.
    if (!task.dueDate) {
      if (isStarted) {
        taskHoursToday = taskHoursToday + task.estimatedHours;
      }
      return;
    }
    const isDueToday = isSameDay(task.dueDate, today);
    const isLate = !isDueToday && task.dueDate.getTime() < today.getTime();
    if (isDueToday) {
      dueTodayTasks = dueTodayTasks + 1;
    }
    else if (isLate) {
      overdueTasks = overdueTasks + 1;
    }
    // One task is one share of the day even when it is both started and due,
    // so its hours are added once and not once per reason.
    if (isStarted || isDueToday || isLate) {
      taskHoursToday = taskHoursToday + task.estimatedHours;
    }
  });
  // The most pressing work first: the oldest deadline at the top, and the
  // tasks with no deadline at all at the bottom, because nothing is late
  // about them.
  const sortedTasks = [...openTasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) {
      return 0;
    }
    if (!a.dueDate) {
      return 1;
    }
    if (!b.dueDate) {
      return -1;
    }
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
  // What went out of the door in the last seven days. It is the one number
  // here that says something good, and a panel that only counts problems is
  // not a fair picture of a person.
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const completedThisWeek = await repository.countCompletedThisWeek(organizationId, employeeId, sevenDaysAgo);
  // -------------------------------------------------------------------------
  // 3. The meetings of the day
  // -------------------------------------------------------------------------
  // A person is in a meeting either because they were invited to it or
  // because they set it up themselves. Both mean their day is booked, so the
  // same two lines are used by every meeting question below.
  const inThisMeeting = {
    $or: [
      { "attendees.employee": employeeId },
      { organizedByEmployee: employeeId },
    ],
  };
  const meetingsToday = await repository.findMeetingsToday(organizationId, dayStart, dayEnd, inThisMeeting);
  // How much of the day is already spoken for. Only the meetings that are
  // still standing count: a cancelled one gives the time back.
  let bookedMinutes = 0;
  meetingsToday.forEach((meeting) => {
    if (OPEN_MEETING_STATUSES.includes(meeting.status)) {
      bookedMinutes = bookedMinutes + meeting.durationMinutes;
    }
  });
  // The next meeting that has not finished yet, whatever day it is on. It is
  // what the panel puts under "next up", so a person whose day is empty still
  // sees when they are needed again.
  const nextMeeting = await repository.findNextMeeting(organizationId, now, OPEN_MEETING_STATUSES, inThisMeeting);
  // -------------------------------------------------------------------------
  // 4. The recent activity feed
  // -------------------------------------------------------------------------
  //
  // Four modules, one list. Every module answers "what did this person last
  // do", we put the lines in one basket, and the newest ones win. Nothing is
  // invented here: every line is a real record with a real moment on it.
  const events: ActivityEvent[] = [];
  // --- tasks ---
  const recentTasks = await repository.findRecentTasks(organizationId, employeeId, MAX_TIMELINE);
  recentTasks.forEach((task) => {
    if (task.status === "completed" && task.completedAt) {
      // A finished task has a final answer to "how long did this take", so
      // the line carries it. Its clock was stopped the moment it was
      // completed, so every stretch is settled and the number never moves.
      const time = readTaskTime(task.workSessions, dayStart);
      events.push({
        id: "task-done-" + String(task._id),
        kind: "task",
        action: "Finished",
        title: task.title,
        at: task.completedAt,
        refId: String(task._id),
        tookMinutes: time.settledMinutesTotal,
      });
      return;
    }
    // A task nobody has touched since it was made is simply new work.
    // Mongoose writes createdAt and updatedAt in the same moment then, so one
    // second of difference is enough to tell the two apart.
    const wasTouched = task.updatedAt.getTime() - task.createdAt.getTime() > 1000;
    events.push({
      id: "task-" + String(task._id),
      kind: "task",
      action: wasTouched ? "Working on" : "Received",
      title: task.title,
      at: wasTouched ? task.updatedAt : task.createdAt,
      refId: String(task._id),
    });
  });
  // --- meetings ---
  const recentMeetings = await repository.findRecentMeetings(organizationId, inThisMeeting, MAX_TIMELINE);
  recentMeetings.forEach((meeting) => {
    // The last line of the history is what the meeting became last, and it
    // carries the moment it happened. A meeting always has at least one line,
    // written the day it was scheduled, but we check before reading it.
    const lastEntry = meeting.statusHistory[meeting.statusHistory.length - 1];
    events.push({
      id: "meeting-" + String(meeting._id),
      kind: "meeting",
      action: lastEntry
        ? MEETING_ACTION_WORD[lastEntry.status] || "Meeting"
        : "Meeting set",
      title: meeting.title,
      at: lastEntry ? lastEntry.at : meeting.createdAt,
      refId: String(meeting._id),
    });
  });
  // --- leaves ---
  const recentLeaves = await repository.findRecentLeaves(organizationId, employeeId);
  recentLeaves.forEach((leave) => {
    events.push({
      id: "leave-" + String(leave._id),
      kind: "leave",
      action: LEAVE_ACTION_WORD[leave.status] || "Leave",
      title: readLeaveTypeName(leave.leaveType),
      // An answered request is news on the day it was ANSWERED, not on the
      // day it was written, so the feed puts it where it really belongs.
      at: leave.reviewedAt || leave.createdAt,
      refId: String(leave._id),
    });
  });
  // --- attendance ---
  // Only the two moments of today. Older days are already a calendar on the
  // detail page, and this feed is about what is fresh.
  if (attendanceToday && attendanceToday.checkIn) {
    events.push({
      id: "check-in-" + String(attendanceToday._id),
      kind: "attendance",
      action: "Checked in",
      title: "Start of day",
      at: attendanceToday.checkIn,
      refId: "",
    });
  }
  if (attendanceToday && attendanceToday.checkOut) {
    events.push({
      id: "check-out-" + String(attendanceToday._id),
      kind: "attendance",
      action: "Checked out",
      title: "End of day",
      at: attendanceToday.checkOut,
      refId: "",
    });
  }
  // Newest first, then only the first few: this is a glance, not a log book.
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  const timeline = events.slice(0, MAX_TIMELINE);
  // -------------------------------------------------------------------------
  // 5. The one small object the panel draws
  // -------------------------------------------------------------------------
  return {
    status: "success",
    data: {
      // The day this answer is about, so the browser never has to guess.
      today: today,
      serverTime: now,
      presence: {
        // null when nobody wrote anything for today yet: not in, not marked.
        status: attendanceToday ? attendanceToday.status : null,
        checkIn: attendanceToday ? attendanceToday.checkIn : null,
        checkOut: attendanceToday ? attendanceToday.checkOut : null,
        workedHours: attendanceToday ? attendanceToday.workedHours : 0,
      },
      leave: {
        today: leaveToday
          ? {
            _id: String(leaveToday._id),
            typeName: readLeaveTypeName(leaveToday.leaveType),
            fromDate: leaveToday.fromDate,
            toDate: leaveToday.toDate,
          }
          : null,
        upcoming: upcomingLeave
          ? {
            _id: String(upcomingLeave._id),
            typeName: readLeaveTypeName(upcomingLeave.leaveType),
            fromDate: upcomingLeave.fromDate,
            toDate: upcomingLeave.toDate,
          }
          : null,
        pendingCount: pendingLeaveCount,
      },
      workload: {
        openTasks: openTasks.length,
        inProgressTasks: inProgressTasks,
        dueTodayTasks: dueTodayTasks,
        overdueTasks: overdueTasks,
        completedThisWeek: completedThisWeek,
        meetingsToday: meetingsToday.length,
        bookedMinutes: bookedMinutes,
        taskMinutesToday: Math.round(taskHoursToday * 60),
      },
      // Only the fields the panel draws, so the answer stays small even for
      // somebody carrying fifty tasks.
      tasks: sortedTasks.slice(0, MAX_TASKS).map((task) => {
        // How long this task has been worked on: today, and in total since
        // the first time somebody started it. A stretch that is still running
        // is not counted here - the browser adds it, so the figure on the
        // screen keeps climbing between two answers.
        const time = readTaskTime(task.workSessions, dayStart);
        return {
          _id: String(task._id),
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          settledMinutesToday: time.settledMinutesToday,
          settledMinutesTotal: time.settledMinutesTotal,
          runningSince: time.runningSince,
        };
      }),
      meetings: meetingsToday.slice(0, MAX_MEETINGS).map((meeting) => ({
        _id: String(meeting._id),
        title: meeting.title,
        startAt: meeting.startAt,
        endAt: meeting.endAt,
        durationMinutes: meeting.durationMinutes,
        meetingType: meeting.meetingType,
        location: meeting.location,
        status: meeting.status,
        attendeeCount: meeting.attendees.length,
        // What THIS person answered to the invitation. It stays null when
        // they are not invited but organized the meeting themselves.
        myResponse: readMyResponse(meeting.attendees, String(employeeId)),
      })),
      nextMeeting: nextMeeting
        ? {
          _id: String(nextMeeting._id),
          title: nextMeeting.title,
          startAt: nextMeeting.startAt,
          endAt: nextMeeting.endAt,
        }
        : null,
      timeline: timeline,
    },
  };
}
