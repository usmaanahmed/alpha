import type {
  LeaveRequestDocument,
  LeaveRequestDetails,
  LeaveEmployee,
  LeaveApproval,
  LeaveReference,
  LeaveOptions,
  LeaveRequestInput,
  LeaveIds,
  LeavePolicyInput,
  LeaveRecommendInput,
  LeaveReviewInput,
} from "./leave.types.js";
import type mongoose from "mongoose";
import * as repository from "./leave.repository.js";
import type { ServiceActor, UploadedFile } from "../../types/service.types.js";
import { can } from "../../utils/currentUser.util.js";
import type { LoggedInEmployee } from "../../utils/currentUser.util.js";
import { PERMISSIONS } from "../../config/permissions.js";
import { toDayStart } from "../../utils/date.util.js";
import { getMyTeamMemberIds, isInMyTeam } from "../../utils/team.util.js";
import { canApproveLeaveOf } from "../../utils/leaveApprover.util.js";
import { planLeaveDays, countApprovedDays, statusFromPlan } from "../../utils/leaveDays.util.js";
import { syncLeaveAttendance } from "../../utils/leaveAttendance.util.js";
import { buildLeaveContext, buildLeaveReferences } from "../../utils/leaveContext.util.js";
import { getOrCreateLeavePolicy } from "./leavePolicy.repository.js";
import { deleteFileUploads } from "../../middlewares/upload.middleware.js";
import { isFileKindAllowed, describeFileKinds } from "../../config/leaveDocuments.js";
import {
  notifyLeaveReviewed,
  notifyLeaveRecommended,
  notifyLeaveCancelled,
  notifyLeavePolicyChanged,
} from "../../utils/notification.util.js";

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// Read the balance row of one employee for one leave type and one year,
// and create it the first time it is needed.
//
// The row copies daysPerYear of the leave type into "allocated", so a later
// change of the leave type does not take days away from somebody who is
// already using them.
async function getOrCreateBalance(organizationId: string, employeeId: string, leaveType: {
  _id: mongoose.Types.ObjectId;
  daysPerYear: number;
}, year: number) {
  const existingBalance = await repository.findExistingBalance(organizationId, employeeId, leaveType, year);
  if (existingBalance) {
    return existingBalance;
  }
  return await repository.insertLeaveBalance(organizationId, employeeId, leaveType, year);
}

// Do the files the employee just sent fit the rules of this leave type?
//
// It answers with the message to show, or "" when everything is fine. The
// rules live on the leave type, so the answer can be different for a sick
// leave and for a casual one.
//
// multer already refused anything outside the ceilings of the whole app (see
// upload.middleware.ts). This is the second, narrower check: it is the one
// that knows THIS leave type only takes a PDF of at most 5 MB.
function checkLeaveDocuments(leaveType: {
  allowDocuments: boolean;
  documentRequirement: string;
  allowedFileKinds: string[];
  maxFileSizeMb: number;
  maxFiles: number;
  name: string;
}, files: UploadedFile[]) {
  if (!leaveType.allowDocuments) {
    // The apply form does not even draw the upload field for this type, so a
    // file here means somebody went around the form.
    return files.length > 0
      ? '"' + leaveType.name + '" does not accept any document'
      : "";
  }
  if (leaveType.documentRequirement === "required" && files.length === 0) {
    return ('"' + leaveType.name + '" needs at least one supporting document');
  }
  if (files.length > leaveType.maxFiles) {
    return ("You can attach at most " +
      leaveType.maxFiles +
      (leaveType.maxFiles === 1 ? " document" : " documents") +
      " to this leave type");
  }
  const sizeLimit = leaveType.maxFileSizeMb * 1024 * 1024;
  for (const file of files) {
    if (file.size > sizeLimit) {
      return ('"' +
        file.originalname +
        '" is bigger than ' +
        leaveType.maxFileSizeMb +
        " MB");
    }
    if (!isFileKindAllowed(leaveType.allowedFileKinds, file.originalname, file.mimetype)) {
      return ('"' +
        file.originalname +
        '" is not accepted. This leave type takes ' +
        describeFileKinds(leaveType.allowedFileKinds) +
        ".");
    }
  }
  return "";
}

