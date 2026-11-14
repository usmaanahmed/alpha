import { Link } from "react-router-dom";
import {
  ActivitySquare,
  AlarmClock,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  Clock,
  ListChecks,
  LogIn,
  MapPin,
  Plane,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TaskPriorityFlag } from "@/components/tasks/TaskPriorityFlag";
import { TaskTimeSpent } from "@/components/tasks/TaskTimeSpent";
import { useEmployeeActivity } from "@/hooks/useEmployees";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import {
  formatTime,
  formatDay,
  formatTimeAgo,
  formatWorkDuration,
} from "@/lib/date";
import { getStatusLabel } from "@/types/task.types";
import { getMeetingStatusLabel } from "@/types/meeting.types";
import { cn } from "@/lib/utils";
import type {
  EmployeeActivity,
  EmployeeActivityEvent,
  EmployeeActivityMeeting,
  EmployeeActivityTask,
} from "@/types/employee.types";

// ---------------------------------------------------------------------------
// The panel that opens under one row of the employee table.
//
// The question it answers is always the same one a manager asks while looking
// down a list of people: "is this person free today, what is on their plate,
// and what have they been doing?" So the panel is read from top to bottom:
//
//   1. one sentence  - where they are and how full their day is,
//   2. five figures  - the numbers behind that sentence,
//   3. two lists     - the meetings of today and the work in their hands,
//   4. one feed      - the last things that really happened, newest first.
//
// Nothing here is made up: every number and every line comes from the one
// answer of GET /api/employees/:id/activity, which the server builds from the
// task, meeting, attendance and leave records of that person.
// ---------------------------------------------------------------------------

// A working day is eight hours. The "free time" figure is what is left of it
// once the meetings and the work of today have taken their share.
const WORK_DAY_HOURS = 8;

// The busiest a day can look on the meter. Ten load points is a day that is
// completely gone, and everything above it simply fills the bar.
const FULL_LOAD_POINTS = 10;

