// Everything the meeting dashboard counts.
//
// The dashboard has no endpoint of its own: the meeting list is already in
// the browser (the "meetings" query), so every chart on the page is worked
// out here, from that one list. One list in, many small answers out — which
// is also why every function below takes the meetings as a plain argument
// and returns a plain object. Nothing here talks to the server or to React.

import type {
  Meeting,
  MeetingStatus,
  MeetingType,
  AttendeeResponse,
} from "@/types/meeting.types";
import { isOpenMeeting } from "@/types/meeting.types";

// ---------------------------------------------------------------------------
// The colours of the charts
// ---------------------------------------------------------------------------

// The four statuses of a meeting, in the order of the workflow, each with the
// word the charts show and its own colour.
//
// The list lives here and not inside one chart because three charts of this
// page draw the same four statuses. One status therefore keeps one colour
// everywhere, and changing a colour is one edit and not three.
//
// The hexes are the ones already used by the task charts of the main
// dashboard, which were run through a colour blindness check against the
// white card AND against the dark one — which is why a single list is enough
// for both themes. The colour is never the only clue anyway: every chart here
// writes the name and the number next to its colour.
export const MEETING_STATUS_COLORS: {
  status: MeetingStatus;
  label: string;
  color: string;
}[] = [
  { status: "scheduled", label: "Scheduled", color: "#d97706" },
  { status: "in_progress", label: "In progress", color: "#7c3aed" },
  { status: "completed", label: "Done", color: "#059669" },
  { status: "cancelled", label: "Cancelled", color: "#dc2626" },
];

// The four answers an invitation can be sitting in. "No answer yet" is grey
// on purpose: it is not a decision, it is the absence of one.
export const MEETING_RESPONSE_COLORS: {
  response: AttendeeResponse;
  label: string;
  color: string;
}[] = [
  { response: "accepted", label: "Accepted", color: "#0284c7" },
  { response: "attended", label: "Attended", color: "#059669" },
  { response: "declined", label: "Declined", color: "#dc2626" },
  { response: "invited", label: "No answer yet", color: "#94a3b8" },
];

// The two kinds of meeting.
export const MEETING_TYPE_COLORS: {
  type: MeetingType;
  label: string;
  color: string;
}[] = [
  { type: "in_person", label: "In person", color: "#6366f1" },
  { type: "online", label: "Online", color: "#0d9488" },
];

// The look of a recharts tooltip. We read the theme colours, so the little
// box is white in the light theme and dark in the dark one without us writing
// the same colours twice.
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  color: "var(--foreground)",
  fontSize: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
};

// ---------------------------------------------------------------------------
// Small helpers the tiles share
// ---------------------------------------------------------------------------

// 45 -> "45m", 90 -> "1.5h", 600 -> "10h". Minutes stay minutes under an
// hour, because "0.8h" is not how anybody says three quarters of an hour.
export function formatHours(minutes: number) {
  if (minutes < 60) {
    return Math.round(minutes) + "m";
  }

  // One decimal at most, and no ".0" tail on a whole number of hours.
  const hours = Math.round((minutes / 60) * 10) / 10;
  return hours + "h";
}

// part of whole as a whole percent. A whole of zero gives 0 instead of a
// division by zero.
export function percentOf(part: number, whole: number) {
  if (whole <= 0) {
    return 0;
  }
  return Math.round((part / whole) * 100);
}

// A meeting that was called off never really happened, so most of the charts
// leave it out: it took no time, nobody sat in it, and counting it would make
// the workspace look busier than it was. The status ring is the one place
// that does count it, because showing how many meetings get cancelled is the
// whole point of that ring.
export function isRealMeeting(meeting: Meeting) {
  return meeting.status !== "cancelled";
}

// ---------------------------------------------------------------------------
// The status ring
// ---------------------------------------------------------------------------

export interface StatusSlice {
  status: MeetingStatus;
  name: string;
  value: number;
  color: string;
}

// How many meetings sit in each of the four statuses, in workflow order.
export function buildStatusSlices(meetings: Meeting[]): StatusSlice[] {
  return MEETING_STATUS_COLORS.map((row) => {
    const found = meetings.filter((meeting) => meeting.status === row.status);

    return {
      status: row.status,
      name: row.label,
      value: found.length,
      color: row.color,
    };
  });
}