// Who is allowed to make the FINAL decision on the request of one employee.
//
// The rule itself lives in utils/leaveApprover.util.ts, because the task
// module asks the very same question before letting an approver open one of
// the tasks this screen showed them. One rule, one file, no drift.
const canReview = canApproveLeaveOf;

// Has this person already written its recommendation on this request?
//
// A team lead speaks once. Letting the same person add note after note would
// only make the history harder to read, and the note they wanted to change
// they can still say in words to the HR.
function hasAlreadyRecommended(request: {
  approvalHistory: LeaveApproval[];
}, me: LoggedInEmployee | null) {
  if (me === null) {
    return false;
  }
  return (request.approvalHistory || []).some((entry) => String(entry.actorEmployee || "") === String(me.employee._id) &&
    (entry.action === "recommended" || entry.action === "not_recommended"));
}

// The words we write in the history for the person who did the step, so a
// line reads "Sara Khan (Team lead) recommended this leave".
function describeActorRole(me: LoggedInEmployee | null, isTeamLeadOfRequester: boolean) {
  if (me === null) {
    return "Organization";
  }
  if (isTeamLeadOfRequester) {
    return "Team lead";
  }
  return "HR / Approver";
}

// Add one line to the history of a request. The lines are never changed and
// never removed, they only pile up, because that is what an audit trail is.
function addToHistory(request: LeaveRequestDocument, entry: {
  me: LoggedInEmployee | null;
  actorRole: string;
  action: string;
  note: string;
  days: number;
  // The tasks and meetings this step pointed at. Only an answer carries
  // them, so every other step leaves it out.
  references?: LeaveReference[];
}) {
  request.approvalHistory.push({
    actorEmployee: entry.me ? entry.me.employee._id : null,
    // The name is copied, so the history still reads correctly when that
    // employee has left the company.
    actorName: entry.me ? entry.me.employee.name : "Organization",
    actorRole: entry.actorRole,
    action: entry.action,
    note: entry.note,
    days: entry.days,
    references: entry.references || [],
    at: new Date(),
  });
}

