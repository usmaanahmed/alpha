// Everything the meeting screens need: the shapes the server sends, the
// friendly labels for the dropdowns and the badges, and the small functions
// that turn a list of meetings into the dashboard numbers and the "upcoming"
// panel.

export type MeetingStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type MeetingType = "in_person" | "online";

export type AttendeeResponse = "invited" | "accepted" | "declined" | "attended";

// The answers an invited employee can actually send. "invited" is missing on
// purpose: it is the state everybody starts in, not something you can choose,
// and the server refuses it.
export type AttendeeAnswer = "accepted" | "declined" | "attended";

export type MeetingActorType = "organization" | "manager";

// A person, as the server sends them inside a meeting (the organizer, an
// attendee, or the author of a history line).
export interface MeetingPerson {
  _id: string;
  name: string;
  email: string;
  photo: string;
}

// One invited person and their answer.
export interface MeetingAttendee {
  _id: string;
  employee: MeetingPerson | null;
  response: AttendeeResponse;
  note: string;
  respondedAt: string | null;
}

// One thing to do that came out of the meeting.
export interface MeetingActionItem {
  _id: string;
  text: string;
  done: boolean;
}

// One line of the status history.
export interface MeetingStatusEntry {
  _id: string;
  status: MeetingStatus;
  note: string;
  byType: MeetingActorType;
  byEmployee: MeetingPerson | null;
  at: string;
}

// One meeting, exactly as the server sends it. The last two fields are added
// by the server for the logged in user: whether they may manage it, and what
// they answered to the invitation (null when they are not invited).
export interface Meeting {
  _id: string;
  title: string;
  agenda: string;
  startAt: string;
  durationMinutes: number;
  endAt: string;
  location: string;
  meetingType: MeetingType;
  status: MeetingStatus;
  organizedByType: MeetingActorType;
  organizedByEmployee: MeetingPerson | null;
  attendees: MeetingAttendee[];
  notes: string;
  actionItems: MeetingActionItem[];
  statusHistory: MeetingStatusEntry[];
  createdAt: string;
  updatedAt: string;
  canManage: boolean;
  myResponse: AttendeeResponse | null;
}

// One active employee the organizer can invite. This is the same shape the
// task module uses for its "assign to" list.
export interface AssignableEmployee {
  _id: string;
  name: string;
  email: string;
  photo: string;
  designation: string;
  department: { _id: string; name: string } | null;
  role: { _id: string; name: string } | null;
}

// One clashing meeting the server sends back when the chosen time is not
// free for everybody.
export interface MeetingConflict {
  meetingId: string;
  title: string;
  startAt: string;
  endAt: string;
  employees: { _id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// The friendly words for the dropdowns and the badges
// ---------------------------------------------------------------------------

export const MEETING_TYPE_OPTIONS: { value: MeetingType; label: string }[] = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
];

export const MEETING_STATUS_OPTIONS: {
  value: MeetingStatus;
  label: string;
}[] = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const ATTENDEE_RESPONSE_OPTIONS: {
  value: AttendeeResponse;
  label: string;
}[] = [
  { value: "invited", label: "Invited" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "attended", label: "Attended" },
];

export function getMeetingStatusLabel(status: MeetingStatus) {
  const option = MEETING_STATUS_OPTIONS.find((item) => item.value === status);
  return option ? option.label : status;
}

export function getMeetingTypeLabel(type: MeetingType) {
  return type === "online" ? "Online" : "In person";
}

export function getResponseLabel(response: AttendeeResponse) {
  const option = ATTENDEE_RESPONSE_OPTIONS.find(
    (item) => item.value === response
  );
  return option ? option.label : response;
}

// The colour of the status badge, mapped to one of the badge variants
// (defined in components/ui/badge.tsx) so the same status always looks the
// same everywhere.
export function getMeetingStatusVariant(status: MeetingStatus) {
  if (status === "completed") {
    return "default" as const; // the main colour, the happy end
  }
  if (status === "cancelled") {
    return "destructive" as const;
  }
  if (status === "in_progress") {
    return "reassigned" as const; // the violet one, "happening now"
  }
  // scheduled
  return "secondary" as const;
}

// The colour of an attendee's answer badge.
export function getResponseVariant(response: AttendeeResponse) {
  if (response === "accepted" || response === "attended") {
    return "default" as const;
  }
  if (response === "declined") {
    return "destructive" as const;
  }
  // invited (not answered yet)
  return "secondary" as const;
}

// ---------------------------------------------------------------------------
// Dates and times
// ---------------------------------------------------------------------------

// "2026-07-30T14:30:00.000Z" -> "30 Jul 2026, 14:30". "-" when there is no
// date. We show the meeting in the reader's own local time.
export function formatMeetingDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Only the day part, for the calendar-like day headings.
export function formatMeetingDay(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Only the time part, for a row that already shows the day.
export function formatMeetingTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// A server date -> the "2026-07-30T14:30" text a datetime-local input wants,
// in the reader's own local time. Empty when there is no date.
export function toDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  // We build the text by hand so the value stays in local time. Using
  // toISOString() here would shift it to UTC and show the wrong hour.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return year + "-" + month + "-" + day + "T" + hours + ":" + minutes;
}

// 90 -> "1h 30m", 60 -> "1h", 45 -> "45m".
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return rest + "m";
  }
  if (rest === 0) {
    return hours + "h";
  }
  return hours + "h " + rest + "m";
}

