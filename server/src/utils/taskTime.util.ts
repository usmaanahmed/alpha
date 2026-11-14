import type { WorkSession } from "../modules/task/task.model.js";

// ---------------------------------------------------------------------------
// How long a task has really been worked on.
//
// The answer is read from the work stretches the task carries: one stretch
// for every time it sat in "in progress". Nothing else is counted, so a task
// that was started on Monday and pushed back to "to do" on Tuesday morning
// does not quietly collect the whole night.
//
// Only the FINISHED stretches are added up here. The one that is still
// running is not, and its starting moment is handed over instead:
//
//   settled  = the work that is already behind us, a number that stands still,
//   runningSince = when the current stretch began, or null when none is.
//
// The browser then adds "now minus runningSince" on top and the figure keeps
// climbing on the screen by itself. Doing it this way means the two sides
// never disagree and the browser can never count the same minute twice, which
// is exactly what would happen if the server sent one finished total and the
// browser tried to guess how old it was.
// ---------------------------------------------------------------------------

const ONE_MINUTE = 1000 * 60;

export function readTaskTime(
  sessions: WorkSession[],
  // Midnight of today. It is handed in, because the HR module counts a day
  // from midnight UTC and this has to agree with it.
  dayStart: Date
) {
  let settledMinutesTotal = 0;
  let settledMinutesToday = 0;
  let runningSince: Date | null = null;

  sessions.forEach((session) => {
    const start = new Date(session.startedAt).getTime();

    // No end means the work is still going. Its minutes are the browser's to
    // count, so all we pass on is the moment it started.
    if (!session.endedAt) {
      runningSince = new Date(session.startedAt);
      return;
    }

    const end = new Date(session.endedAt).getTime();

    // A stretch opened and closed inside the same second is not work, and a
    // clock that was set backwards must never take time away.
    if (end <= start) {
      return;
    }

    settledMinutesTotal = settledMinutesTotal + (end - start) / ONE_MINUTE;

    // The part of this stretch that falls inside today. A stretch that began
    // yesterday evening gives today only the part after midnight, and one
    // that finished yesterday gives today nothing at all.
    const todayFrom = Math.max(start, dayStart.getTime());

    if (end > todayFrom) {
      settledMinutesToday = settledMinutesToday + (end - todayFrom) / ONE_MINUTE;
    }
  });

  return {
    // Whole minutes: nobody reads half a minute, and the browser would only
    // have to round it again before writing it on the screen.
    settledMinutesTotal: Math.round(settledMinutesTotal),
    settledMinutesToday: Math.round(settledMinutesToday),
    runningSince: runningSince,
  };
}