// Every request in a list gets a few extra true/false fields, so the React
// side knows which buttons it can show for that row.
//
// myTeamMemberIds is the list of everybody the logged in person is the team
// lead of. It is read once per request to the server and handed down here,
// instead of asking the database again for every single row.
function addPermissionFlags(
  request: LeaveRequestDetails,
  me: LoggedInEmployee | null,
  employeeOfRequest: LeaveEmployee | null,
  myTeamMemberIds: string[],
) {
  const isMine = me !== null && String(employeeOfRequest?._id) === String(me.employee._id);
  const isMyTeamMember = myTeamMemberIds.includes(String(employeeOfRequest?._id));
  return {
    ...request,
    // A request saved before the day list, the history and the documents
    // existed simply has none of those fields. mongoose fills a missing field
    // with its default when it builds a real document, but the list above is
    // read with lean(), which hands back exactly what is in the database and
    // nothing more. So we fill the holes here, once, and the React side never
    // has to ask "does this request have a day list?" on every single line.
    requestedDays: request.requestedDays ?? request.totalDays ?? 0,
    approvedDays: request.approvedDays ?? 0,
    leaveDays: request.leaveDays || [],
    approvalHistory: request.approvalHistory || [],
    documents: request.documents || [],
    excludeWeekends: request.excludeWeekends ?? true,
    excludeHolidays: request.excludeHolidays ?? true,
    canReview: request.status === "pending" && canReview(me, employeeOfRequest),
    // The team lead does not decide, it advises. So the button is there for
    // the lead of that employee, as long as they have not spoken yet.
    canRecommend: request.status === "pending" &&
      !isMine &&
      isMyTeamMember &&
      !hasAlreadyRecommended(request, me),
    // Only the person who asked can take the request back, and only while
    // nobody has answered it yet.
    canCancel: isMine && request.status === "pending",
    isMine: isMine,
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// GET /api/leaves?view=mine|team&status=pending
// Who sees what:
// - the organization, and anybody with "leaves.view_all", sees every request
//   of the organization,
// - somebody with "leaves.approve" sees its own requests (view=mine) or the
//   requests of the people that report to it (view=team),
// - a team lead always also sees the requests of its own team members, even
//   without any permission, because a request is routed to them for a note,
// - a normal employee always sees only its own requests.
export async function getAllLeaveRequests(actor: ServiceActor, options: LeaveOptions) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  // The people this person is the team lead of. For the organization account
  // the list is empty: an organization is not the lead of a team.
  const myTeamMemberIds = me
    ? await getMyTeamMemberIds(organizationId, String(me.employee._id))
    : [];
  const filter: Record<string, unknown> = { organization: organizationId };
  if (me && !can(me, PERMISSIONS.LEAVES_VIEW_ALL)) {
    if (myTeamMemberIds.length > 0 && options.view === "team") {
      // A team lead without any leave permission: it sees the requests of its
      // own members, because it has to be able to write its note on them.
      filter.employee = { $in: myTeamMemberIds };
    }
    else {
      filter.employee = me.employee._id;
    }
  }
  if (typeof options.status === "string" && options.status !== "all") {
    filter.status = options.status;
  }
  // lean() gives plain objects instead of mongoose documents, so we can
  // add the extra fields to every request before sending them.
  const requests = await repository.findRequests(filter);
  const requestsWithFlags = requests.map((request) => addPermissionFlags(request, me, request.employee, myTeamMemberIds));
  return {
    status: "success",
    data: requestsWithFlags,
  };
}

// GET /api/leaves/my-balance?year=2026
// The employee sees how many days it still has of every active leave type.
// The rows that do not exist yet are created here, so a brand new employee
// already sees the full list with the full number of days.
export async function getMyLeaveBalance(actor: ServiceActor, options: LeaveOptions) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only an employee has a leave balance",
    };
  }
  const year = Number(options.year) || new Date().getUTCFullYear();
  const leaveTypes = await repository.findLeaveTypes(organizationId);
  const balances = [];
  for (const leaveType of leaveTypes) {
    const balance = await getOrCreateBalance(organizationId, String(me.employee._id), leaveType, year);
    balances.push({
      _id: String(balance._id),
      leaveType: {
        _id: String(leaveType._id),
        name: leaveType.name,
        isPaid: leaveType.isPaid,
      },
      year: balance.year,
      allocated: balance.allocated,
      used: balance.used,
      // We never save this one, it is always allocated - used.
      remaining: balance.allocated - balance.used,
    });
  }
  return {
    status: "success",
    data: balances,
  };
}

