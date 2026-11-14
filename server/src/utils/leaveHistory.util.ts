import { LeaveRequest } from "../modules/leave/leave.model.js";
import { LeaveBalance } from "../modules/leave/leaveBalance.model.js";
import { toDayText } from "./date.util.js";

// The leave story of ONE employee, for the approver looking at their request.
//
// Two people ask for the same three days in the same week, and the right
// answer is not the same for both: one has not taken a day all year, the
// other has been away in four of the last six months. The request itself
// cannot say which is which. This file can.
//
// Everything here only READS. It never changes a leave.

// ---------------------------------------------------------------------------
// The numbers we look for a pattern in
// ---------------------------------------------------------------------------
//
// They are written here, together and with their reason, so a company that
// finds them too strict has one place to change and nothing to search for.

// Taking leave in this many of the last six months is a habit, not an
// accident. It is not a problem by itself, it is something to know.
const FREQUENT_MONTHS = 4;
// This many requests inside three months is a lot for one person.
const HIGH_FREQUENCY_REQUESTS = 4;
// This many sick leaves inside three months is worth a conversation.
const SICK_REQUESTS_IN_90_DAYS = 3;
// One leave of this many days or more is a long absence to plan around.
const LONG_LEAVE_DAYS = 5;

// A leave type is "sick leave" when its name says so.
//
// This is a guess, and it is the honest one available: every organization
// invents its own leave types with its own words, and there is no switch on
// the leave type that says "this is the sick one". So we look at the name,
// and when nothing matches, no sick pattern is ever reported. Nothing breaks,
// the screen simply says one thing less.
function isSickLeaveType(name: string) {
  const lower = (name || "").toLowerCase();
  return lower.includes("sick") || lower.includes("medical");
}

// The days of one request that a person really said no to.
//
// A request answered with the day list carries the answer per day. An older
// one that was simply rejected has all of its days refused, and anything else
// has none.
function rejectedDaysOf(request: any) {
  if (request.leaveDays && request.leaveDays.length > 0) {
    return request.leaveDays.filter((day: any) => day.status === "rejected")
      .length;
  }

  if (request.status === "rejected") {
    return request.requestedDays || request.totalDays || 0;
  }

  return 0;
}

function isApprovedStatus(status: string) {
  return status === "approved" || status === "partially_approved";
}

// The days of one request that were really approved.
//
// A request answered by the current flow carries approvedDays. A request
// answered BEFORE that field existed does not, and for those the number lives
// in totalDays: that is exactly what totalDays meant back then, "the days
// this leave costs". Reading approvedDays alone would quietly report zero
// approved days for every older leave, and the whole history would be wrong.
//
// These rows are read with lean(), which hands back what is in the database
// and nothing more, so mongoose never fills the missing field in for us.
function approvedDaysOf(request: any) {
  if (typeof request.approvedDays === "number" && request.approvedDays > 0) {
    return request.approvedDays;
  }

  if (isApprovedStatus(request.status)) {
    return request.totalDays || 0;
  }

  return 0;
}

// The days of one request as it was asked for. Same story: requestedDays is
// the newer field, and on an older row the asked number was totalDays.
function requestedDaysOf(request: any) {
  if (typeof request.requestedDays === "number" && request.requestedDays > 0) {
    return request.requestedDays;
  }

  return request.totalDays || 0;
}

// Everything we count about one pile of requests: this month, this year, or
// all of them. It is one shape and one function, used three times, so the
// three blocks of the screen can never drift apart.
function summarize(requests: any[]) {
  const summary = {
    requests: requests.length,
    approved: 0,
    rejected: 0,
    pending: 0,
    cancelled: 0,
    daysRequested: 0,
    daysApproved: 0,
    daysRejected: 0,
    byLeaveType: [] as {
      name: string;
      requests: number;
      daysApproved: number;
    }[],
  };

  // The leave types used in this pile, counted as we go.
  const types = new Map<string, { name: string; requests: number; daysApproved: number }>();

  for (const request of requests) {
    if (isApprovedStatus(request.status)) {
      summary.approved = summary.approved + 1;
    } else if (request.status === "rejected") {
      summary.rejected = summary.rejected + 1;
    } else if (request.status === "pending") {
      summary.pending = summary.pending + 1;
    } else if (request.status === "cancelled") {
      summary.cancelled = summary.cancelled + 1;
    }

    summary.daysRequested = summary.daysRequested + requestedDaysOf(request);
    summary.daysApproved = summary.daysApproved + approvedDaysOf(request);
    summary.daysRejected = summary.daysRejected + rejectedDaysOf(request);

    const typeName = request.leaveType?.name || "Removed leave type";

    if (!types.has(typeName)) {
      types.set(typeName, { name: typeName, requests: 0, daysApproved: 0 });
    }

    const typeRow = types.get(typeName)!;
    typeRow.requests = typeRow.requests + 1;
    typeRow.daysApproved = typeRow.daysApproved + approvedDaysOf(request);
  }

  // The most used type first: that is the one that says something.
  summary.byLeaveType = [...types.values()].sort(
    (left, right) => right.daysApproved - left.daysApproved || right.requests - left.requests
  );

  return summary;
}

