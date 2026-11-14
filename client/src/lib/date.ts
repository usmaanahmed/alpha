// Small date helpers used all over the HR pages.
//
// The server sends every date as a text like "2026-07-30T00:00:00.000Z".
// An <input type="date"> wants only "2026-07-30", and a table wants
// something a person can read, so we do those two jobs here.

// "2026-07-30T00:00:00.000Z" -> "2026-07-30"
// null or empty gives "", which leaves the date input empty.
export function toDateInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

// Today as "2026-07-30", used as the first value of a date input.
export function todayInputValue() {
  const now = new Date();

  // We build the text by hand instead of using toISOString, because
  // toISOString would change the day for people in a timezone behind UTC.
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return year + "-" + month + "-" + day;
}

// "2026-07-30T00:00:00.000Z" -> "30 Jul 2026"
// The dates of the HR module are days, not moments, so we read them as UTC
// to be sure the day never moves by one because of the timezone.
export function formatDay(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The check in and the check out are real moments, not days, so they are
// shown in the local time of the person reading them. That is the same
// clock as the one on the big card, so the two always agree.
export function formatTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "how long ago did this happen", the way a notification menu writes it:
// "just now", "2 min ago", "3 hours ago", "yesterday", "4 days ago".
//
// Anything older than a week becomes a plain date, because at that point
// "11 days ago" tells a person less than "20 Jul" does.
export function formatTimeAgo(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  // Both sides in milliseconds, so the difference is milliseconds too.
  const milliseconds = Date.now() - new Date(value).getTime();
  const seconds = Math.floor(milliseconds / 1000);

  // The clock of the computer can be a few seconds behind the clock of the
  // server. Without this line a brand new notification would say something
  // strange like "-1 min ago".
  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return minutes === 1 ? "1 min ago" : minutes + " mins ago";
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : hours + " hours ago";
  }

  const days = Math.floor(hours / 24);

  if (days === 1) {
    return "yesterday";
  }

  if (days < 7) {
    return days + " days ago";
  }

  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

// A real moment -> "09:30", which is what an <input type="time"> wants.
// Local time again, so the HR sees the same time in the form that the
// table showed them.
export function toTimeInputValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return hours + ":" + minutes;
}

// ---------------------------------------------------------------------------
// How long somebody worked, written the way this app counts a day.
//
// A working day here is EIGHT hours, not twenty four, because this figure
// answers "how much work went into it" and nobody works through the night.
// So anything from eight hours upwards is said in days:
//
//   45      -> "45m"
//   465     -> "7h 45m"
//   482     -> "1d 2m"
//   540     -> "1d 1h"
//   1200    -> "2d 4h"
//
// Two parts are enough for a person to picture the size of it, so the days
// are followed by the hours, or by the minutes when there is no whole hour
// left over.
// ---------------------------------------------------------------------------

// The eight hour day, in minutes.
export const WORK_DAY_MINUTES = 8 * 60;

export function formatWorkDuration(minutes: number) {
  if (minutes <= 0) {
    return "0m";
  }

  if (minutes < 60) {
    return minutes + "m";
  }

  const days = Math.floor(minutes / WORK_DAY_MINUTES);
  const restOfDays = minutes % WORK_DAY_MINUTES;
  const hours = Math.floor(restOfDays / 60);
  const restMinutes = restOfDays % 60;

  if (days > 0) {
    if (hours > 0) {
      return days + "d " + hours + "h";
    }
    if (restMinutes > 0) {
      return days + "d " + restMinutes + "m";
    }
    return days + "d";
  }

  if (restMinutes > 0) {
    return hours + "h " + restMinutes + "m";
  }

  return hours + "h";
}