// POST /api/leaves
// An employee asks for some days off, and may send supporting papers with it.
//
// The form is a multipart form, so by the time we get here multer has ALREADY
// written the files to the disk. That is why every "no" below goes through
// refuse(): it answers the employee and throws the files away in the same
// breath, so a request that never became a leave never leaves a file behind.
export async function createLeaveRequest(
  actor: ServiceActor,
  input: LeaveRequestInput,
  uploadedFiles: UploadedFile[],
) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const files = uploadedFiles;
  // Say no, and clean up the files of this request while we are at it.
  function refuse(message: string, status = 400) {
    deleteFileUploads(files);
    let outcome = "invalid";
    if (status === 401) {
      outcome = "unauthorized";
    }
    if (status === 403) {
      outcome = "forbidden";
    }
    if (status === 404) {
      outcome = "not_found";
    }
    if (status === 409) {
      outcome = "conflict";
    }
    return {
      status: outcome,
      message: message,
      data: undefined,
    };
  }
  if (!me) {
    return refuse("Only an employee can apply for a leave", 403);
  }
  const fromDate = toDayStart(input.fromDate);
  const toDate = toDayStart(input.toDate);
  if (!fromDate || !toDate) {
    return refuse("Please choose valid dates");
  }
  if (toDate.getTime() < fromDate.getTime()) {
    return refuse("The last day cannot be before the first day");
  }
  // The balance is kept per year, so one request must stay inside one year.
  // A leave over new year is simply asked as two requests.
  if (fromDate.getUTCFullYear() !== toDate.getUTCFullYear()) {
    return refuse("A leave must stay inside one year. Please apply twice, once for each year.");
  }
  const leaveType = await repository.findLeaveType(input, organizationId);
  if (!leaveType) {
    return refuse("This leave type is not available");
  }
  // Now that we know the leave type we know its document rules, so this is
  // the first moment the files can really be judged.
  const documentProblem = checkLeaveDocuments(leaveType, files);
  if (documentProblem) {
    return refuse(documentProblem);
  }
  // The same days must not already be asked for in another request.
  // Two ranges touch each other when one starts before the other ends.
  const overlappingRequest = await repository.findOverlappingRequest(organizationId, me, toDate, fromDate);
  if (overlappingRequest) {
    return refuse("You already have a leave request on these days");
  }
  // The day by day plan of the request as it is asked for. The weekends are
  // left out here, because that is the normal case and the approver can still
  // put them back in while answering. The holidays follow the switch of the
  // leave type. The attendance is not asked yet: the days are in the future,
  // so there is nothing recorded to look at.
  const plan = await planLeaveDays({
    organizationId: organizationId,
    employeeId: String(me.employee._id),
    fromDate: fromDate,
    toDate: toDate,
    excludeHolidays: leaveType.excludeHolidays,
    excludeWeekends: true,
    approvedDates: null,
    useAttendance: false,
  });
  const requestedDays = countApprovedDays(plan);
  if (requestedDays === 0) {
    return refuse("These days are all weekend or holiday, so you do not need a leave");
  }
  // We check the balance already here, so the employee gets a clear message
  // now instead of a rejection later. It is checked again on approve,
  // because other requests can be approved in the meantime.
  const balance = await getOrCreateBalance(organizationId, String(me.employee._id), leaveType, fromDate.getUTCFullYear());
  const remaining = balance.allocated - balance.used;
  if (requestedDays > remaining) {
    return refuse("You asked for " +
      requestedDays +
      " days but only " +
      remaining +
      " are left of this leave type");
  }
  const leaveRequest = await repository.insertLeaveRequest(organizationId, me, leaveType, fromDate, toDate, requestedDays, plan, input, files);
  return {
    status: "success",
    message: "Leave request sent successfully",
    data: leaveRequest,
  };
}

// GET /api/leaves/:id/context
// Everything an approver should know before answering this request: who else
// is away in the same days, what this employee has on their plate then, and
// the short list of warnings that comes out of both.
//
// It is its own route on purpose. The leave LIST must stay cheap, and none of
// this is needed until somebody opens one request to decide about it.
export async function getLeaveRequestContext(actor: ServiceActor, ids: LeaveIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const leaveRequest = await repository.findLeaveRequest(ids, organizationId);
  if (!leaveRequest) {
    return {
      status: "not_found",
      message: "Leave request not found",
    };
  }
  const employeeOfRequest = await repository.findEmployeeOfRequest(leaveRequest);
  if (!employeeOfRequest) {
    return {
      status: "not_found",
      message: "The employee of this request does not exist any more",
    };
  }
  // This answer says who else of the company is away and what one named
  // person is working on, so it is only for the people who have to DECIDE
  // about the request: an approver, or the team lead who advises them.
  const isMyMember = me
    ? await isInMyTeam(organizationId, String(me.employee._id), String(leaveRequest.employee))
    : false;
  if (!canReview(me, employeeOfRequest) && !isMyMember) {
    return {
      status: "forbidden",
      message: "You are not allowed to see the context of this leave request",
    };
  }
  const context = await buildLeaveContext(organizationId, leaveRequest);
  return {
    status: "success",
    data: context,
  };
}

