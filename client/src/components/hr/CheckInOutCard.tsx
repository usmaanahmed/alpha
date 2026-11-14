import { useEffect, useState } from "react";
import { Loader2, LogIn, LogOut, Check, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useMyTodayAttendance,
  useCheckIn,
  useCheckOut,
} from "@/hooks/useAttendance";
import { formatTime } from "@/lib/date";
import { FULL_WORK_DAY_HOURS } from "@/lib/attendanceStatus";

// The big card at the top of the "my attendance" page.
//
// It shows one of three things, depending on the row of today:
// - no check in yet          -> the "check in" button,
// - a check in, no check out -> the "check out" button and a live timer,
// - both                     -> the hours of the finished day.
export function CheckInOutCard() {
  const todayQuery = useMyTodayAttendance();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();

  const today = todayQuery.data;

  const hasCheckedIn = Boolean(today?.checkIn);
  const hasCheckedOut = Boolean(today?.checkOut);

  // The server writes an "on leave" row for every day of an approved leave,
  // so a leave that was approved shows up here by itself. Somebody on leave
  // may not check in, so we say that instead of showing a button that would
  // only give an error.
  const isOnLeave = today?.status === "on_leave";

  // The clock must move by itself, so we keep the current moment in a state
  // and write a new one into it every second.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);

    // React calls this when the card disappears, and that stops the timer.
    // Without it the timer would keep running forever in the background.
    return () => clearInterval(timer);
  }, []);

  // While the person is working we count the hours ourselves, so the number
  // grows in front of their eyes. Once they check out we show the number the
  // server counted, because that is the one that is really saved.
  let workedHours = 0;

  if (hasCheckedOut) {
    workedHours = today?.workedHours || 0;
  } else if (hasCheckedIn && today?.checkIn) {
    const milliseconds = now.getTime() - new Date(today.checkIn).getTime();
    workedHours = Math.max(0, milliseconds / (1000 * 60 * 60));
  }

  // How full the ring is: a whole day of 8 hours is 100%.
  const dayPercent = Math.min(
    100,
    Math.round((workedHours / FULL_WORK_DAY_HOURS) * 100)
  );

  // "7.25 hours" is easier to read as "7h 15m".
  const wholeHours = Math.floor(workedHours);
  const minutes = Math.round((workedHours - wholeHours) * 60);

  return (
    <Card className="overflow-hidden py-0">
      {/* The soft stripe on top gives the card a bit of colour without
          touching the grey theme of the rest of the app. */}
      <div className="bg-linear-to-br from-primary/5 via-transparent to-primary/10 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-6">
          {/* Left side: the date and the big clock. */}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums sm:text-4xl">
              {now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>

          {/* Right side: the ring with the hours inside it. */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <WorkedHoursRing
              percent={dayPercent}
              isRunning={hasCheckedIn && !hasCheckedOut}
              label={wholeHours + "h " + String(minutes).padStart(2, "0") + "m"}
            />

            {todayQuery.isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : isOnLeave ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-700 dark:text-sky-400">
                <Plane className="h-4 w-4" />
                {today?.remarks || "On leave today"}
              </span>
            ) : !hasCheckedIn ? (
              <Button
                size="lg"
                onClick={() => checkIn.mutate()}
                disabled={checkIn.isPending}
              >
                {checkIn.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Check in
              </Button>
            ) : !hasCheckedOut ? (
              <Button
                size="lg"
                variant="outline"
                onClick={() => checkOut.mutate()}
                disabled={checkOut.isPending}
              >
                {checkOut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Check out
              </Button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <Check className="h-4 w-4" />
                Done for today
              </span>
            )}
          </div>
        </div>
      </div>

      {/* The two real times, on a line of their own under the stripe. */}
      <div className="grid grid-cols-2 divide-x border-t">
        <div className="px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">Check in</p>
          <p className="mt-1 text-lg font-medium tabular-nums">
            {formatTime(today?.checkIn)}
          </p>
        </div>
        <div className="px-4 py-4 sm:px-6">
          <p className="text-xs text-muted-foreground">Check out</p>
          <p className="mt-1 text-lg font-medium tabular-nums">
            {formatTime(today?.checkOut)}
          </p>
        </div>
      </div>
    </Card>
  );
}

// The round progress ring.
//
// It is drawn with two circles on top of each other: a grey one for the
// whole day, and a coloured one that is only partly drawn.
//
// strokeDasharray cuts the line of a circle into pieces. We give it the
// whole length of the circle, and strokeDashoffset then hides the part of
// it we do not want to see. Offset 0 shows the full ring, offset = length
// shows nothing.
function WorkedHoursRing(props: {
  percent: number;
  isRunning: boolean;
  label: string;
}) {
  const radius = 34;
  const circleLength = 2 * Math.PI * radius;
  const hiddenLength = circleLength - (props.percent / 100) * circleLength;

  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-muted"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circleLength}
          strokeDashoffset={hiddenLength}
          className="stroke-emerald-500 transition-all duration-500"
        />
      </svg>

      {/* The hours sit in the middle of the ring. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums">{props.label}</span>
        {props.isRunning ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {/* A small dot that keeps blinking while the person works. */}
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            working
          </span>
        ) : null}
      </div>
    </div>
  );
}