// ---------------------------------------------------------------------------
// Which meetings are "still open"
// ---------------------------------------------------------------------------

// A meeting is "open" while it has not finished and was not called off.
export function isOpenMeeting(meeting: Meeting) {
  return meeting.status === "scheduled" || meeting.status === "in_progress";
}

// Is the meeting's start time still in the future?
export function isUpcoming(meeting: Meeting) {
  return isOpenMeeting(meeting) && new Date(meeting.startAt).getTime() >= Date.now();
}

// The number of whole days from today until the meeting day.
// 0 means today, 1 means tomorrow, a negative number means it is past.
export function daysUntil(meeting: Meeting) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(meeting.startAt);
  start.setHours(0, 0, 0, 0);

  const oneDay = 1000 * 60 * 60 * 24;
  return Math.round((start.getTime() - today.getTime()) / oneDay);
}

// ---------------------------------------------------------------------------
// The dashboard numbers
// ---------------------------------------------------------------------------

export interface MeetingSummary {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  today: number;
  thisWeek: number;
  awaitingResponse: number;
}

export function buildMeetingSummary(meetings: Meeting[]): MeetingSummary {
  const summary: MeetingSummary = {
    total: meetings.length,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    today: 0,
    thisWeek: 0,
    awaitingResponse: 0,
  };

  meetings.forEach((meeting) => {
    if (meeting.status === "scheduled") {
      summary.scheduled += 1;
    }
    if (meeting.status === "in_progress") {
      summary.inProgress += 1;
    }
    if (meeting.status === "completed") {
      summary.completed += 1;
    }
    if (meeting.status === "cancelled") {
      summary.cancelled += 1;
    }

    if (isOpenMeeting(meeting)) {
      const days = daysUntil(meeting);
      if (days === 0) {
        summary.today += 1;
      }
      if (days >= 0 && days <= 7) {
        summary.thisWeek += 1;
      }

      // How many people still have not answered my invitations.
      meeting.attendees.forEach((attendee) => {
        if (attendee.response === "invited") {
          summary.awaitingResponse += 1;
        }
      });
    }
  });

  return summary;
}

// ---------------------------------------------------------------------------
// The "upcoming" panel
// ---------------------------------------------------------------------------

// The next open meetings, soonest first. The dashboard shows the first few.
export function buildUpcomingMeetings(meetings: Meeting[]) {
  return meetings
    .filter((meeting) => isUpcoming(meeting))
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
}

// The open meetings whose start time is today.
export function meetingsToday(meetings: Meeting[]) {
  return meetings.filter(
    (meeting) => isOpenMeeting(meeting) && daysUntil(meeting) === 0
  );
}

// ---------------------------------------------------------------------------
// Grouping by day, for the calendar-like view
// ---------------------------------------------------------------------------

export interface MeetingDayGroup {
  // The "2026-07-30" key of the day.
  dayKey: string;
  // The full start date of the first meeting, for the heading.
  date: string;
  meetings: Meeting[];
}

// Put the meetings into one group per day, days in order, and inside each day
// the meetings in order of their start time.
export function groupMeetingsByDay(meetings: Meeting[]): MeetingDayGroup[] {
  const sorted = [...meetings].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
  );

  const groups: MeetingDayGroup[] = [];

  sorted.forEach((meeting) => {
    const dayKey = new Date(meeting.startAt).toLocaleDateString("en-CA"); // YYYY-MM-DD

    const existing = groups.find((group) => group.dayKey === dayKey);
    if (existing) {
      existing.meetings.push(meeting);
    } else {
      groups.push({ dayKey: dayKey, date: meeting.startAt, meetings: [meeting] });
    }
  });

  return groups;
}

// ---------------------------------------------------------------------------
// Filtering the list
// ---------------------------------------------------------------------------

// status and type are lists, because the filter dropdowns of the toolbar let
// a person tick several answers at once ("show me scheduled AND ongoing").
// An empty list means nothing is ticked, and that is the same as "show all".
export interface MeetingFilters {
  search: string;
  status: string[];
  type: string[];
}

export const EMPTY_MEETING_FILTERS: MeetingFilters = {
  search: "",
  status: [],
  type: [],
};

export function filterMeetings(meetings: Meeting[], filters: MeetingFilters) {
  const search = filters.search.trim().toLowerCase();

  return meetings.filter((meeting) => {
    if (filters.status.length > 0 && !filters.status.includes(meeting.status)) {
      return false;
    }

    if (
      filters.type.length > 0 &&
      !filters.type.includes(meeting.meetingType)
    ) {
      return false;
    }

    if (search !== "") {
      // We search the title, the agenda, the location, and the names of the
      // invited people.
      const attendeeNames = meeting.attendees
        .map((attendee) => attendee.employee?.name || "")
        .join(" ");

      const text =
        meeting.title +
        " " +
        meeting.agenda +
        " " +
        meeting.location +
        " " +
        attendeeNames;

      if (!text.toLowerCase().includes(search)) {
        return false;
      }
    }

    return true;
  });
}

// Count how many attendees answered each way, for the little "3 yes, 1 no"
// summary on the card.
export interface ResponseCounts {
  accepted: number;
  declined: number;
  invited: number;
  attended: number;
}

export function countResponses(meeting: Meeting): ResponseCounts {
  const counts: ResponseCounts = {
    accepted: 0,
    declined: 0,
    invited: 0,
    attended: 0,
  };

  meeting.attendees.forEach((attendee) => {
    counts[attendee.response] += 1;
  });

  return counts;
}