// GET /api/leaves/policy
// The two numbers the warnings are measured against. Everybody who can open
// the leave pages may read them, because they are shown next to the warnings
// they explain.
export async function getLeavePolicySettings(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const policy = await getOrCreateLeavePolicy(organizationId);
  return {
    status: "success",
    data: {
      minWorkforcePercent: policy.minWorkforcePercent,
      highConflictPercent: policy.highConflictPercent,
    },
  };
}

// PUT /api/leaves/policy
// The organization sets its own two numbers. The route asks for the same
// permission as editing a leave type, because this is the same job: setting
// up how leave works in this company.
export async function updateLeavePolicySettings(actor: ServiceActor, input: LeavePolicyInput) {
  const organizationId = String(actor.user?.organizationId);
  const policy = await getOrCreateLeavePolicy(organizationId);
  policy.minWorkforcePercent = input.minWorkforcePercent;
  policy.highConflictPercent = input.highConflictPercent;
  await repository.savePolicy(policy);
  // The rules behind every request just changed, so the people who answer
  // those requests are told before they answer the next one.
  const me = actor.employee;
  await notifyLeavePolicyChanged({
    organizationId: organizationId,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Leave policy saved",
    data: {
      minWorkforcePercent: policy.minWorkforcePercent,
      highConflictPercent: policy.highConflictPercent,
    },
  };
}

// PATCH /api/leaves/:id/recommend
// The team lead of the employee writes what it thinks about the request.
//
// This is NOT a decision: the days are not taken and the status does not
// move. It is the first level of the workflow, and the HR or the organization
// reads this note before making the final call.
export async function recommendLeaveRequest(actor: ServiceActor, input: LeaveRecommendInput, ids: LeaveIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only a team lead can recommend a leave request",
    };
  }
  const leaveRequest = await repository.findLeaveRequest(ids, organizationId);
  if (!leaveRequest) {
    return {
      status: "not_found",
      message: "Leave request not found",
    };
  }
  if (leaveRequest.status !== "pending") {
    return {
      status: "invalid",
      message: "This request was already answered",
    };
  }
  // Being a team lead is not a permission, it is the employee the
  // organization put at the head of that team, so the answer comes from the
  // team list. See utils/team.util.ts.
  const isMyMember = await isInMyTeam(organizationId, String(me.employee._id), String(leaveRequest.employee));
  if (!isMyMember) {
    return {
      status: "forbidden",
      message: "You are not the team lead of this employee",
    };
  }
  if (hasAlreadyRecommended(leaveRequest, me)) {
    return {
      status: "invalid",
      message: "You already wrote your recommendation on this request",
    };
  }
  const isFor = input.recommendation === "approve";
  addToHistory(leaveRequest, {
    me: me,
    actorRole: "Team lead",
    action: isFor ? "recommended" : "not_recommended",
    note: input.note || "",
    // A recommendation decides nothing, so it changes no number of days.
    days: 0,
  });
  await repository.saveLeaveRequest(leaveRequest);
  const employeeOfRequest = await repository.findEmployeeOfRequest(leaveRequest);
  // The people who will make the real decision are the ones waiting for this.
  await notifyLeaveRecommended({
    organizationId: organizationId,
    employeeName: employeeOfRequest ? employeeOfRequest.name : "an employee",
    byName: me.employee.name,
    actorUserId: String(actor.user?.userId),
    isFor: isFor,
  });
  return {
    status: "success",
    message: "Your recommendation was saved",
    data: leaveRequest,
  };
}

