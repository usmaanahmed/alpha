import { Employee } from "../modules/employee/employee.model.js";
import { Team } from "../modules/team/team.model.js";
import { Task } from "../modules/task/task.model.js";
import { Meeting } from "../modules/meeting/meeting.model.js";
import { LeaveRequest } from "../modules/leave/leave.model.js";
import { getOrCreateLeavePolicy } from "../modules/leave/leavePolicy.repository.js";
import { buildLeaveHistory } from "./leaveHistory.util.js";
import { toDayText } from "./date.util.js";

// Everything an approver should know BEFORE saying yes to a leave request.
//
// The approval screen used to show one request on its own, and that is not
// enough to decide with: three people of the same team may already be away
// that week, and the person asking may be the one holding the urgent task
// that is due on the Thursday inside their leave. None of that is visible
// from the request itself.
//
// So this file answers two questions about one requested period:
//
//   1. WHO ELSE is away then?      -> the leave conflict summary
//   2. WHAT does this person have  -> their tasks and meetings in those days
//      on their plate then?
//
// and then turns both into a short list of warnings, which is the part an
// approver really reads.
//
// Everything here only READS. It never changes a leave, so it can be asked
// for as often as the screen likes.

// The last moment of the last day of the leave.
//
// A leave day is saved as midnight UTC, but a meeting is a real moment with a
// time on it. So "a meeting inside this leave" has to be measured against the
// END of the last day, otherwise a meeting at 10:00 on the last day would
// look like it happens after the leave.
function endOfDay(day: Date) {
  const end = new Date(day);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

// Does this leave request really take somebody out of the office on at least
// one day of the period we are looking at?
//
// A request that was answered carries its day list, and only the days marked
// "approved" are real days off: a weekend inside the leave, a day the
// approver left out, or a day whose attendance was already written does not
// make anybody absent. A request that has no day list (it is still waiting,
// or it is older than that feature) is measured by its plain period.
function touchesPeriod(leave: any, fromDate: Date, toDate: Date) {
  const hasDayList = leave.leaveDays && leave.leaveDays.length > 0;

  if (!hasDayList) {
    return (
      leave.fromDate.getTime() <= toDate.getTime() &&
      leave.toDate.getTime() >= fromDate.getTime()
    );
  }

  return leave.leaveDays.some(
    (day: any) =>
      day.status === "approved" &&
      day.date.getTime() >= fromDate.getTime() &&
      day.date.getTime() <= toDate.getTime()
  );
}

// The small card of one person, the same shape everywhere on the screen.
function personCard(employee: any) {
  return {
    _id: String(employee?._id || ""),
    name: employee?.name || "Employee removed",
    photo: employee?.photo || "",
    designation: employee?.designation || "",
    departmentName: employee?.department?.name || "",
  };
}

// How many of those days fall inside the period we care about. A colleague
// who is away for the whole week matters more than one who is away for a day
// of it, and this is the number that says which of the two it is.
function daysInsidePeriod(leave: any, fromDate: Date, toDate: Date) {
  const hasDayList = leave.leaveDays && leave.leaveDays.length > 0;

  if (!hasDayList) {
    return leave.totalDays || 0;
  }

  return leave.leaveDays.filter(
    (day: any) =>
      day.status === "approved" &&
      day.date.getTime() >= fromDate.getTime() &&
      day.date.getTime() <= toDate.getTime()
  ).length;
}

// A percentage, rounded, and never dividing by zero.
function percentOf(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }

  return Math.round((part / whole) * 100);
}