export function EmployeeActivityPanel(props: {
  employeeId: string;
  employeeName: string;
  // Where the detail page of this person lives. It is built by the table,
  // because the organization and an employee reach it under two addresses.
  profilePath: string;
  // The row is open. The panel asks the server only while this is true.
  isOpen: boolean;
}) {
  const { hasFeature } = useAuth();

  // The panel is a section of its own. When it is off the row does not ask
  // the server at all: that route answers 403 now, and an error under a row
  // that should not open is worse than a row that simply does not open.
  const isOn = hasFeature(FEATURES.EMPLOYEES_ACTIVITY);

  const activityQuery = useEmployeeActivity(
    props.employeeId,
    props.isOpen && isOn
  );

  if (!isOn) {
    return null;
  }

  if (activityQuery.isLoading) {
    return <PanelSkeleton />;
  }

  if (!activityQuery.data) {
    return (
      <div className="px-4 py-10 text-center text-sm text-muted-foreground">
        Today could not be read for this person. Close the row and open it
        again.
      </div>
    );
  }

  const activity = activityQuery.data;
  const workload = activity.workload;

  const presence = readPresence(activity);
  const load = readLoad(activity);

  // "Now" is read once, from the clock the SERVER put in the answer, and then
  // handed down to the lines that need it. Reading the browser clock while
  // drawing would give a different answer on every redraw, and React asks a
  // component to draw the same thing every time it is given the same data.
  const now = new Date(activity.serverTime).getTime();

  // What is left of the working day once the meetings AND the work of today
  // have taken their part: the hours booked in meetings plus the estimated
  // hours of the tasks that are late, due today, or already started.
  //
  // It never goes below zero: a day with nine hours in it is simply a day
  // with no room left, not a day with minus one hour.
  const takenMinutes = workload.bookedMinutes + workload.taskMinutesToday;
  const freeHours = Math.max(0, WORK_DAY_HOURS - takenMinutes / 60);

  return (
    <div className="flex flex-col gap-4 border-t-2 border-primary/40 p-4">
      {/* ---------------------------------------------------------------
          1. The sentence. Everything under it is the proof of this line.
          --------------------------------------------------------------- */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              presence.className
            )}
          >
            <presence.icon className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-tight">
              {presence.label}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {presence.detail}
            </p>
          </div>
        </div>

        {/* The load meter. It is a reading, not a score: the note under it
            says in words what the bar is made of. */}
        <div className="w-full max-w-[260px] shrink-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn("text-sm font-semibold", load.textClassName)}>
              {load.label}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {load.note}
            </span>
          </div>

          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", load.barClassName)}
              style={{ width: load.percent + "%" }}
            />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------
          2. The five figures behind the sentence.
          --------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        <Figure
          icon={ListChecks}
          label="Open work"
          value={String(workload.openTasks)}
          note={workload.inProgressTasks + " started"}
          className="bg-sky-500/10 text-sky-600 dark:text-sky-400"
        />

        <Figure
          icon={AlarmClock}
          label="Due today"
          value={String(workload.dueTodayTasks)}
          note={
            workload.overdueTasks > 0
              ? workload.overdueTasks + " already late"
              : "nothing is late"
          }
          className={
            workload.overdueTasks > 0
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          }
          noteClassName={
            workload.overdueTasks > 0
              ? "font-medium text-rose-600 dark:text-rose-400"
              : undefined
          }
        />

        <Figure
          icon={CalendarClock}
          label="Meetings"
          value={String(workload.meetingsToday)}
          note={formatMinutes(workload.bookedMinutes) + " booked"}
          className="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />

        <Figure
          icon={Clock}
          label="Free time"
          value={formatHours(freeHours)}
          note={
            takenMinutes > 0
              ? formatMinutes(workload.bookedMinutes) +
                " met · " +
                formatMinutes(workload.taskMinutesToday) +
                " work"
              : "of an " + WORK_DAY_HOURS + "h day"
          }
          className="bg-slate-500/10 text-slate-600 dark:text-slate-300"
        />

        <Figure
          icon={CheckCircle2}
          label="Finished"
          value={String(workload.completedThisWeek)}
          note="in the last 7 days"
          className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* ---------------------------------------------------------------
          3. The two lists: the day, and the plate.
          --------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Section
          icon={CalendarClock}
          title="Today's schedule"
          count={activity.meetings.length}
          right={<NextUp activity={activity} now={now} />}
        >
          {activity.meetings.length === 0 ? (
            <Empty>
              No meeting today. The whole day is theirs to work in.
            </Empty>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activity.meetings.map((meeting) => (
                <MeetingLine key={meeting._id} meeting={meeting} now={now} />
              ))}
            </div>
          )}
        </Section>

        <Section
          icon={ListChecks}
          title="On the plate"
          count={workload.openTasks}
          right={
            workload.openTasks > activity.tasks.length ? (
              <span className="text-[11px] text-muted-foreground">
                nearest {activity.tasks.length} deadlines
              </span>
            ) : null
          }
        >
          {activity.tasks.length === 0 ? (
            <Empty>No open task. Everything given to them is done.</Empty>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activity.tasks.map((task) => (
                <TaskLine key={task._id} task={task} today={activity.today} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* ---------------------------------------------------------------
          4. What really happened, newest first.
          --------------------------------------------------------------- */}
      <Section
        icon={ActivitySquare}
        title="Recent activity"
        count={activity.timeline.length}
      >
        {activity.timeline.length === 0 ? (
          <Empty>Nothing has been recorded for this person yet.</Empty>
        ) : (
          <Timeline events={activity.timeline} today={activity.serverTime} />
        )}
      </Section>

      {/* The way out of the quick look and into the whole person. The
          profile page is a section of its own, so this panel can be the last
          word about somebody. */}
      {hasFeature(FEATURES.EMPLOYEES_PROFILE) ? (
        <div className="flex justify-end">
          <Link
            to={props.profilePath}
            className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            Open {props.employeeName.split(" ")[0]}&apos;s full profile
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reading the answer: the two sentences at the top
// ---------------------------------------------------------------------------

// Where this person is today, in one line, plus the smaller line under it.
//
// The order of the questions matters. An approved leave is asked about first,
// because somebody who is away on purpose must never be read as "absent": the
// two words look the same on a screen and mean opposite things to a manager.
function readPresence(activity: EmployeeActivity) {
  const presence = activity.presence;
  const workload = activity.workload;

  if (activity.leave.today) {
    return {
      label: "On leave today",
      detail:
        activity.leave.today.typeName +
        " until " +
        formatDay(activity.leave.today.toDate),
      icon: Plane,
      className: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    };
  }

  if (presence.status === "holiday") {
    return {
      label: "Public holiday",
      detail: "The office is closed today.",
      icon: CircleSlash,
      className: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    };
  }

  if (presence.status === "absent") {
    return {
      label: "Absent today",
      detail: "Marked absent, with no leave covering the day.",
      icon: CircleSlash,
      className: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    };
  }

  if (presence.checkIn && presence.checkOut) {
    return {
      label: "Day finished at " + formatTime(presence.checkOut),
      detail:
        formatHours(presence.workedHours) +
        " worked · " +
        summarise(workload),
      icon: CheckCircle2,
      className: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    };
  }

  if (presence.checkIn) {
    return {
      label: "In since " + formatTime(presence.checkIn),
      detail: summarise(workload),
      icon: LogIn,
      className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    };
  }

  // Nobody wrote anything for today yet. That is not the same as absent: it
  // is simply the morning, or a person who forgot to check in.
  return {
    label: "Not checked in yet",
    detail: summarise(workload),
    icon: Clock,
    className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
}

// The small line under the presence: what today is made of, in words.
function summarise(workload: EmployeeActivity["workload"]) {
  const parts: string[] = [];

  if (workload.meetingsToday > 0) {
    parts.push(
      workload.meetingsToday === 1
        ? "1 meeting"
        : workload.meetingsToday + " meetings"
    );
  }

  if (workload.dueTodayTasks > 0) {
    parts.push(workload.dueTodayTasks + " due today");
  }

  if (workload.overdueTasks > 0) {
    parts.push(workload.overdueTasks + " running late");
  }

  if (parts.length === 0) {
    return "Nothing is booked and nothing is due today.";
  }

  return parts.join(" · ");
}

// How full the day is, as a word, a bar and one line saying what the bar is
// made of.
//
// This is a reading, not a science, and the note says so out loud: one point
// per hour of meeting, one point per task due today, and two points for a
// task that is already late, because late work costs more than the hour it
// was supposed to take. Ten points is a day with nothing left in it.
function readLoad(activity: EmployeeActivity) {
  const workload = activity.workload;

  const meetingHours = workload.bookedMinutes / 60;

  const points =
    meetingHours + workload.dueTodayTasks + workload.overdueTasks * 2;

  const percent = Math.min(100, Math.round((points / FULL_LOAD_POINTS) * 100));

  // Somebody who is away today has no day to fill, so the meter says that
  // instead of showing an empty bar that reads like "free, give them work".
  if (activity.leave.today) {
    return {
      label: "Away",
      note: "on leave",
      percent: 100,
      textClassName: "text-sky-600 dark:text-sky-400",
      barClassName: "bg-sky-500/60",
    };
  }

  const note =
    formatMinutes(workload.bookedMinutes) +
    " of meetings · " +
    (workload.dueTodayTasks + workload.overdueTasks) +
    " deadlines";

  if (points === 0) {
    return {
      label: "Clear day",
      note: "nothing booked, nothing due",
      percent: 4,
      textClassName: "text-emerald-600 dark:text-emerald-400",
      barClassName: "bg-emerald-500",
    };
  }

  if (points < 3) {
    return {
      label: "Light day",
      note: note,
      percent: percent,
      textClassName: "text-emerald-600 dark:text-emerald-400",
      barClassName: "bg-emerald-500",
    };
  }

  if (points < 6) {
    return {
      label: "Steady day",
      note: note,
      percent: percent,
      textClassName: "text-sky-600 dark:text-sky-400",
      barClassName: "bg-sky-500",
    };
  }

  if (points < 9) {
    return {
      label: "Busy day",
      note: note,
      percent: percent,
      textClassName: "text-amber-600 dark:text-amber-400",
      barClassName: "bg-amber-500",
    };
  }

  return {
    label: "Packed day",
    note: note,
    percent: percent,
    textClassName: "text-rose-600 dark:text-rose-400",
    barClassName: "bg-rose-500",
  };
}

// ---------------------------------------------------------------------------
// Numbers written the way a person says them
// ---------------------------------------------------------------------------

// 3.5 -> "3h 30m", 0 -> "0h", 0.5 -> "30m".
function formatHours(hours: number) {
  return formatMinutes(Math.round(hours * 60));
}

// 90 -> "1h 30m", 60 -> "1h", 45 -> "45m", 0 -> "0h".
function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return "0h";
  }

  const wholeHours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  if (wholeHours === 0) {
    return restMinutes + "m";
  }

  if (restMinutes === 0) {
    return wholeHours + "h";
  }

  return wholeHours + "h " + restMinutes + "m";
}

// How many whole days there are between the day of "value" and the day of
// "today". 0 is today, 1 is tomorrow, -2 means two days ago.
//
// Both dates are cut down to their day part first, so a deadline at midnight
// and a deadline at six in the evening on the same day give the same answer.
function daysBetween(value: string, today: string) {
  const oneDay = 1000 * 60 * 60 * 24;

  const target = new Date(value.slice(0, 10)).getTime();
  const start = new Date(today.slice(0, 10)).getTime();

  return Math.round((target - start) / oneDay);
}

// The little chip at the end of a task line: how much time is left, and how
// worried to be about it.
function readDue(dueDate: string | null, today: string) {
  if (!dueDate) {
    return {
      label: "No deadline",
      className: "bg-muted text-muted-foreground",
    };
  }

  const days = daysBetween(dueDate, today);

  if (days < 0) {
    return {
      label: days === -1 ? "1 day late" : -days + " days late",
      className:
        "bg-rose-500/10 text-rose-700 dark:text-rose-400 font-semibold",
    };
  }

  if (days === 0) {
    return {
      label: "Due today",
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
    };
  }

  if (days === 1) {
    return {
      label: "Tomorrow",
      className: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
    };
  }

  if (days <= 7) {
    return {
      label: "In " + days + " days",
      className: "bg-muted text-muted-foreground",
    };
  }

  return {
    label: formatDay(dueDate),
    className: "bg-muted text-muted-foreground",
  };
}

// ---------------------------------------------------------------------------
// The pieces the panel is built from
// ---------------------------------------------------------------------------

// One of the five figures under the sentence: a coloured icon, a big number,
// and the small grey line that says what the number is.
function Figure(props: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  className: string;
  noteClassName?: string;
}) {
  const Icon = props.icon;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          props.className
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none tabular-nums">
          {props.value}
        </p>
        <p className="mt-1 truncate text-[11px] uppercase tracking-wide text-muted-foreground">
          {props.label}
        </p>
        <p
          className={cn(
            "truncate text-[11px] text-muted-foreground",
            props.noteClassName
          )}
        >
          {props.note}
        </p>
      </div>
    </div>
  );
}

// One box of the panel: a small heading with a count, and whatever the box
// holds under it.
function Section(props: {
  icon: LucideIcon;
  title: string;
  count: number;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-xl border border-border/60 bg-background/70 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {props.title}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
            {props.count}
          </span>
        </p>

        {props.right}
      </div>

      {props.children}
    </div>
  );
}

// The line a box shows when it has nothing to list.
function Empty(props: { children: React.ReactNode }) {
  return (
    <p className="py-6 text-center text-xs text-muted-foreground">
      {props.children}
    </p>
  );
}

// The "next up" note in the corner of the schedule box: the next meeting that
// has not finished yet, whatever day it falls on.
function NextUp(props: { activity: EmployeeActivity; now: number }) {
  const next = props.activity.nextMeeting;

  if (!next) {
    return null;
  }

  const startsIn = new Date(next.startAt).getTime() - props.now;
  const minutes = Math.round(startsIn / 60000);

  // Already started, and not finished yet: it is happening as we look.
  if (minutes <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        In a meeting now
      </span>
    );
  }

  // Further away than today: the day is more useful than the countdown.
  if (minutes > 60 * 12) {
    return (
      <span className="text-[11px] text-muted-foreground">
        Next: {formatDay(next.startAt)}, {formatTime(next.startAt)}
      </span>
    );
  }

  return (
    <span className="text-[11px] font-medium text-muted-foreground">
      Next in {formatMinutes(minutes)} · {formatTime(next.startAt)}
    </span>
  );
}

// One meeting of the day. The time sits in its own column on the left, so the
// meetings read like a timetable and the eye can run down the hours.
function MeetingLine(props: { meeting: EmployeeActivityMeeting; now: number }) {
  const meeting = props.meeting;

  const now = props.now;
  const start = new Date(meeting.startAt).getTime();
  const end = new Date(meeting.endAt).getTime();

  const isNow =
    start <= now && now < end && meeting.status !== "cancelled";

  // A meeting that is over, or one that was called off, steps back: it is
  // still part of the day, but it is not what anybody has to act on.
  const isDone = end <= now || meeting.status === "cancelled";

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-2.5 py-2",
        isNow
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-transparent bg-muted/40",
        isDone && "opacity-60"
      )}
    >
      <div className="w-[52px] shrink-0 text-right">
        <p className="text-xs font-semibold tabular-nums">
          {formatTime(meeting.startAt)}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {formatMinutes(meeting.durationMinutes)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-medium",
            meeting.status === "cancelled" && "line-through"
          )}
        >
          {meeting.title}
        </p>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {meeting.meetingType === "online" ? (
              <Video className="h-3 w-3" />
            ) : (
              <MapPin className="h-3 w-3" />
            )}
            {meeting.location || (meeting.meetingType === "online" ? "Online" : "In person")}
          </span>

          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {meeting.attendeeCount}
          </span>

          {/* Only worth saying when it is not the plain "scheduled". */}
          {meeting.status !== "scheduled" ? (
            <span>{getMeetingStatusLabel(meeting.status)}</span>
          ) : null}
        </div>
      </div>

      {/* An invitation this person has not answered yet is the one thing on
          the line somebody may have to chase. */}
      {meeting.myResponse === "invited" && !isDone ? (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Not answered
        </Badge>
      ) : null}

      {isNow ? (
        <Badge className="shrink-0 bg-emerald-600 text-[10px] text-white">
          Now
        </Badge>
      ) : null}
    </div>
  );
}

