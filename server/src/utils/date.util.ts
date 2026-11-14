// The HR module works with days, not with hours. Attendance is "one row per
// employee per day" and a leave is "from this day to that day".
//
// To make that easy we always store a day as midnight UTC. Then two dates of
// the same day are exactly equal and we can compare and count them safely.

// Turn the text "2026-07-30" that comes from an <input type="date">
// into the Date 2026-07-30T00:00:00.000Z.
// Anything we cannot read becomes null.
export function toDayStart(text: string | Date | undefined | null) {
  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (isNaN(date.getTime())) {
    return null;
  }

  // Rebuild the date from only the year, month and day parts, so the
  // time of day is thrown away.
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

// Today, as midnight UTC. This is the day we use for check in / check out.
export function todayStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

// Is this day really in the future?
//
// The browser sends the day it sees on its own clock, and we compare it
// with the day the server sees in UTC. Those two are not always the same
// day: for somebody in India (UTC+5:30) it is already the 22nd at half
// past midnight, while UTC is still on the 21st. Comparing them straight
// away would call their own today "a day in the future".
//
// No timezone in the world is more than one day ahead of UTC, so we give
// the check one day of room. A day two days ahead is a real mistake.
export function isFutureDay(day: Date) {
  const limit = todayStart();
  limit.setUTCDate(limit.getUTCDate() + 1);

  return day.getTime() > limit.getTime();
}

// Turn a Date back into the text "2026-07-30", which is what the
// <input type="date"> of the React form wants.
export function toDayText(date: Date) {
  return date.toISOString().slice(0, 10);
}

// Every single day from "from" to "to", both days included.
// countDaysBetween(30 July, 1 August) gives the three dates 30, 31, 1.
export function listDaysBetween(from: Date, to: Date) {
  const days: Date[] = [];
  const current = new Date(from);

  while (current.getTime() <= to.getTime()) {
    days.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

// Saturday and Sunday are the weekend in this app.
// getUTCDay() gives 0 for Sunday and 6 for Saturday.
export function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// The year we use to keep the leave balance, for example 2026.
export function yearOf(date: Date) {
  return date.getUTCFullYear();
}