// How many times a meeting was moved to another time.
//
// The server writes one history line every time something happens to a
// meeting, and a reschedule keeps the status it already had. So a line whose
// status is the same as the line before it is a reschedule, and nothing else
// in the module writes such a line. The very first line is the birth of the
// meeting, so we start counting from the second one.
export function countReschedules(meeting: Meeting) {
  let count = 0;

  meeting.statusHistory.forEach((entry, index) => {
    if (index === 0) {
      return;
    }

    const previous = meeting.statusHistory[index - 1];
    if (entry.status === previous.status) {
      count += 1;
    }
  });

  return count;
}

// The meetings that were moved at least once, and how many moves that was in
// total. A meeting that keeps sliding is the thing worth seeing here.
export function buildRescheduleStats(meetings: Meeting[]) {
  let movedMeetings = 0;
  let totalMoves = 0;

  meetings.forEach((meeting) => {
    const moves = countReschedules(meeting);

    if (moves > 0) {
      movedMeetings += 1;
      totalMoves += moves;
    }
  });

  return { movedMeetings: movedMeetings, totalMoves: totalMoves };
}

// ---------------------------------------------------------------------------
// The invitations ring
// ---------------------------------------------------------------------------

export interface ResponseSlice {
  response: AttendeeResponse;
  name: string;
  value: number;
  color: string;
}

export interface ResponseTotals {
  slices: ResponseSlice[];
  // Every invitation that was ever sent for a meeting still standing.
  total: number;
  // The invitations somebody actually answered.
  answered: number;
  // The invitations that said yes ("accepted" now, or "attended" afterwards).
  positive: number;
  // Those two as whole percents of every invitation sent.
  replyRate: number;
  acceptRate: number;
}

// Every invitation of every meeting that was not called off, cut by the
// answer it is sitting in.
//
// The invitations of a cancelled meeting are left out on purpose: nobody was
// ever going to sit in that meeting, so their "yes" and their silence say
// nothing about how the team answers invitations.
export function buildResponseTotals(meetings: Meeting[]): ResponseTotals {
  // Start every answer at zero, so an answer nobody gave still gets its line
  // in the legend instead of disappearing.
  const counts: Record<AttendeeResponse, number> = {
    accepted: 0,
    attended: 0,
    declined: 0,
    invited: 0,
  };

  meetings.filter(isRealMeeting).forEach((meeting) => {
    meeting.attendees.forEach((attendee) => {
      counts[attendee.response] += 1;
    });
  });

  const slices = MEETING_RESPONSE_COLORS.map((row) => ({
    response: row.response,
    name: row.label,
    value: counts[row.response],
    color: row.color,
  }));

  const total =
    counts.accepted + counts.attended + counts.declined + counts.invited;
  const answered = total - counts.invited;
  const positive = counts.accepted + counts.attended;

  return {
    slices: slices,
    total: total,
    answered: answered,
    positive: positive,
    replyRate: percentOf(answered, total),
    acceptRate: percentOf(positive, total),
  };
}

// ---------------------------------------------------------------------------
// The headline figures of the banner
// ---------------------------------------------------------------------------

export interface MeetingHeadline {
  // The next meeting that has not started yet, or null when the diary ahead
  // is empty.
  next: Meeting | null;
  // How many minutes from now until that meeting starts.
  minutesToNext: number;
  // Meetings still standing whose start time falls on today's date.
  todayCount: number;
  // The hours those meetings take, all together.
  todayMinutes: number;
  // The same two numbers for the seven days that start today.
  weekCount: number;
  weekMinutes: number;
  // Hours × people, over the whole list: the time the workspace as a whole
  // spends sitting in meetings.
  personMinutes: number;
  // People per meeting, on average, over the meetings still standing.
  averageAttendees: number;
}

