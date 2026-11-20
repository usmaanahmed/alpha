import type { TaskStatus, TaskPriority } from "./task.types";
import type { MeetingStatus, AttendeeResponse } from "./meeting.types";
import type { AttendanceStatus } from "./hr.types";

// The server sends the employee with the department and the role already
// filled in (that is what populate does on the server), so we can show their
// names directly in the table.
export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  department: {
    _id: string;
    name: string;
  };
  role: {
    _id: string;
    name: string;
    status: "active" | "inactive";
  };

  // --- HR profile ---
  // The file name of the uploaded picture, for example
  // "employee-1753180000-123456789.jpg". Empty means no picture.
  photo: string;
  designation: string;
  // The education of the person, like "BSc Computer Science".
  // Employees saved before this field existed have no value, so it can be missing.
  qualification?: string;
  employmentType: "full_time" | "part_time" | "intern" | "contract";
  // The dates come back as text like "2026-07-30T00:00:00.000Z",
  // and null when the field was left empty.
  joiningDate: string | null;
  dateOfBirth: string | null;
  gender: "male" | "female" | "other" | "";
  address: string;
  exitDate: string | null;
  exitReason: string;

  createdAt: string;
  updatedAt: string;
}

// One leave request of an employee, as read on the employee detail page.
//
// This is simpler than the LeaveRequest of the HR module: here the employee
// is already known (it is the person whose page we are on), and there are no
// "can I review / cancel this?" buttons, because this page only reads.
export interface EmployeeLeave {
  _id: string;
  leaveType: {
    _id: string;
    name: string;
    isPaid: boolean;
  };
  fromDate: string;
  toDate: string;
  // What was asked for, and what really counts after the answer. They are
  // not always the same number, and the "leave requests" page explains why.
  requestedDays: number;
  approvedDays: number;
  totalDays: number;
  reason: string;
  status:
    | "pending"
    | "approved"
    | "partially_approved"
    | "rejected"
    | "cancelled";
  reviewedByEmployee: {
    _id: string;
    name: string;
    email: string;
    // The picture of the person who answered the request.
    photo: string;
  } | null;
  reviewedAt: string | null;
  reviewRemarks: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// The "what is this person doing today" answer
// ---------------------------------------------------------------------------
//
// GET /api/employees/:id/activity sends all of this in one object, and the
// accordion of the employee table draws it. The server already cut every list
// down to the few lines the panel shows, so nothing here has to be filtered
// again in the browser.

// One line of the recent activity feed. A task, a meeting, a leave and a
// check in all arrive in this same shape, so the feed is one list.
export interface EmployeeActivityEvent {
  id: string;
  kind: "task" | "meeting" | "leave" | "attendance";
  // What happened: "Finished", "Checked in", "Leave approved"...
  action: string;
  // What it happened to: the task title, the meeting title, the leave type.
  title: string;
  at: string;
  // Which record to open, empty when the line opens nothing.
  refId: string;
  // Only a finished task carries this: the minutes of work it took, added up
  // over every stretch somebody spent on it.
  tookMinutes?: number;
}

// One open task of this person, trimmed to what the panel draws.
export interface EmployeeActivityTask {
  _id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  // The minutes of FINISHED work on this task, today and in total. Only the
  // time it spent in "in progress" is counted, and the stretch that is still
  // running is not in here - runningSince is, and the browser adds it.
  settledMinutesToday: number;
  settledMinutesTotal: number;
  // When the current stretch of work began, or null when nobody is on it.
  runningSince: string | null;
}

// One meeting of today.
export interface EmployeeActivityMeeting {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  meetingType: "in_person" | "online";
  location: string;
  status: MeetingStatus;
  attendeeCount: number;
  // What this person answered to the invitation, null when they organized
  // the meeting themselves and were never invited to it.
  myResponse: AttendeeResponse | null;
}

// An approved leave that covers today, or the next one coming.
export interface EmployeeActivityLeave {
  _id: string;
  typeName: string;
  fromDate: string;
  toDate: string;
}

export interface EmployeeActivity {
  // The day the answer is about, and the clock of the server when it was
  // written. The panel counts "in 40 minutes" from the second one.
  today: string;
  serverTime: string;

  presence: {
    // null when nobody wrote anything for today yet: not in, not marked.
    status: AttendanceStatus | null;
    checkIn: string | null;
    checkOut: string | null;
    workedHours: number;
  };

  leave: {
    today: EmployeeActivityLeave | null;
    upcoming: EmployeeActivityLeave | null;
    // Leave requests of this person that nobody has answered yet.
    pendingCount: number;
  };

  workload: {
    openTasks: number;
    inProgressTasks: number;
    dueTodayTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
    meetingsToday: number;
    // How many minutes of today are already sitting in meetings.
    bookedMinutes: number;
    // The estimated minutes of the tasks that land on today: the late ones,
    // the ones due today, and the ones already started.
    taskMinutesToday: number;
  };

  tasks: EmployeeActivityTask[];
  meetings: EmployeeActivityMeeting[];

  // The next meeting that has not finished yet, on any day. It is what the
  // "next up" tile shows when there is nothing left today.
  nextMeeting: {
    _id: string;
    title: string;
    startAt: string;
    endAt: string;
  } | null;

  timeline: EmployeeActivityEvent[];
}
