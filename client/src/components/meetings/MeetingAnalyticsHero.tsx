import { Link } from "react-router-dom";
import { CalendarClock, CalendarDays, MapPin, Video, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMeetingDay,
  formatMeetingTime,
  formatDuration,
} from "@/types/meeting.types";
import { formatHours, formatCountdown } from "./meetingAnalytics";
import type { MeetingHeadline } from "./meetingAnalytics";

// Today written the long way, for example "Thursday, 30 July 2026".
function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// The banner at the top of the meeting dashboard.
//
// It answers the one question somebody opening this page actually has —
// "what is next, and how much of my week is already gone?" — before any chart
// is read. The next meeting gets the most room, with its own countdown, and
// the four figures beside it frame everything the charts below explain.
export function MeetingAnalyticsHero(props: {
  headline: MeetingHeadline;
  meetingsPath: string;
}) {
  const head = props.headline;
  const next = head.next;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-sky-600 p-5 text-white shadow-xl shadow-indigo-500/20 sm:rounded-3xl sm:p-6 lg:p-8">
      {/* Two soft light orbs and a faint grid of squares, drawn with plain
          css so the banner needs no image file. The grid is a nod to the
          squares of a wall calendar. */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-sky-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6 lg:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <CalendarDays className="h-3.5 w-3.5" />
            {todayLabel()}
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Meeting analytics
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            How much of your workspace's time goes into meetings, when they
            happen, who sits in them, and what they leave behind.
          </p>

          {/* The next meeting, in a glassy card of its own. It is the one
              thing on this page that is about the next hour and not about
              the last three months. */}
          {next ? (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-100">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Next meeting
                </span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
                  {formatCountdown(head.minutesToNext)}
                </span>
              </div>

              <p className="mt-2 truncate text-lg font-semibold">{next.title}</p>

              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-indigo-100">
                <span>
                  {formatMeetingDay(next.startAt)} ·{" "}
                  {formatMeetingTime(next.startAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  {next.meetingType === "online" ? (
                    <Video className="h-3.5 w-3.5" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  {next.location || (next.meetingType === "online" ? "Online" : "In person")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {next.attendees.length} invited
                </span>
                <span>{formatDuration(next.durationMinutes)}</span>
              </p>
            </div>
          ) : (
            <div className="mt-5 max-w-md rounded-2xl bg-white/15 p-4 text-sm text-indigo-100 backdrop-blur-sm">
              Nothing is scheduled ahead. The diary is clear.
            </div>
          )}

          <Button
            asChild
            variant="secondary"
            className="mt-4 bg-white text-indigo-700 hover:bg-indigo-50"
          >
            <Link to={props.meetingsPath}>Open the meetings board</Link>
          </Button>
        </div>

        {/* The four headline figures. On a phone they share the whole width
            of the banner instead of leaving a ragged edge. */}
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Figure
            label="Today"
            value={String(head.todayCount)}
            hint={
              head.todayMinutes > 0 ? formatHours(head.todayMinutes) + " booked" : "nothing booked"
            }
          />
          <Figure
            label="Next 7 days"
            value={String(head.weekCount)}
            hint={
              head.weekMinutes > 0 ? formatHours(head.weekMinutes) + " booked" : "nothing booked"
            }
          />
          <Figure
            label="People-hours"
            value={formatHours(head.personMinutes)}
            hint="time × heads in the room"
          />
          <Figure
            label="Room size"
            value={String(head.averageAttendees)}
            hint="invited per meeting"
          />
        </div>
      </div>
    </div>
  );
}

// One glassy figure of the banner.
function Figure(props: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-32 flex-1 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm sm:flex-none">
      <p className="text-xs font-medium text-indigo-100">{props.label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{props.value}</p>
      <p className="mt-0.5 text-xs text-indigo-100/80">{props.hint}</p>
    </div>
  );
}