export function buildHeadline(meetings: Meeting[]): MeetingHeadline {
  const now = Date.now();

  // The start of today and the start of the day after the next seven days,
  // so "today" and "this week" are whole days and not "the next 24 hours".
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const weekEnd = new Date(dayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let todayCount = 0;
  let todayMinutes = 0;
  let weekCount = 0;
  let weekMinutes = 0;
  let personMinutes = 0;
  let attendeeTotal = 0;
  let realMeetings = 0;

  meetings.forEach((meeting) => {
    if (!isRealMeeting(meeting)) {
      return;
    }

    const startAt = new Date(meeting.startAt).getTime();

    realMeetings += 1;
    attendeeTotal += meeting.attendees.length;

    // Whoever did not say no is expected in the room, and the organizer is
    // in there too — which is the one extra head in the "+ 1".
    const heads = meeting.attendees.filter(
      (attendee) => attendee.response !== "declined"
    ).length;
    personMinutes += meeting.durationMinutes * (heads + 1);

    if (startAt >= dayStart.getTime() && startAt < tomorrowStart.getTime()) {
      todayCount += 1;
      todayMinutes += meeting.durationMinutes;
    }

    if (startAt >= dayStart.getTime() && startAt < weekEnd.getTime()) {
      weekCount += 1;
      weekMinutes += meeting.durationMinutes;
    }
  });

  // The soonest meeting that is still open and has not started yet: put the
  // ones still ahead in order of their start time and take the first.
  const ahead = meetings
    .filter(
      (meeting) =>
        isOpenMeeting(meeting) && new Date(meeting.startAt).getTime() >= now
    )
    .sort(
      (left, right) =>
        new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
    );

  const nextMeeting = ahead.length > 0 ? ahead[0] : null;

  const minutesToNext = nextMeeting
    ? Math.round((new Date(nextMeeting.startAt).getTime() - now) / 60000)
    : 0;

  return {
    next: nextMeeting,
    minutesToNext: minutesToNext,
    todayCount: todayCount,
    todayMinutes: todayMinutes,
    weekCount: weekCount,
    weekMinutes: weekMinutes,
    personMinutes: personMinutes,
    averageAttendees:
      realMeetings > 0 ? Math.round((attendeeTotal / realMeetings) * 10) / 10 : 0,
  };
}

// "in 2h 15m", "in 3 days", "starting now". Used for the countdown of the
// banner, where a bare number of minutes would be hard to read.
export function formatCountdown(minutes: number) {
  if (minutes <= 0) {
    return "starting now";
  }
  if (minutes < 60) {
    return "in " + minutes + "m";
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    const rest = minutes % 60;
    return rest === 0 ? "in " + hours + "h" : "in " + hours + "h " + rest + "m";
  }

  const days = Math.round(hours / 24);
  return days === 1 ? "in 1 day" : "in " + days + " days";
}

// ---------------------------------------------------------------------------
// The load over time
// ---------------------------------------------------------------------------

export type LoadMode = "week" | "month";

// One bar of the load chart: a stretch of time, and the meetings that start
// inside it cut by status.
export interface LoadBucket {
  key: string;
  // What is written under the bar.
  label: string;
  // The longer version, for the tooltip.
  rangeLabel: string;
  scheduled: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
  // The hours those meetings take, the cancelled ones left out.
  minutes: number;
}

// The Monday of the week a date falls in, at midnight. Monday is the first
// day of the week here, so a week on the chart is a working week.
function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);

  // getDay() gives 0 for Sunday, so Sunday has to walk six days back and
  // every other day walks back its own number minus one.
  const weekday = copy.getDay();
  const stepsBack = weekday === 0 ? 6 : weekday - 1;

  copy.setDate(copy.getDate() - stepsBack);
  return copy;
}

