import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { formatWorkDuration } from "@/lib/date";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// How long a task has been worked on, in one short line.
//
// The clock of a task runs only while the task sits in "in progress". Moving
// it back to "to do" stops it, and starting it again picks it up where it
// stopped. So these minutes are real working time, never "how old the task
// is" and never the hours it spent waiting on somebody's list.
//
// There are three things this line can say:
//   - a finished task            -> "Took 1d 3h", a number that never moves,
//   - a task worked on today     -> "2h 10m today · 1d 3h total",
//   - one nobody touched today   -> "1d 3h total".
//
// A task somebody is on right now keeps counting on the screen. The server
// sends the work that is already behind us and the moment the current stretch
// began; everything after that moment is added here, so the line is right the
// second it is drawn and stays right without asking the server again.
// ---------------------------------------------------------------------------

// How often the line redraws while a task is running. The figure is written
// in whole minutes, so a clock ticking every second would spend its life
// redrawing exactly the same words.
const TICK_MILLISECONDS = 30 * 1000;

export function TaskTimeSpent(props: {
  // The minutes of work that are already finished and can no longer change.
  settledMinutesToday: number;
  settledMinutesTotal: number;
  // When the stretch that is still open began, or null when the task is not
  // being worked on right now.
  runningSince: string | null;
  // A task that is done says "took", because there is nothing more to come.
  isDone: boolean;
  className?: string;
}) {
  const isRunning = props.runningSince !== null;

  // The clock of the browser. It is asked before anything else, because React
  // wants the same hooks in the same order on every draw and the line below
  // sometimes draws nothing at all.
  const now = useTickingClock(isRunning);

  // Nobody has ever started this task, so there is nothing to say. An empty
  // space reads better than a "0m" that nobody asked for.
  if (props.settledMinutesTotal === 0 && !isRunning) {
    return null;
  }

  const live = readLiveMinutes(props.runningSince, now);

  // The stretch that is running belongs to both figures at once: the work is
  // happening now, so it is work of today and work in total.
  const spentToday = props.settledMinutesToday + live.today;
  const spentTotal = props.settledMinutesTotal + live.total;

  const parts: string[] = [];

  if (props.isDone) {
    parts.push("Took " + formatWorkDuration(spentTotal));
  } else {
    if (spentToday > 0) {
      parts.push(formatWorkDuration(spentToday) + " today");
    }

    // The total is only worth a second figure when there is older work on the
    // task as well. Otherwise it would say the same thing twice.
    if (spentTotal > spentToday) {
      parts.push(formatWorkDuration(spentTotal) + " total");
    }
  }

  // The clock was started, but not one whole minute has passed yet.
  if (parts.length === 0) {
    parts.push("just started");
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        props.className
      )}
    >
      {isRunning ? (
        // The same live dot the app uses everywhere for "this is happening
        // right now".
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : (
        <Timer className="h-3 w-3 shrink-0" />
      )}

      {parts.join(" · ")}
    </span>
  );
}

// The moment it is now, redrawn every half minute while something on the
// screen is running. A task that is not running needs no clock at all, and
// then no timer is ever started: a list of fifty finished tasks costs nothing.
//
// A task that only STARTS running while the screen is already open reads its
// first real minute on the next tick. Until then readLiveMinutes sees a clock
// older than the stretch and answers 0, which is the line saying
// "just started" - true, and half a minute later it is exact.
function useTickingClock(isRunning: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), TICK_MILLISECONDS);

    // The row was closed, or the task stopped. Put the clock away, or it
    // would keep running for a screen nobody is looking at.
    return () => window.clearInterval(timer);
  }, [isRunning]);

  return now;
}

// The minutes of the stretch that is still running: all of them, and the part
// of them that belongs to today.
//
// The two are the same number almost always. They only differ for a task that
// was left running overnight, and then today gets the part after midnight.
function readLiveMinutes(runningSince: string | null, now: number) {
  if (!runningSince) {
    return { total: 0, today: 0 };
  }

  const startedAt = new Date(runningSince).getTime();

  // A clock that disagrees with the server must never take time away.
  if (now <= startedAt) {
    return { total: 0, today: 0 };
  }

  // Midnight UTC, which is where the server cuts a day as well. Both sides
  // have to mean the same thing by "today" or the two halves of the figure
  // would not add up.
  const today = new Date(now);
  const midnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate()
  );

  const todayFrom = Math.max(startedAt, midnight);

  return {
    total: Math.floor((now - startedAt) / 60000),
    today: Math.floor((now - todayFrom) / 60000),
  };
}
