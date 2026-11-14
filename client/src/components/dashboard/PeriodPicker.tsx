import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressPeriod } from "@/types/dashboard.types";

// The three widths one bar can have, and the words on their buttons.
const PERIODS: { period: ProgressPeriod; label: string }[] = [
  { period: "weekly", label: "Weekly" },
  { period: "monthly", label: "Monthly" },
  { period: "yearly", label: "Yearly" },
];

// The state behind the picker: which period we are on, and which month or
// year of it we are looking at.
//
// Two charts of the dashboard ask the server the same three questions
// (period, year, month), so the state and the walking live here once
// instead of being written twice. Each chart keeps its OWN picker, so
// looking at last year in one of them does not move the other.
export function usePeriodPicker() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  const [period, setPeriod] = useState<ProgressPeriod>("monthly");
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState(thisMonth);

  // The yearly view already runs from the oldest task up to today, so there
  // is nothing before it and nothing after it to walk to.
  const canWalk = period !== "yearly";

  // You cannot walk into a week or a month that has not happened yet.
  const isAtToday =
    period === "weekly"
      ? year > thisYear || (year === thisYear && month >= thisMonth)
      : year >= thisYear;

  // One step back, or one step forward. Weekly walks by a month, monthly
  // walks by a year, and December rolls over into January of the next year.
  function walk(step: number) {
    if (period !== "weekly") {
      setYear(year + step);
      return;
    }

    const nextMonth = month + step;

    if (nextMonth < 1) {
      setMonth(12);
      setYear(year - 1);
    } else if (nextMonth > 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(nextMonth);
    }
  }

  // Coming back from the yearly view should land on today again, not on the
  // month somebody walked away to three views ago.
  function choosePeriod(next: ProgressPeriod) {
    setPeriod(next);
    setYear(thisYear);
    setMonth(thisMonth);
  }

  return {
    period: period,
    year: year,
    month: month,
    canWalk: canWalk,
    isAtToday: isAtToday,
    walk: walk,
    choosePeriod: choosePeriod,
  };
}

// What usePeriodPicker gives back. The chart passes it straight to the
// buttons below without touching it.
export type PeriodPicker = ReturnType<typeof usePeriodPicker>;

// The buttons themselves: the three periods on the left, and the arrows
// that walk through the months or the years on the right.
//
// title is the sentence the server sent back for the stretch of time we are
// on ("July 2026", "2026"), written between the two arrows.
export function PeriodPickerButtons(props: {
  picker: PeriodPicker;
  title: string;
}) {
  const picker = props.picker;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The three widths of a bar. */}
      <div className="flex items-center gap-0.5 rounded-full bg-muted p-0.5">
        {PERIODS.map((item) => (
          <button
            key={item.period}
            type="button"
            onClick={() => picker.choosePeriod(item.period)}
            aria-pressed={picker.period === item.period}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              picker.period === item.period
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Which month, or which year, we are looking at. The yearly view
          covers everything at once, so it has nothing to walk to. */}
      {picker.canWalk ? (
        <div className="flex items-center gap-1 rounded-full border border-border/70 px-1 py-0.5">
          <button
            type="button"
            onClick={() => picker.walk(-1)}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-24 text-center text-sm font-semibold">
            {props.title}
          </span>
          <button
            type="button"
            onClick={() => picker.walk(1)}
            disabled={picker.isAtToday}
            className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