// The short card of one leave, for "the last time this person was away".
function leaveCard(request: any) {
  if (!request) {
    return null;
  }

  return {
    fromDate: toDayText(request.fromDate),
    toDate: toDayText(request.toDate),
    leaveTypeName: request.leaveType?.name || "",
    // An answered leave shows what it really cost, one that is still waiting
    // shows what was asked for.
    days: isApprovedStatus(request.status)
      ? approvedDaysOf(request)
      : requestedDaysOf(request),
    status: request.status,
  };
}

// A percentage, rounded, and never dividing by zero.
function percentOf(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }

  return Math.round((part / whole) * 100);
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function buildLeaveHistory(
  organizationId: string,
  employeeId: string
) {
  // Every request this person ever sent, newest first. One employee never has
  // enough of them for this to be heavy, and having them all in hand means
  // every number below is counted the same way, in one place.
  const allRequests = await LeaveRequest.find({
    organization: organizationId,
    employee: employeeId,
  })
    .populate("leaveType", "name isPaid")
    .sort({ fromDate: -1 })
    .lean();

  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth();

  // -------------------------------------------------------------------
  // The three piles
  // -------------------------------------------------------------------

  // "Submitted this month" really means submitted: it is about how often this
  // person is ASKING right now, so it follows the day they applied.
  const monthRequests = allRequests.filter((request) => {
    const created = new Date(request.createdAt);
    return (
      created.getUTCFullYear() === thisYear && created.getUTCMonth() === thisMonth
    );
  });

  // The year follows the FIRST DAY of the leave instead, because that is the
  // year the leave belongs to and the year its balance is kept in. Without
  // that, a leave asked in December for January would be counted against the
  // wrong year's allowance.
  const yearRequests = allRequests.filter(
    (request) => new Date(request.fromDate).getUTCFullYear() === thisYear
  );

  // -------------------------------------------------------------------
  // Month by month, for the trend
  // -------------------------------------------------------------------

  const monthlyTrend = MONTH_LABELS.map((label, index) => ({
    month: index,
    label: label,
    requests: 0,
    daysApproved: 0,
  }));

  for (const request of yearRequests) {
    const month = new Date(request.fromDate).getUTCMonth();

    monthlyTrend[month].requests = monthlyTrend[month].requests + 1;
    monthlyTrend[month].daysApproved =
      monthlyTrend[month].daysApproved + approvedDaysOf(request);
  }

  // -------------------------------------------------------------------
  // The balance of this year, added up over every leave type
  // -------------------------------------------------------------------

  const balances = await LeaveBalance.find({
    organization: organizationId,
    employee: employeeId,
    year: thisYear,
  }).lean();

  let allocated = 0;
  let used = 0;

  for (const row of balances) {
    allocated = allocated + row.allocated;
    used = used + row.used;
  }

  const balance =
    balances.length === 0
      ? null
      : {
          year: thisYear,
          allocated: allocated,
          used: used,
          remaining: allocated - used,
          utilizationPercent: percentOf(used, allocated),
        };

  // -------------------------------------------------------------------
  // The insights an approver reads in one look
  // -------------------------------------------------------------------

  const overall = summarize(allRequests);

  // A request that was cancelled or is still waiting was never decided, so it
  // says nothing about how often this person is approved.
  const decidedCount = overall.approved + overall.rejected;

  const lastLeave = allRequests[0] || null;
  const lastApproved =
    allRequests.find((request) => isApprovedStatus(request.status)) || null;
  const lastRejected =
    allRequests.find((request) => request.status === "rejected") || null;

  const longestLeaveDays = allRequests.reduce(
    (longest, request) => Math.max(longest, approvedDaysOf(request)),
    0
  );

  const insights = {
    approvalRate: percentOf(overall.approved, decidedCount),
    rejectionRate: percentOf(overall.rejected, decidedCount),
    // One decimal is enough: "2.4 days per request" reads well, 2.4285 does not.
    averageDaysPerRequest:
      overall.requests === 0
        ? 0
        : Math.round((overall.daysRequested / overall.requests) * 10) / 10,
    lastLeave: leaveCard(lastLeave),
    lastApproved: leaveCard(lastApproved),
    lastRejected: leaveCard(lastRejected),
    longestLeaveDays: longestLeaveDays,
  };

  return {
    overall: overall,
    month: {
      label: monthNameOf(thisMonth) + " " + thisYear,
      ...summarize(monthRequests),
    },
    year: {
      label: String(thisYear),
      ...summarize(yearRequests),
      monthlyTrend: monthlyTrend,
    },
    balance: balance,
    insights: insights,
    patterns: buildPatterns(allRequests, now),
  };
}