export async function buildLeaveContext(
  organizationId: string,
  leaveRequest: any
) {
  const fromDate = leaveRequest.fromDate;
  const toDate = leaveRequest.toDate;
  const requesterId = String(leaveRequest.employee);

  const policy = await getOrCreateLeavePolicy(organizationId);

  // -------------------------------------------------------------------
  // 1. Who else asked for days in this same period
  // -------------------------------------------------------------------

  // Everybody who still works here. An inactive employee is not part of the
  // workforce any more, so they are not counted in any percentage.
  const activeEmployees = await Employee.find({
    organization: organizationId,
    status: "active",
  })
    .select("name photo designation department")
    .populate("department", "name")
    .lean();

  // Every request of the organization whose period touches this one, except
  // the request we are deciding about right now.
  const otherRequests = await LeaveRequest.find({
    organization: organizationId,
    _id: { $ne: leaveRequest._id },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  })
    // The employee AND the department of that employee, in one populate:
    // the list shows "Sara Khan, Engineering" on every line.
    .populate({
      path: "employee",
      select: "name photo designation department",
      populate: { path: "department", select: "name" },
    })
    .populate("leaveType", "name")
    .lean();

  const approvedList = [];
  const pendingList = [];
  let rejectedCount = 0;

  // The people who are really out of the office in this period, and the
  // people who might be. A Set, because one person can have two requests and
  // must still be counted as one absent person.
  const absentEmployeeIds = new Set<string>();
  const maybeAbsentEmployeeIds = new Set<string>();
  // Everybody who asked for anything in this period, whatever the answer was.
  const employeesWhoAsked = new Set<string>();

  for (const request of otherRequests) {
    const employeeId = String((request.employee as any)?._id || "");
    employeesWhoAsked.add(employeeId);

    const isApproved =
      request.status === "approved" || request.status === "partially_approved";

    if (isApproved && touchesPeriod(request, fromDate, toDate)) {
      absentEmployeeIds.add(employeeId);

      approvedList.push({
        employee: personCard(request.employee),
        leaveTypeName: (request.leaveType as any)?.name || "",
        fromDate: toDayText(request.fromDate),
        toDate: toDayText(request.toDate),
        daysInPeriod: daysInsidePeriod(request, fromDate, toDate),
        status: request.status,
      });

      continue;
    }

    if (request.status === "pending" && touchesPeriod(request, fromDate, toDate)) {
      maybeAbsentEmployeeIds.add(employeeId);

      pendingList.push({
        employee: personCard(request.employee),
        leaveTypeName: (request.leaveType as any)?.name || "",
        fromDate: toDayText(request.fromDate),
        toDate: toDayText(request.toDate),
        daysInPeriod: daysInsidePeriod(request, fromDate, toDate),
        status: request.status,
      });

      continue;
    }

    if (request.status === "rejected") {
      rejectedCount = rejectedCount + 1;
    }
  }

  // -------------------------------------------------------------------
  // 2. The same picture, department by department and team by team
  // -------------------------------------------------------------------

  // The department of every active person, so we can count both sides
  // (how many people the department has, and how many of them are away).
  const departments = new Map<
    string,
    { _id: string; name: string; total: number; onLeave: number; pending: number }
  >();

  for (const employee of activeEmployees) {
    const department = employee.department as any;
    const departmentId = String(department?._id || "none");

    if (!departments.has(departmentId)) {
      departments.set(departmentId, {
        _id: departmentId,
        name: department?.name || "No department",
        total: 0,
        onLeave: 0,
        pending: 0,
      });
    }

    const row = departments.get(departmentId)!;
    row.total = row.total + 1;

    const employeeId = String(employee._id);

    if (absentEmployeeIds.has(employeeId)) {
      row.onLeave = row.onLeave + 1;
    } else if (maybeAbsentEmployeeIds.has(employeeId)) {
      row.pending = row.pending + 1;
    }
  }

  const byDepartment = [...departments.values()]
    .map((row) => ({ ...row, percent: percentOf(row.onLeave, row.total) }))
    // The department with the biggest hole first: that is the one an
    // approver has to look at.
    .sort((left, right) => right.percent - left.percent);

  // The teams of the organization. The lead is counted as part of their own
  // team here, because a team without its lead is just as short-handed as a
  // team without a member.
  const teams = await Team.find({
    organization: organizationId,
    status: "active",
  })
    .populate("department", "name")
    .lean();

  const byTeam = teams
    .map((team) => {
      const memberIds = [String(team.teamLead)].concat(
        team.members.map((member) => String(member))
      );

      const onLeave = memberIds.filter((id) => absentEmployeeIds.has(id)).length;
      const pending = memberIds.filter((id) =>
        maybeAbsentEmployeeIds.has(id)
      ).length;

      return {
        _id: String(team._id),
        name: team.name,
        departmentName: (team.department as any)?.name || "",
        total: memberIds.length,
        onLeave: onLeave,
        pending: pending,
        percent: percentOf(onLeave, memberIds.length),
        // Is the person asking for the leave in this team? That team is the
        // one the screen shows first.
        hasRequester: memberIds.includes(requesterId),
      };
    })
    .sort((left, right) => right.percent - left.percent);

  // -------------------------------------------------------------------
  // 3. What this person has on their plate in those days
  // -------------------------------------------------------------------

  // Every task of this employee that is not finished. There are never many,
  // so we read them all and sort them out here instead of building one very
  // clever query that nobody can read afterwards.
  const openTasks = await Task.find({
    organization: organizationId,
    assignedTo: requesterId,
    status: { $in: ["todo", "in_progress", "in_review"] },
  })
    // Only what the LIST of tasks needs. Pressing one of them opens the real
    // task dialog, and that asks the task module for the whole task itself,
    // so there is no reason to carry all of it in this answer.
    .select("title priority status startDate dueDate")
    .lean();

  const periodEnd = endOfDay(toDate);
  const today = new Date();

  const tasks = [];

  for (const task of openTasks) {
    const dueDate = task.dueDate;
    const startDate = task.startDate;

    // Already late, whatever the leave says. This one is worth showing even
    // when its dates are nowhere near the period.
    const isOverdue = dueDate !== null && dueDate.getTime() < today.getTime();

    const isDueInLeave =
      dueDate !== null &&
      dueDate.getTime() >= fromDate.getTime() &&
      dueDate.getTime() <= periodEnd.getTime();

    // The work itself runs across the leave: it started before the last day
    // and it is not finished before the first one.
    const spansLeave =
      startDate !== null &&
      startDate.getTime() <= periodEnd.getTime() &&
      (dueDate === null || dueDate.getTime() >= fromDate.getTime());

    if (!isOverdue && !isDueInLeave && !spansLeave) {
      continue;
    }

    tasks.push({
      _id: String(task._id),
      title: task.title,
      priority: task.priority,
      status: task.status,
      dueDate: dueDate ? toDayText(dueDate) : null,
      // Why this task is on the list. The screen shows this word, so nobody
      // has to work out for themselves why a task is here.
      relation: isDueInLeave ? "due_in_leave" : isOverdue ? "overdue" : "spans_leave",
      isOverdue: isOverdue,
    });
  }

  // The urgent and high tasks are the ones that make somebody a critical
  // resource for those days.
  const criticalTasks = tasks.filter(
    (task) => task.priority === "urgent" || task.priority === "high"
  );

  const dueInLeaveTasks = tasks.filter((task) => task.relation === "due_in_leave");
  const overdueTasks = tasks.filter((task) => task.isOverdue);

  // The meetings that fall inside the leave. A meeting this person SET UP
  // counts too, and counts for more: an attendee can be missed, an organizer
  // usually cannot.
  const meetingRows = await Meeting.find({
    organization: organizationId,
    status: { $in: ["scheduled", "in_progress"] },
    startAt: { $lte: periodEnd },
    endAt: { $gte: fromDate },
    $or: [
      { "attendees.employee": requesterId },
      { organizedByEmployee: requesterId },
    ],
  })
    .select("title startAt endAt meetingType status organizedByEmployee attendees")
    .sort({ startAt: 1 })
    .lean();

  const meetings = meetingRows.map((meeting) => {
    const isOrganizer = String(meeting.organizedByEmployee || "") === requesterId;

    const myAttendance = meeting.attendees.find(
      (attendee) => String(attendee.employee) === requesterId
    );

    return {
      _id: String(meeting._id),
      title: meeting.title,
      startAt: meeting.startAt,
      endAt: meeting.endAt,
      meetingType: meeting.meetingType,
      status: meeting.status,
      isOrganizer: isOrganizer,
      response: myAttendance ? myAttendance.response : "invited",
    };
  });

  const organizedMeetings = meetings.filter((meeting) => meeting.isOrganizer);

  // -------------------------------------------------------------------
  // 4. The numbers of the whole workforce
  // -------------------------------------------------------------------

  const workforce = activeEmployees.length;
  const absentNow = absentEmployeeIds.size;
  // The question an approver is really asking is not "how many are away", it
  // is "how many WOULD be away if I say yes", so the person in front of them
  // is counted in.
  const absentIfApproved = absentNow + 1;

  const requesterDepartmentId = String(
    activeEmployees.find(
      (employee) => String(employee._id) === requesterId
    )?.department?._id || ""
  );

  const requesterDepartment = departments.get(requesterDepartmentId) || null;

  const conflict = {
    fromDate: toDayText(fromDate),
    toDate: toDayText(toDate),
    // "Total number of employees who have already submitted leave requests"
    // for this period, whatever the answer to those requests was.
    employeesWithRequests: employeesWhoAsked.size,
    approvedCount: approvedList.length,
    pendingCount: pendingList.length,
    rejectedCount: rejectedCount,
    onApprovedLeave: approvedList,
    onPendingLeave: pendingList,
    byDepartment: byDepartment,
    byTeam: byTeam,
    workforce: workforce,
    absentNow: absentNow,
    absentIfApproved: absentIfApproved,
    absentPercentNow: percentOf(absentNow, workforce),
    absentPercentIfApproved: percentOf(absentIfApproved, workforce),
    availablePercentIfApproved: 100 - percentOf(absentIfApproved, workforce),
    department: requesterDepartment
      ? {
          name: requesterDepartment.name,
          total: requesterDepartment.total,
          absentIfApproved: requesterDepartment.onLeave + 1,
          availablePercentIfApproved:
            100 -
            percentOf(
              requesterDepartment.onLeave + 1,
              requesterDepartment.total
            ),
        }
      : null,
  };

  const workload = {
    tasks: tasks,
    openTaskCount: openTasks.length,
    criticalTaskCount: criticalTasks.length,
    dueInLeaveCount: dueInLeaveTasks.length,
    overdueCount: overdueTasks.length,
    meetings: meetings,
    organizedMeetingCount: organizedMeetings.length,
  };

  // The leave story of this one employee: how often they ask, how often they
  // are approved, and which habits show up in it. Two people can ask for the
  // same three days and still deserve a different answer, and this is the
  // part that says which is which.
  const history = await buildLeaveHistory(organizationId, requesterId);

  return {
    period: { fromDate: toDayText(fromDate), toDate: toDayText(toDate) },
    policy: {
      minWorkforcePercent: policy.minWorkforcePercent,
      highConflictPercent: policy.highConflictPercent,
    },
    conflict: conflict,
    workload: workload,
    history: history,
    warnings: buildWarnings(conflict, workload, policy),
  };
}

