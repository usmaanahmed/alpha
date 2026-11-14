import { CalendarOff, Wallet, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cardColorAt } from "@/lib/leaveStatus";
import type { LeaveBalance } from "@/types/hr.types";

// One card per leave type, showing how many days are left inside a round
// progress ring.
//
// Every card takes its colour from its place in the grid, so the same leave
// type always keeps the same colour on the page.
export function LeaveBalanceCards(props: {
  data: LeaveBalance[];
  isLoading: boolean;
}) {
  if (props.isLoading) {
    // Four grey boxes that breathe while we wait. They have the same size
    // as the real cards, so nothing jumps when the data arrives.
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((box) => (
          <div
            key={box}
            className="h-36 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (props.data.length === 0) {
    return (
      <Card className="items-center gap-3 border-dashed py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CalendarOff className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No leave type yet</p>
          <p className="text-sm text-muted-foreground">
            Your HR must add one before you can apply.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {props.data.map((balance, index) => {
        const color = cardColorAt(index);

        // Dividing by zero gives NaN, so a type with 0 days shows an
        // empty ring instead.
        const usedPercent =
          balance.allocated > 0
            ? Math.round((balance.used / balance.allocated) * 100)
            : 0;

        return (
          <Card
            key={balance._id}
            className="group relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
          >
            {/* A soft light in the top corner that gives the card the
                colour of its leave type. */}
            <div
              className={
                "pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-linear-to-br to-transparent blur-2xl " +
                color.glow
              }
            />

            <div className="relative flex items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" title={balance.leaveType.name}>
                  {balance.leaveType.name}
                </p>

                <span
                  className={
                    "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                    (balance.leaveType.isPaid
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-slate-500/10 text-slate-700 dark:text-slate-400")
                  }
                >
                  {balance.leaveType.isPaid ? (
                    <Wallet className="h-3 w-3" />
                  ) : (
                    <Gift className="h-3 w-3" />
                  )}
                  {balance.leaveType.isPaid ? "Paid" : "Unpaid"}
                </span>

                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {balance.remaining}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {"/ " + balance.allocated + " days"}
                  </span>
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {balance.used + " used in " + balance.year}
                </p>
              </div>

              <BalanceRing percent={usedPercent} ringClass={color.ring} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// The round progress ring of one card, drawn the same way as the one on the
// attendance card: two circles on top of each other, and strokeDashoffset
// hides the part of the coloured one we do not want to see.
function BalanceRing(props: { percent: number; ringClass: string }) {
  const radius = 26;
  const circleLength = 2 * Math.PI * radius;
  const hiddenLength = circleLength - (props.percent / 100) * circleLength;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          className="stroke-muted"
        />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circleLength}
          strokeDashoffset={hiddenLength}
          className={"transition-all duration-700 " + props.ringClass}
        />
      </svg>

      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
        {props.percent + "%"}
      </span>
    </div>
  );
}
