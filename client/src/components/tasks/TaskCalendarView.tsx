import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Task, TaskPriority } from "@/types/task.types";

interface TaskCalendarViewProps {
  data: Task[];
  isLoading: boolean;
  // Open the documents and the comments of a task. Every chip uses it.
  onOpenDetail: (task: Task) => void;
}

// The dot in front of a task chip. It borrows the same four colours as the
// priority flag, so red still means "high/urgent" here too.
const PRIORITY_DOT: Record<TaskPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// A short key like "2026-6-24" (year-month-day) built from a Date in the
// browser's own time zone. Two dates that fall on the same day share the
// same key, which is how we drop each task into the right square.
function dayKey(date: Date) {
  return date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate();
}

// True when the two dates are the very same day.
function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

export function TaskCalendarView(props: TaskCalendarViewProps) {
  // The month on the screen. We only ever care about its year and month,
  // the day is always kept at 1. It starts on the month of today.
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function goToPreviousMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }

  function goToNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  function goToToday() {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  // Sort the tasks into their day. Tasks with no due date cannot sit on the
  // grid, so they wait in their own strip under it. We build the map once
  // and every square just reads its own list from it.
  const tasksByDay: Record<string, Task[]> = {};
  const unscheduled: Task[] = [];

  props.data.forEach((task) => {
    if (!task.dueDate) {
      unscheduled.push(task);
      return;
    }

    const key = dayKey(new Date(task.dueDate));
    if (!tasksByDay[key]) {
      tasksByDay[key] = [];
    }
    tasksByDay[key].push(task);
  });

  // The grid always shows six full weeks (42 squares) so its height never
  // jumps from one month to the next. We start on the Monday on or before
  // the first of the month.
  const firstOfMonth = new Date(year, month, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(year, month, 1 - mondayOffset + i));
  }

  if (props.isLoading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The month name with the Today button and the two arrows. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <h2 className="text-base font-semibold sm:text-lg">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Today
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Seven columns of task chips never fit on a phone, so on a small
          screen the calendar keeps a readable width and slides sideways
          instead of being squeezed until no title can be read. From "md" up
          it simply fills the space it is given. */}
      <div className="overflow-x-auto overflow-y-hidden rounded-xl border bg-card">
        {/* The row of weekday names. */}
        <div className="grid min-w-3xl grid-cols-7 border-b md:min-w-0">
          {WEEKDAYS.map((name) => (
            <div
              key={name}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>

        {/* The 42 squares. */}
        <div className="grid min-w-3xl grid-cols-7 md:min-w-0">
          {days.map((day) => {
            const key = dayKey(day);
            const dayTasks = tasksByDay[key] || [];
            const inThisMonth = day.getMonth() === month;
            const isToday = isSameDay(day, today);

            return (
              <div
                key={key}
                className={cn(
                  "min-h-24 border-r border-b p-1.5 last:border-r-0",
                  inThisMonth ? "" : "bg-muted/30"
                )}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inThisMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Up to three chips per square, then a "+N more" line so a
                    very busy day never grows taller than the others. */}
                <div className="flex flex-col gap-1">
                  {dayTasks.slice(0, 3).map((task) => (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => props.onOpenDetail(task)}
                      title={task.title}
                      className="flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-1 text-left text-xs hover:bg-accent"
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          PRIORITY_DOT[task.priority]
                        )}
                      />
                      <span className="truncate">{task.title}</span>
                    </button>
                  ))}

                  {dayTasks.length > 3 ? (
                    <span className="px-1.5 text-xs text-muted-foreground">
                      +{dayTasks.length - 3} more
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks that have no due date cannot be drawn on any square, so they
          wait here instead of disappearing from the calendar. */}
      {unscheduled.length > 0 ? (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-medium">
            No due date ({unscheduled.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((task) => (
              <button
                key={task._id}
                type="button"
                onClick={() => props.onOpenDetail(task)}
                title={task.title}
                className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-accent"
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    PRIORITY_DOT[task.priority]
                  )}
                />
                <span className="max-w-40 truncate">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