// Turn the ids the approver ticked into real, checked references.
//
// The browser sends only "task" or "meeting" and an id. Everything the
// employee will READ is looked up here instead of being believed: the title,
// the date and the short word next to it all come out of the database.
//
// And every reference is checked against the employee whose leave this is. An
// approver may point at the work of the person they are answering, and at
// nothing else, so a stray id from anywhere in the organization is dropped
// rather than refused: it is not worth failing a whole approval over.
export async function buildLeaveReferences(
  organizationId: string,
  employeeId: string,
  wanted: { kind: string; refId: string }[]
) {
  const references = [];

  for (const item of wanted) {
    if (item.kind === "task") {
      const task = await Task.findOne({
        _id: item.refId,
        organization: organizationId,
        // Only a task this employee is actually holding.
        assignedTo: employeeId,
      }).select("title priority dueDate");

      if (task) {
        references.push({
          kind: "task" as const,
          refId: task._id,
          title: task.title,
          at: task.dueDate,
          note: task.priority,
        });
      }

      continue;
    }

    const meeting = await Meeting.findOne({
      _id: item.refId,
      organization: organizationId,
      // Only a meeting this employee is really part of, as a guest or as
      // the person running it.
      $or: [
        { "attendees.employee": employeeId },
        { organizedByEmployee: employeeId },
      ],
    }).select("title startAt meetingType");

    if (meeting) {
      references.push({
        kind: "meeting" as const,
        refId: meeting._id,
        title: meeting.title,
        at: meeting.startAt,
        note: meeting.meetingType,
      });
    }
  }

  return references;
}