// "5 Aug"
function shortDay(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// The last eight weeks, or the last six months, with this one at the right
// end. Every meeting lands in the bucket its start time falls into, so a bar
// says "this much was put in the diary for that stretch of time".
export function buildLoadBuckets(
  meetings: Meeting[],
  mode: LoadMode
): LoadBucket[] {
  const buckets: LoadBucket[] = [];
  // The first day of each bucket, kept beside the buckets so we can find the
  // right one for a meeting without parsing the labels back.
  const starts: number[] = [];
  const ends: number[] = [];

  if (mode === "week") {
    const thisWeek = startOfWeek(new Date());

    // Seven weeks back, then this one.
    for (let back = 7; back >= 0; back--) {
      const start = new Date(thisWeek);
      start.setDate(start.getDate() - back * 7);

      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      // The last day of the week, for the "5 – 11 Aug" label.
      const lastDay = new Date(end);
      lastDay.setDate(lastDay.getDate() - 1);

      buckets.push(emptyBucket(
        start.toISOString(),
        shortDay(start),
        shortDay(start) + " – " + shortDay(lastDay)
      ));
      starts.push(start.getTime());
      ends.push(end.getTime());
    }
  } else {
    const today = new Date();

    // Five months back, then this one.
    for (let back = 5; back >= 0; back--) {
      const start = new Date(today.getFullYear(), today.getMonth() - back, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

      buckets.push(emptyBucket(
        start.toISOString(),
        start.toLocaleDateString("en-GB", { month: "short" }),
        start.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
      ));
      starts.push(start.getTime());
      ends.push(end.getTime());
    }
  }

  meetings.forEach((meeting) => {
    const startAt = new Date(meeting.startAt).getTime();

    // Which bar does this meeting belong to? A meeting older than the first
    // bar, or further ahead than the last one, belongs to none and is simply
    // not drawn.
    for (let index = 0; index < buckets.length; index++) {
      if (startAt >= starts[index] && startAt < ends[index]) {
        const bucket = buckets[index];

        bucket[meeting.status] += 1;
        bucket.total += 1;

        if (isRealMeeting(meeting)) {
          bucket.minutes += meeting.durationMinutes;
        }
        break;
      }
    }
  });

  return buckets;
}

function emptyBucket(key: string, label: string, rangeLabel: string): LoadBucket {
  return {
    key: key,
    label: label,
    rangeLabel: rangeLabel,
    scheduled: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    total: 0,
    minutes: 0,
  };
}

// ---------------------------------------------------------------------------
// When in the week meetings happen
// ---------------------------------------------------------------------------

// The days down the side of the heat map, Monday first.
export const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// The columns: the whole day cut into twelve blocks of two hours. Twelve
// blocks cover every hour there is, so no meeting ever falls outside the map.
export const HEATMAP_BLOCKS = 12;

// "08" for the block that holds 08:00 and 09:00.
export function heatmapBlockLabel(block: number) {
  return String(block * 2).padStart(2, "0");
}

// "08:00 – 10:00", for the tooltip.
export function heatmapBlockRange(block: number) {
  const from = String(block * 2).padStart(2, "0");
  const to = String(block * 2 + 2).padStart(2, "0");
  return from + ":00 – " + to + ":00";
}

export interface HeatmapCell {
  day: number;
  block: number;
  count: number;
}

export interface HeatmapRow {
  day: number;
  label: string;
  cells: HeatmapCell[];
  total: number;
}

export interface Heatmap {
  rows: HeatmapRow[];
  // The fullest cell on the map, which is what every other cell is shaded
  // against.
  max: number;
  total: number;
  // The one sentence the reader takes away, or null on an empty map.
  busiest: { day: string; range: string; count: number } | null;
}

// Which day of the week and which time of day the workspace really meets in.
//
// The cancelled meetings are left out: a meeting that was called off never
// took that slot in anybody's day.
export function buildHeatmap(meetings: Meeting[]): Heatmap {
  const rows: HeatmapRow[] = HEATMAP_DAYS.map((label, day) => {
    const cells: HeatmapCell[] = [];

    for (let block = 0; block < HEATMAP_BLOCKS; block++) {
      cells.push({ day: day, block: block, count: 0 });
    }

    return { day: day, label: label, cells: cells, total: 0 };
  });

  let total = 0;

  meetings.filter(isRealMeeting).forEach((meeting) => {
    const startAt = new Date(meeting.startAt);

    // getDay() gives 0 for Sunday and our rows start on Monday, so the day
    // is shifted round by six before the remainder is taken.
    const day = (startAt.getDay() + 6) % 7;
    const block = Math.floor(startAt.getHours() / 2);

    rows[day].cells[block].count += 1;
    rows[day].total += 1;
    total += 1;
  });

  // The fullest cell, and where it is.
  let max = 0;
  let busiest: Heatmap["busiest"] = null;

  rows.forEach((row) => {
    row.cells.forEach((cell) => {
      if (cell.count > max) {
        max = cell.count;
        busiest = {
          day: HEATMAP_DAYS[cell.day],
          range: heatmapBlockRange(cell.block),
          count: cell.count,
        };
      }
    });
  });

  return { rows: rows, max: max, total: total, busiest: busiest };
}

// ---------------------------------------------------------------------------
// How long meetings run, and where they are held
// ---------------------------------------------------------------------------

// The four lengths a meeting falls into. The edges are the ones the form
// itself offers, so a bar always holds meetings somebody really scheduled.
export const DURATION_BANDS: { label: string; from: number; to: number }[] = [
  { label: "Up to 30m", from: 0, to: 30 },
  { label: "31m – 1h", from: 31, to: 60 },
  { label: "1h – 2h", from: 61, to: 120 },
  { label: "Over 2h", from: 121, to: 100000 },
];

export interface DurationBar {
  label: string;
  in_person: number;
  online: number;
  total: number;
}

export interface TypeTotals {
  type: MeetingType;
  label: string;
  color: string;
  count: number;
  minutes: number;
  averageMinutes: number;
}

export interface DurationAnalysis {
  bars: DurationBar[];
  types: TypeTotals[];
  total: number;
  totalMinutes: number;
  averageMinutes: number;
  longest: Meeting | null;
}

// How long the meetings of the workspace run, and how that splits between the
// room and the screen. The cancelled ones are left out, as everywhere else.
export function buildDurationAnalysis(meetings: Meeting[]): DurationAnalysis {
  const real = meetings.filter(isRealMeeting);

  const bars: DurationBar[] = DURATION_BANDS.map((band) => ({
    label: band.label,
    in_person: 0,
    online: 0,
    total: 0,
  }));

  // One counter per kind, so the two rows under the chart can be filled in
  // the same single pass.
  const typeCount: Record<MeetingType, number> = { in_person: 0, online: 0 };
  const typeMinutes: Record<MeetingType, number> = { in_person: 0, online: 0 };

  let totalMinutes = 0;
  let longest: Meeting | null = null;

  real.forEach((meeting) => {
    const minutes = meeting.durationMinutes;

    totalMinutes += minutes;
    typeCount[meeting.meetingType] += 1;
    typeMinutes[meeting.meetingType] += minutes;

    if (longest === null || minutes > longest.durationMinutes) {
      longest = meeting;
    }

    // Which band is this length in?
    for (let index = 0; index < DURATION_BANDS.length; index++) {
      const band = DURATION_BANDS[index];

      if (minutes >= band.from && minutes <= band.to) {
        bars[index][meeting.meetingType] += 1;
        bars[index].total += 1;
        break;
      }
    }
  });

  const types: TypeTotals[] = MEETING_TYPE_COLORS.map((row) => ({
    type: row.type,
    label: row.label,
    color: row.color,
    count: typeCount[row.type],
    minutes: typeMinutes[row.type],
    averageMinutes:
      typeCount[row.type] > 0
        ? Math.round(typeMinutes[row.type] / typeCount[row.type])
        : 0,
  }));

  return {
    bars: bars,
    types: types,
    total: real.length,
    totalMinutes: totalMinutes,
    averageMinutes: real.length > 0 ? Math.round(totalMinutes / real.length) : 0,
    longest: longest,
  };
}

// ---------------------------------------------------------------------------
// Who sits in the meetings, and who calls them
// ---------------------------------------------------------------------------

export interface PersonLoad {
  id: string;
  name: string;
  // The short name the chart writes in front of the bar, so a long name does
  // not eat half the tile.
  shortName: string;
  meetings: number;
  minutes: number;
  // How many of those invitations the person has not answered yet.
  waiting: number;
}

// Only a handful of bars fit in a tile and stay readable.
const TOP_PEOPLE = 8;

// The people who spend the most time in meetings.
//
// Somebody who said no is not counted: they told the organizer they will not
// be there, so that meeting takes none of their day. Everybody else is
// counted with the full length of the meeting, because you cannot sit in half
// a meeting.
export function buildPeopleLoad(meetings: Meeting[]) {
  const people: PersonLoad[] = [];

  meetings.filter(isRealMeeting).forEach((meeting) => {
    meeting.attendees.forEach((attendee) => {
      const employee = attendee.employee;

      // Somebody whose account was deleted has no name to put on a bar.
      if (!employee) {
        return;
      }
      if (attendee.response === "declined") {
        return;
      }

      let row = people.find((person) => person.id === employee._id);

      if (!row) {
        row = {
          id: employee._id,
          name: employee.name,
          shortName: shortenName(employee.name),
          meetings: 0,
          minutes: 0,
          waiting: 0,
        };
        people.push(row);
      }

      row.meetings += 1;
      row.minutes += meeting.durationMinutes;

      if (attendee.response === "invited") {
        row.waiting += 1;
      }
    });
  });

  people.sort((left, right) => right.minutes - left.minutes);

  return {
    // The busiest few, and the chart draws the busiest at the top.
    top: people.slice(0, TOP_PEOPLE),
    // How many people sat in a meeting at all, so the tile can say "8 of 34".
    peopleCount: people.length,
  };
}

export interface OrganizerLoad {
  id: string;
  name: string;
  shortName: string;
  meetings: number;
  minutes: number;
  // How many of the meetings this person called were called off again.
  cancelled: number;
}

// Who puts the meetings in the diary. The organization account is one line of
// its own, because it is not an employee but it does schedule meetings.
export function buildOrganizerLoad(meetings: Meeting[]) {
  const organizers: OrganizerLoad[] = [];

  meetings.forEach((meeting) => {
    const employee = meeting.organizedByEmployee;

    const id = employee ? employee._id : "organization";
    const name = employee ? employee.name : "Organization account";

    let row = organizers.find((person) => person.id === id);

    if (!row) {
      row = {
        id: id,
        name: name,
        shortName: shortenName(name),
        meetings: 0,
        minutes: 0,
        cancelled: 0,
      };
      organizers.push(row);
    }

    row.meetings += 1;

    if (meeting.status === "cancelled") {
      row.cancelled += 1;
    } else {
      row.minutes += meeting.durationMinutes;
    }
  });

  organizers.sort((left, right) => right.meetings - left.meetings);

  return organizers.slice(0, TOP_PEOPLE);
}

// "Muhammad Zubair Ahmed" -> "Muhammad Z." — a first name and an initial is
// enough to tell two people apart in front of a bar.
function shortenName(name: string) {
  const parts = name.trim().split(" ");

  if (parts.length <= 1) {
    return name;
  }
  return parts[0] + " " + parts[1].charAt(0).toUpperCase() + ".";
}

// ---------------------------------------------------------------------------
// How well the meetings are run
// ---------------------------------------------------------------------------

export interface FollowUpStats {
  // Meetings that were finished.
  completed: number;
  // Of those, the ones somebody wrote minutes for.
  withNotes: number;
  // Every meeting still standing, and the ones that were given an agenda
  // before they happened.
  total: number;
  withAgenda: number;
  // The things to do that came out of the meetings.
  actionItems: number;
  doneItems: number;
  // Meetings that left at least one thing to do behind.
  meetingsWithItems: number;
  // Things to do that are still open on a meeting that already finished.
  overdueItems: number;
}

// Whether the meetings of the workspace are actually run properly: were they
// given an agenda, were minutes written afterwards, and did the things to do
// that came out of them get done.
export function buildFollowUpStats(meetings: Meeting[]): FollowUpStats {
  const stats: FollowUpStats = {
    completed: 0,
    withNotes: 0,
    total: 0,
    withAgenda: 0,
    actionItems: 0,
    doneItems: 0,
    meetingsWithItems: 0,
    overdueItems: 0,
  };

  meetings.filter(isRealMeeting).forEach((meeting) => {
    stats.total += 1;

    if (meeting.agenda.trim() !== "") {
      stats.withAgenda += 1;
    }

    if (meeting.status === "completed") {
      stats.completed += 1;

      if (meeting.notes.trim() !== "") {
        stats.withNotes += 1;
      }
    }

    if (meeting.actionItems.length > 0) {
      stats.meetingsWithItems += 1;
    }

    meeting.actionItems.forEach((item) => {
      stats.actionItems += 1;

      if (item.done) {
        stats.doneItems += 1;
      } else if (meeting.status === "completed") {
        // The meeting is over and this was never ticked off.
        stats.overdueItems += 1;
      }
    });
  });

  return stats;
}

// ---------------------------------------------------------------------------
// What needs somebody to do something
// ---------------------------------------------------------------------------

export type AttentionKey =
  | "starting_soon"
  | "waiting_reply"
  | "past_open"
  | "open_items"
  | "no_notes"
  | "no_agenda";

export interface AttentionGroup {
  key: AttentionKey;
  label: string;
  hint: string;
  count: number;
  // The first few meetings of the group, to name them instead of only
  // counting them.
  meetings: Meeting[];
}

// Only a few titles fit under a group before the panel gets too tall.
const ATTENTION_PREVIEW = 3;

// The six things that ask for somebody's attention, each with the meetings
// behind it. A group with nothing in it is dropped by the panel, so a tidy
// workspace shows a short list and not six empty rows.
export function buildAttentionGroups(meetings: Meeting[]): AttentionGroup[] {
  const now = Date.now();
  const inOneDay = now + 24 * 60 * 60 * 1000;

  const startingSoon: Meeting[] = [];
  const waitingReply: Meeting[] = [];
  const pastOpen: Meeting[] = [];
  const openItems: Meeting[] = [];
  const noNotes: Meeting[] = [];
  const noAgenda: Meeting[] = [];

  meetings.forEach((meeting) => {
    const startAt = new Date(meeting.startAt).getTime();
    const endAt = new Date(meeting.endAt).getTime();
    const open = isOpenMeeting(meeting);

    if (open && startAt >= now && startAt <= inOneDay) {
      startingSoon.push(meeting);
    }

    // Somebody who has not answered yet, on a meeting that is still ahead.
    if (open && startAt >= now) {
      const silent = meeting.attendees.filter(
        (attendee) => attendee.response === "invited"
      );

      if (silent.length > 0) {
        waitingReply.push(meeting);
      }

      if (meeting.agenda.trim() === "") {
        noAgenda.push(meeting);
      }
    }

    // The meeting's own end time has gone by and nobody ever closed it, so
    // the board still says "scheduled" for something that is over.
    if (open && endAt < now) {
      pastOpen.push(meeting);
    }

    if (isRealMeeting(meeting)) {
      const undone = meeting.actionItems.filter((item) => !item.done);

      if (undone.length > 0) {
        openItems.push(meeting);
      }
    }

    if (meeting.status === "completed" && meeting.notes.trim() === "") {
      noNotes.push(meeting);
    }
  });

  // The soonest first inside every group, so the top of a list is always the
  // most pressing thing in it.
  function bySoonest(list: Meeting[]) {
    return [...list].sort(
      (left, right) =>
        new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
    );
  }

  function group(
    key: AttentionKey,
    label: string,
    hint: string,
    list: Meeting[]
  ): AttentionGroup {
    const sorted = bySoonest(list);

    return {
      key: key,
      label: label,
      hint: hint,
      count: sorted.length,
      meetings: sorted.slice(0, ATTENTION_PREVIEW),
    };
  }

  return [
    group(
      "starting_soon",
      "Starting within a day",
      "Make sure the room and the people are ready.",
      startingSoon
    ),
    group(
      "past_open",
      "Over but never closed",
      "The time has passed and the status still says it is open.",
      pastOpen
    ),
    group(
      "waiting_reply",
      "Still waiting for a reply",
      "Somebody invited has not answered yet.",
      waitingReply
    ),
    group(
      "open_items",
      "Open action items",
      "Things the meeting left behind that nobody ticked off.",
      openItems
    ),
    group(
      "no_notes",
      "Finished with no minutes",
      "Nothing was written down after the meeting.",
      noNotes
    ),
    group(
      "no_agenda",
      "Ahead with no agenda",
      "People are invited but nobody said what it is about.",
      noAgenda
    ),
  ];
}