// PATCH /api/leaves/:id/review
// The organization, an HR or the manager of that employee makes the final
// decision on the request.
//
// Three things can be chosen here, and all three are written down:
// - approved or rejected,
// - which of the requested days are approved (a partial approval),
// - whether the weekends inside the leave count as leave days.
export async function reviewLeaveRequest(actor: ServiceActor, input: LeaveReviewInput, ids: LeaveIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  const leaveRequest = await repository.findLeaveRequest(ids, organizationId);
  if (!leaveRequest) {
    return {
      status: "not_found",
      message: "Leave request not found",
    };
  }
  if (leaveRequest.status !== "pending") {
    return {
      status: "invalid",
      message: "This request was already answered",
    };
  }
  const employeeOfRequest = await repository.findEmployeeOfRequest(leaveRequest);
  if (!employeeOfRequest) {
    return {
      status: "not_found",
      message: "The employee of this request does not exist any more",
    };
  }
  if (!canReview(me, employeeOfRequest)) {
    return {
      status: "forbidden",
      message: "You are not allowed to answer this leave request",
    };
  }
  const leaveType = await repository.findRequestLeaveType(leaveRequest);
  if (!leaveType) {
    return {
      status: "invalid",
      message: "The leave type of this request does not exist any more",
    };
  }
  // The approver said no to the whole request. Every day becomes a rejected
  // day, so the history still shows the full list of what was asked for.
  if (input.status === "rejected") {
    leaveRequest.leaveDays = leaveRequest.leaveDays.map((day) => ({
      date: day.date,
      status: "rejected" as const,
      reason: "Not approved by the approver",
    }));
    leaveRequest.approvedDays = 0;
    leaveRequest.totalDays = 0;
    leaveRequest.status = "rejected";
  }
  else {
    // The days the approver ticked. When the form sends nothing we take it as
    // "all of them", which is the plain "approve everything" answer.
    const approvedDates: string[] | null = Array.isArray(input.approvedDates)
      ? input.approvedDates
      : null;
    // The weekend switch of the approver. Left out it stays what the request
    // already carried, which is "the weekends do not count".
    const excludeWeekends = typeof input.excludeWeekends === "boolean"
      ? input.excludeWeekends
      : leaveRequest.excludeWeekends;
    // The plan is built again from scratch, now with everything we know:
    // the choice of the approver, the weekend switch, the holiday switch of
    // the leave type, and this time also the attendance. A day whose
    // attendance is already written is given back to the employee, so a leave
    // approved late really starts on the next day that is still open.
    const plan = await planLeaveDays({
      organizationId: organizationId,
      employeeId: String(leaveRequest.employee),
      fromDate: leaveRequest.fromDate,
      toDate: leaveRequest.toDate,
      // The switch of the leave type as it stands today.
      excludeHolidays: leaveType.excludeHolidays,
      excludeWeekends: excludeWeekends,
      approvedDates: approvedDates,
      useAttendance: true,
    });
    const approvedDays = countApprovedDays(plan);
    const balance = await getOrCreateBalance(organizationId, String(leaveRequest.employee), leaveType, leaveRequest.fromDate.getUTCFullYear());
    // We check the balance again here, because other requests of the same
    // employee may have been approved after this one was sent.
    const remaining = balance.allocated - balance.used;
    if (approvedDays > remaining) {
      return {
        status: "invalid",
        message: "This employee has only " +
          remaining +
          " days left, so " +
          approvedDays +
          " days cannot be approved",
      };
    }
    // Approving is the moment the days are really taken.
    balance.used = balance.used + approvedDays;
    await repository.saveBalance(balance);
    leaveRequest.leaveDays = plan;
    leaveRequest.approvedDays = approvedDays;
    leaveRequest.totalDays = approvedDays;
    leaveRequest.excludeWeekends = excludeWeekends;
    leaveRequest.excludeHolidays = leaveType.excludeHolidays;
    leaveRequest.status = statusFromPlan(plan);
  }
  // The organization account is not an employee, so it stays null there.
  leaveRequest.reviewedByEmployee = me ? me.employee._id : null;
  leaveRequest.reviewedAt = new Date();
  leaveRequest.reviewRemarks = input.reviewRemarks || "";
  // A team lead can also carry "leaves.approve", and then the same person is
  // both levels of the workflow. The history should say which hat they were
  // wearing, so we ask the team list once more here.
  const reviewerIsTeamLead = me
    ? await isInMyTeam(organizationId, String(me.employee._id), String(leaveRequest.employee))
    : false;
  // The work the approver pointed at while answering. The ids come from the
  // form, everything the employee will read is looked up from the database,
  // and anything that is not really this employee's work is dropped.
  const references = await buildLeaveReferences(organizationId, String(leaveRequest.employee), Array.isArray(input.references) ? input.references : []);
  addToHistory(leaveRequest, {
    me: me,
    actorRole: describeActorRole(me, reviewerIsTeamLead),
    action: leaveRequest.status,
    note: leaveRequest.reviewRemarks,
    days: leaveRequest.approvedDays,
    references: references,
  });
  await repository.saveLeaveRequest(leaveRequest);
  // An approved leave is also an answer to the question "was this person at
  // work?", so the attendance of those days becomes "on leave" right away.
  if (leaveRequest.status !== "rejected") {
    await syncLeaveAttendance(organizationId, leaveRequest.fromDate, leaveRequest.toDate, String(leaveRequest.employee));
  }
  // The person who asked for the days has been waiting for exactly this, so
  // they hear it the second it is decided, wherever they are in the app.
  await notifyLeaveReviewed({
    organizationId: organizationId,
    employeeId: String(leaveRequest.employee),
    employeeName: employeeOfRequest.name,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
    status: leaveRequest.status,
    approvedDays: leaveRequest.approvedDays,
  });
  return {
    status: "success",
    message: reviewMessageOf(leaveRequest.status, leaveRequest.approvedDays),
    data: leaveRequest,
  };
}