// One open task, with the nearest deadline at the top of the list.
function TaskLine(props: { task: EmployeeActivityTask; today: string }) {
  const task = props.task;
  const due = readDue(task.dueDate, props.today);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{task.title}</p>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="scale-90 origin-left">
            <TaskPriorityFlag priority={task.priority} />
          </span>
          <span className="text-[11px] text-muted-foreground">
            {getStatusLabel(task.status)}
          </span>

          {/* What the task has cost so far. It draws nothing at all for a
              task nobody has started yet, so an untouched list stays quiet. */}
          <TaskTimeSpent
            settledMinutesToday={task.settledMinutesToday}
            settledMinutesTotal={task.settledMinutesTotal}
            runningSince={task.runningSince}
            isDone={false}
            className="text-[11px] text-muted-foreground"
          />
        </div>
      </div>

      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap",
          due.className
        )}
      >
        {due.label}
      </span>
    </div>
  );
}

// The icon and the colour of one line of the feed, one per module. Tasks are
// sky, meetings violet, leaves amber and the clock in and out emerald, the
// same colours those modules carry everywhere else in the app.
const EVENT_LOOK: Record<
  EmployeeActivityEvent["kind"],
  { icon: LucideIcon; className: string }
> = {
  task: {
    icon: ListChecks,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  meeting: {
    icon: CalendarClock,
    className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  leave: {
    icon: Plane,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  attendance: {
    icon: LogIn,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
};

// The recent activity feed, drawn as a timeline: one thread running down the
// left side, the days written across it, and every event hanging off it with
// the newest at the top.
//
// A timeline is read the way a person tells a story - "today they did this,
// then this, and yesterday that" - so the day is said once, as a heading,
// and the lines under it only have to say the hour.
function Timeline(props: { events: EmployeeActivityEvent[]; today: string }) {
  const groups = groupByDay(props.events, props.today);

  return (
    <div className="flex flex-col gap-3 pt-0.5">
      {groups.map((group, groupIndex) => (
        <div key={group.label}>
          {/* The day these events belong to, with a rule that runs out to the
              edge so the eye reads it as a break in the thread. */}
          <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
            <span className="h-px flex-1 bg-border" />
          </p>

          {group.events.map((event, eventIndex) => (
            <TimelineEvent
              key={event.id}
              event={event}
              // Today's events say "2 hours ago", because that is how a person
              // talks about them. Older ones say the hour instead: the day is
              // already written above them, so "4 days ago" would only repeat
              // the heading.
              showAgo={group.isToday}
              // The thread stops at the very last event of the very last day,
              // so the feed ends instead of trailing off into nothing.
              isLast={
                groupIndex === groups.length - 1 &&
                eventIndex === group.events.length - 1
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// One stop on the timeline: the dot that says what kind of thing happened,
// what it was, and when.
function TimelineEvent(props: {
  event: EmployeeActivityEvent;
  showAgo: boolean;
  isLast: boolean;
}) {
  const look = EVENT_LOOK[props.event.kind];
  const Icon = look.icon;

  return (
    <div className={cn("relative flex gap-3", props.isLast ? "pb-0" : "pb-3")}>
      {/* The thread. It begins under the dot and runs down to the next one,
          so it is never drawn behind the icon itself. */}
      {!props.isLast && (
        <span
          className="absolute bottom-0 left-[13px] top-7 w-px bg-border"
          aria-hidden="true"
        />
      )}

      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          look.className
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      {/* leading-7 is the height of the dot, so the sentence sits level with
          it however long it is. */}
      <p className="min-w-0 flex-1 truncate text-[12px] leading-7">
        <span className="font-semibold">{props.event.action}</span>{" "}
        <span className="text-muted-foreground">{props.event.title}</span>
      </p>

      {/* Only a finished task knows how long it took, so only that line
          carries the chip. */}
      {props.event.tookMinutes ? (
        <span className="shrink-0 self-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          took {formatWorkDuration(props.event.tookMinutes)}
        </span>
      ) : null}

      <span className="shrink-0 text-[11px] leading-7 tabular-nums text-muted-foreground">
        {props.showAgo
          ? formatTimeAgo(props.event.at)
          : formatTime(props.event.at)}
      </span>
    </div>
  );
}

// The events cut into one bundle per day, newest day first.
//
// The server already sends them newest first, so walking the list in order is
// enough: a new bundle is started every time the day changes.
function groupByDay(events: EmployeeActivityEvent[], today: string) {
  const groups: {
    label: string;
    isToday: boolean;
    events: EmployeeActivityEvent[];
  }[] = [];

  events.forEach((event) => {
    const days = daysBetween(event.at, today);

    let label = formatDay(event.at);

    if (days === 0) {
      label = "Today";
    } else if (days === -1) {
      label = "Yesterday";
    }

    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.label === label) {
      lastGroup.events.push(event);
      return;
    }

    groups.push({ label: label, isToday: days === 0, events: [event] });
  });

  return groups;
}

// Grey bars in the shape of the panel, so the table does not jump twice: once
// when the row opens, and again when the answer lands.
function PanelSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 border-t-2 border-primary/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted" />
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-40 rounded bg-muted" />
            <div className="h-2.5 w-28 rounded bg-muted" />
          </div>
        </div>
        <div className="h-6 w-[260px] rounded bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="h-[62px] rounded-xl bg-muted" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="h-40 rounded-xl bg-muted" />
        <div className="h-40 rounded-xl bg-muted" />
      </div>
    </div>
  );
}