// One thing the approver should look at before deciding.
interface LeaveWarning {
  // A short name the React side can key on.
  key: string;
  // "danger" is a real problem, "warning" is worth a look, "info" is a fact
  // that is only worth saying out loud.
  level: "danger" | "warning" | "info";
  title: string;
  message: string;
}

// Turn the two piles of numbers above into the handful of sentences that
// actually change a decision.
//
// Nothing here BLOCKS an approval. The approver is the one who knows whether
// the urgent task can wait a week, so the screen tells them what it sees and
// then gets out of the way.
function buildWarnings(
  conflict: any,
  workload: any,
  policy: { minWorkforcePercent: number; highConflictPercent: number }
): LeaveWarning[] {
  const warnings: LeaveWarning[] = [];

  // 1. Too many people away at the same time.
  if (
    conflict.workforce > 0 &&
    conflict.absentPercentIfApproved >= policy.highConflictPercent
  ) {
    warnings.push({
      key: "high_leave_conflict",
      level: "warning",
      title: "High leave conflict",
      message:
        conflict.absentIfApproved +
        " of " +
        conflict.workforce +
        " people (" +
        conflict.absentPercentIfApproved +
        "%) would be away in these days, which is over the " +
        policy.highConflictPercent +
        "% your organization calls busy.",
    });
  }

  // 2. Approving would leave too few people at their desks. The organization
  //    and the department of this employee are both asked, because a company
  //    can look fine while one department is emptied out.
  const belowOrganization =
    conflict.workforce > 0 &&
    conflict.availablePercentIfApproved < policy.minWorkforcePercent;

  const belowDepartment =
    conflict.department !== null &&
    conflict.department.total > 0 &&
    conflict.department.availablePercentIfApproved < policy.minWorkforcePercent;

  if (belowOrganization || belowDepartment) {
    const where = belowDepartment
      ? "The " + conflict.department.name + " department would be at " + conflict.department.availablePercentIfApproved + "%"
      : "Your organization would be at " + conflict.availablePercentIfApproved + "%";

    warnings.push({
      key: "minimum_workforce",
      level: "danger",
      title: "Minimum workforce threshold exceeded",
      message:
        where +
        " available, under the " +
        policy.minWorkforcePercent +
        "% minimum set in your leave policy.",
    });
  }

  // 3. This person is holding work that cannot simply wait.
  if (workload.criticalTaskCount > 0) {
    warnings.push({
      key: "critical_resource",
      level: "warning",
      title: "Critical resource",
      message:
        "This employee has " +
        workload.criticalTaskCount +
        (workload.criticalTaskCount === 1
          ? " high or urgent task"
          : " high or urgent tasks") +
        " running through these days.",
    });
  }

  // 4. A deadline falls inside the leave, or is already late.
  if (workload.dueInLeaveCount > 0 || workload.overdueCount > 0) {
    const pieces = [];

    if (workload.dueInLeaveCount > 0) {
      pieces.push(
        workload.dueInLeaveCount +
          (workload.dueInLeaveCount === 1 ? " task is due" : " tasks are due") +
          " inside the leave"
      );
    }

    if (workload.overdueCount > 0) {
      pieces.push(
        workload.overdueCount +
          (workload.overdueCount === 1 ? " task is" : " tasks are") +
          " already overdue"
      );
    }

    warnings.push({
      key: "deadline_conflict",
      level: "warning",
      title: "Deadline conflict",
      message: pieces.join(", and ") + ".",
    });
  }

  // 5. Meetings inside the leave. Being the organizer of one is the worse
  //    case, so it gets its own sentence.
  if (workload.meetings.length > 0) {
    warnings.push({
      key: "meeting_conflict",
      level: workload.organizedMeetingCount > 0 ? "warning" : "info",
      title: "Meeting conflict",
      message:
        workload.meetings.length +
        (workload.meetings.length === 1 ? " meeting is" : " meetings are") +
        " scheduled in these days" +
        (workload.organizedMeetingCount > 0
          ? ", and this employee is running " +
            workload.organizedMeetingCount +
            " of them."
          : "."),
    });
  }

  return warnings;
}