function monthNameOf(month: number) {
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return names[month] || "";
}

// One habit worth telling the approver about. It is exactly the shape the
// conflict warnings use, so the same React component draws both.
interface LeavePattern {
  key: string;
  level: "danger" | "warning" | "info";
  title: string;
  message: string;
}

// The habits, read out of the requests themselves.
//
// None of these is an accusation and none of them blocks anything. Somebody
// with a long illness SHOULD have a lot of sick leave, and the approver knows
// that and this file does not. All it does is put the fact on the screen so
// the decision is made with it instead of around it.
function buildPatterns(allRequests: any[], now: Date): LeavePattern[] {
  const patterns: LeavePattern[] = [];

  // The moment three months ago, and six months ago.
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setUTCMonth(sixMonthsAgo.getUTCMonth() - 6);

  // 1. Leave taken in many of the last six months.
  const monthsWithLeave = new Set<string>();

  for (const request of allRequests) {
    if (!isApprovedStatus(request.status)) {
      continue;
    }

    const from = new Date(request.fromDate);

    if (from.getTime() >= sixMonthsAgo.getTime() && from.getTime() <= now.getTime()) {
      monthsWithLeave.add(from.getUTCFullYear() + "-" + from.getUTCMonth());
    }
  }

  if (monthsWithLeave.size >= FREQUENT_MONTHS) {
    patterns.push({
      key: "frequent_leave",
      level: "info",
      title: "Frequent leave pattern",
      message:
        "This employee took leave in " +
        monthsWithLeave.size +
        " of the last 6 months.",
    });
  }

  // 2. A lot of requests in a short time.
  const recentRequests = allRequests.filter(
    (request) =>
      new Date(request.createdAt).getTime() >= ninetyDaysAgo.getTime() &&
      request.status !== "cancelled"
  );

  if (recentRequests.length >= HIGH_FREQUENCY_REQUESTS) {
    patterns.push({
      key: "high_leave_frequency",
      level: "warning",
      title: "High leave frequency",
      message:
        recentRequests.length +
        " leave requests in the last 3 months, which is more than usual.",
    });
  }

  // 3. Sick leave again and again.
  const recentSickRequests = recentRequests.filter((request) =>
    isSickLeaveType(request.leaveType?.name || "")
  );

  if (recentSickRequests.length >= SICK_REQUESTS_IN_90_DAYS) {
    patterns.push({
      key: "sick_leave_pattern",
      level: "warning",
      title: "Repeated sick leave",
      message:
        recentSickRequests.length +
        " sick leave requests in the last 3 months. This is a fact, not a judgement: a long illness looks exactly like this.",
    });
  }

  // 4. One long absence in the past. It says how much planning this person's
  //    leave has needed before.
  const longestApproved = allRequests
    .filter((request) => isApprovedStatus(request.status))
    .reduce(
      (longest, request) =>
        approvedDaysOf(request) > approvedDaysOf(longest || {})
          ? request
          : longest,
      null as any
    );

  if (longestApproved && approvedDaysOf(longestApproved) >= LONG_LEAVE_DAYS) {
    patterns.push({
      key: "long_consecutive_leave",
      level: "info",
      title: "Long consecutive leave history",
      message:
        "The longest leave approved for this employee was " +
        approvedDaysOf(longestApproved) +
        " days, from " +
        toDayText(longestApproved.fromDate) +
        ".",
    });
  }

  return patterns;
}