// The sentence the approver reads back after saving the answer.
function reviewMessageOf(status: string, approvedDays: number) {
  if (status === "rejected") {
    return "Leave rejected";
  }
  if (status === "partially_approved") {
    return "Leave partly approved: " + approvedDays + " days";
  }
  if (approvedDays === 0) {
    return "Leave approved, but no day was left to take from the balance";
  }
  return "Leave approved: " + approvedDays + " days";
}

// PATCH /api/leaves/:id/cancel
// The employee takes its own request back, but only while nobody
// has answered it yet.
export async function cancelLeaveRequest(actor: ServiceActor, ids: LeaveIds) {
  const organizationId = String(actor.user?.organizationId);
  const me = actor.employee;
  if (!me) {
    return {
      status: "forbidden",
      message: "Only the employee who asked can cancel a leave request",
    };
  }
  const leaveRequest = await repository.findEmployeeLeaveRequest(ids, organizationId, me);
  if (!leaveRequest) {
    return {
      status: "not_found",
      message: "Leave request not found",
    };
  }
  if (leaveRequest.status !== "pending") {
    return {
      status: "invalid",
      message: "Only a request that is still waiting can be cancelled",
    };
  }
  // The days were never taken from the balance, because that happens only
  // on approve, so here there is nothing to give back.
  leaveRequest.status = "cancelled";
  leaveRequest.totalDays = 0;
  addToHistory(leaveRequest, {
    me: me,
    actorRole: "Employee",
    action: "cancelled",
    note: "",
    days: 0,
  });
  await repository.saveLeaveRequest(leaveRequest);
  // Whoever was going to answer this request now has one thing less to do.
  // Without this line the request would sit on their list and nobody would
  // be waiting for it.
  await notifyLeaveCancelled({
    organizationId: organizationId,
    employeeName: me.employee.name,
    byName: me.employee.name,
    actorUserId: String(actor.user?.userId),
  });
  return {
    status: "success",
    message: "Leave request cancelled",
    data: leaveRequest,
  };
}
