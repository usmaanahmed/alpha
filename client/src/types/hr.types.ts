// All the types of the HR module live in this one file, because the
// holidays, the leaves and the attendance are used together on most pages.

// --- Holiday ---

export interface Holiday {
  _id: string;
  name: string;
  date: string;
  isOptional: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// --- Leave type ---

export interface LeaveType {
  _id: string;
  name: string;
  daysPerYear: number;
  isPaid: boolean;
  // ON  -> a public holiday inside the leave is not counted as a leave day.
  // OFF -> it is counted like any other day.
  excludeHolidays: boolean;
  // May the employee attach supporting papers when applying for this type?
  // When it is false the upload field is not drawn in the apply form at all.
  allowDocuments: boolean;
  // Only means something when allowDocuments is true.
  documentRequirement: "optional" | "required";
  // The policy of the organization for this type: which kinds of file, how
  // big one file may be, and how many of them. See lib/leaveDocuments.ts.
  allowedFileKinds: string[];
  maxFileSizeMb: number;
  maxFiles: number;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

// --- Leave balance ---

// remaining is counted by the server, it is never saved in the database.
export interface LeaveBalance {
  _id: string;
  leaveType: {
    _id: string;
    name: string;
    isPaid: boolean;
  };
  year: number;
  allocated: number;
  used: number;
  remaining: number;
}

// --- Leave request ---

export type LeaveRequestStatus =
  | "pending"
  | "approved"
  | "partially_approved"
  | "rejected"
  | "cancelled";

// What happened to ONE day of the leave.
//
// "approved" is a real leave day, "rejected" is a day a person said no to,
// and "excluded" is a day a rule took out (a weekend, a public holiday, or a
// day whose attendance was already written). The reason explains the last two.
export type LeaveDayStatus = "approved" | "rejected" | "excluded";

export interface LeaveDay {
  date: string;
  status: LeaveDayStatus;
  reason: string;
}

// One supporting paper the employee attached to a leave request, for example
// a medical certificate. It is the same shape as a task attachment: the
// server keeps the file on its disk and sends us only the card that says how
// to find it and how to show it.
export interface LeaveDocument {
  _id: string;
  // The name the server invented, used in the address of the file.
  fileName: string;
  // The name the file had on the computer of the employee. This is the only
  // name we ever show on the screen.
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

// One task or one meeting the approver pointed at while answering: "you are
// away, but this still needs you".
//
// refId opens the real thing, and the rest is a copy made at the moment of
// the answer, so the line still reads correctly years later even when that
// meeting is gone.
export interface LeaveReference {
  kind: "task" | "meeting";
  refId: string;
  title: string;
  // A task keeps its due day here, a meeting its start moment. null for a
  // task with no due date. It is a real date and not ready-made text, so the
  // browser of the employee shows the time in their own clock.
  at: string | null;
  // The priority of a task, or "in_person" / "online" for a meeting.
  note: string;
}

// One step of the approval workflow, written down and never changed again.
export interface LeaveApproval {
  actorEmployee: string | null;
  actorName: string;
  // "Employee", "Team lead", "HR / Approver" or "Organization".
  actorRole: string;
  // "applied", "recommended", "not_recommended", "approved",
  // "partially_approved", "rejected" or "cancelled".
  action: string;
  note: string;
  days: number;
  // The work this step pointed at. Empty on every step that pointed at none.
  references: LeaveReference[];
  at: string;
}

// The server sends the employee, the department and the leave type already
// filled in (that is what populate does), so the table can show their names.
//
// The four can* / isMine fields are added by the server for every row, so the
// React side knows which buttons it may show without repeating the rules here.
export interface LeaveRequest {
  _id: string;
  employee: {
    _id: string;
    name: string;
    email: string;
    photo: string;
  };
  department: {
    _id: string;
    name: string;
  };
  leaveType: {
    _id: string;
    name: string;
    isPaid: boolean;
    excludeHolidays?: boolean;
  };
  fromDate: string;
  toDate: string;
  // What the employee asked for on the day they applied. It never changes.
  requestedDays: number;
  // What was really approved. It stays 0 until somebody answers.
  approvedDays: number;
  // The number every page shows: the asked one while the request waits, the
  // approved one once it is answered.
  totalDays: number;
  // One line per calendar day of the leave. This is what lets the history
  // explain why the approved days are not the requested days.
  leaveDays: LeaveDay[];
  excludeWeekends: boolean;
  excludeHolidays: boolean;
  reason: string;
  // The papers the employee handed in with the request. They are part of the
  // audit trail, so they are never removed.
  documents: LeaveDocument[];
  status: LeaveRequestStatus;
  approvalHistory: LeaveApproval[];
  reviewedByEmployee: {
    _id: string;
    name: string;
    email: string;
    // The picture of the person who answered the request.
    photo: string;
  } | null;
  reviewedAt: string | null;
  reviewRemarks: string;
  canReview: boolean;
  // True for the team lead of that employee: they may write a note, not decide.
  canRecommend: boolean;
  canCancel: boolean;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Leave context: what an approver sees before deciding ---

// The small card of one person, used in every list of the conflict panel.
export interface LeavePerson {
  _id: string;
  name: string;
  photo: string;
  designation: string;
  departmentName: string;
}

// One colleague who is away, or may be away, in the same days.
export interface LeaveOverlap {
  employee: LeavePerson;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  // How many of their days fall inside the period we are looking at.
  daysInPeriod: number;
  status: LeaveRequestStatus;
}

// One department or one team, and how much of it is away.
export interface LeaveGroupSummary {
  _id: string;
  name: string;
  departmentName?: string;
  total: number;
  onLeave: number;
  pending: number;
  percent: number;
  // Only on a team: is the person asking for the leave in it?
  hasRequester?: boolean;
}

// One open task of the employee that touches the requested days.
//
// relation says WHY the task is on the list: it is due inside the leave, it
// is already late, or the work runs across the leave.
// Only what the LIST needs. Pressing a row opens the real task detail dialog,
// and that reads the whole task from the task module itself.
export interface LeaveWorkloadTask {
  _id: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
  dueDate: string | null;
  relation: "due_in_leave" | "overdue" | "spans_leave";
  isOverdue: boolean;
}

export interface LeaveWorkloadMeeting {
  _id: string;
  title: string;
  startAt: string;
  endAt: string;
  meetingType: "in_person" | "online";
  status: string;
  // Running a meeting is harder to hand over than sitting in one.
  isOrganizer: boolean;
  response: string;
}

// One thing the approver should look at. It never blocks an approval, it
// only says what the system can see.
export interface LeaveWarning {
  key: string;
  level: "danger" | "warning" | "info";
  title: string;
  message: string;
}

// Everything we count about one pile of leave requests: this month, this
// year, or all of them. One shape, used three times, so the three blocks of
// the screen can never drift apart.
export interface LeavePeriodStats {
  requests: number;
  approved: number;
  rejected: number;
  pending: number;
  cancelled: number;
  daysRequested: number;
  daysApproved: number;
  daysRejected: number;
  byLeaveType: { name: string; requests: number; daysApproved: number }[];
}

// The short card of one leave: "the last time this person was away".
export interface LeaveHistoryCard {
  fromDate: string;
  toDate: string;
  leaveTypeName: string;
  days: number;
  status: LeaveRequestStatus;
}

export interface LeaveHistory {
  // Every request this person ever sent.
  overall: LeavePeriodStats;
  // The requests SUBMITTED this month: how often they are asking right now.
  month: LeavePeriodStats & { label: string };
  // The leave that BELONGS to this year, counted by its first day, the same
  // way the leave balance is.
  year: LeavePeriodStats & {
    label: string;
    monthlyTrend: {
      month: number;
      label: string;
      requests: number;
      daysApproved: number;
    }[];
  };
  balance: {
    year: number;
    allocated: number;
    used: number;
    remaining: number;
    utilizationPercent: number;
  } | null;
  insights: {
    approvalRate: number;
    rejectionRate: number;
    averageDaysPerRequest: number;
    lastLeave: LeaveHistoryCard | null;
    lastApproved: LeaveHistoryCard | null;
    lastRejected: LeaveHistoryCard | null;
    longestLeaveDays: number;
  };
  // The habits found in the requests. Same shape as the conflict warnings,
  // so the same component draws both.
  patterns: LeaveWarning[];
}

export interface LeaveContext {
  period: { fromDate: string; toDate: string };
  policy: { minWorkforcePercent: number; highConflictPercent: number };
  conflict: {
    fromDate: string;
    toDate: string;
    employeesWithRequests: number;
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    onApprovedLeave: LeaveOverlap[];
    onPendingLeave: LeaveOverlap[];
    byDepartment: LeaveGroupSummary[];
    byTeam: LeaveGroupSummary[];
    workforce: number;
    absentNow: number;
    // What the numbers would become if this request is approved.
    absentIfApproved: number;
    absentPercentNow: number;
    absentPercentIfApproved: number;
    availablePercentIfApproved: number;
    department: {
      name: string;
      total: number;
      absentIfApproved: number;
      availablePercentIfApproved: number;
    } | null;
  };
  workload: {
    tasks: LeaveWorkloadTask[];
    openTaskCount: number;
    criticalTaskCount: number;
    dueInLeaveCount: number;
    overdueCount: number;
    meetings: LeaveWorkloadMeeting[];
    organizedMeetingCount: number;
  };
  // The leave story of the employee who is asking.
  history: LeaveHistory;
  warnings: LeaveWarning[];
}

// The two numbers of the organization the warnings are measured against.
export interface LeavePolicy {
  minWorkforcePercent: number;
  highConflictPercent: number;
}

// --- Attendance ---

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "on_leave"
  | "holiday";

// On the list of one day the employee is populated, on the list of my own
// month it is only the id, so it can be both.
export interface Attendance {
  _id: string;
  employee:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        photo: string;
        designation: string;
      };
  department:
    | string
    | {
        _id: string;
        name: string;
      };
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workedHours: number;
  status: AttendanceStatus;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}
