import { Card } from "@/components/ui/card";
import { cardColorAt } from "@/lib/leaveStatus";
import type { LeaveBalance } from "@/types/hr.types";

// The row of donut cards at the top of the snapshot: "All Leaves", then one
// card per leave type, each showing how many days are left inside a ring.
//
// The first card sums up every leave type, so a person sees the whole year
// at a glance; the cards after it are the real leave types, in the order the
// server sent them.
export function EmployeeLeaveDonuts(props: {
  data: LeaveBalance[];
  isLoading: boolean;
}) {
  if (props.isLoading) {
    // Four grey boxes that breathe while we wait, the same size as the real
    // cards so nothing jumps when the data arrives.
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((box) => (
          <div
            key={box}
            className="h-40 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  // Add up every type for the "All Leaves" card.
  let totalAllocated = 0;
  let totalRemaining = 0;
  for (const balance of props.data) {
    totalAllocated = totalAllocated + balance.allocated;
    totalRemaining = totalRemaining + balance.remaining;
  }

  // We show the "All" card first, then the first three leave types, so the
  // row stays at four cards like the snapshot.
  const firstThree = props.data.slice(0, 3);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* The "All Leaves" card, drawn in the app's indigo so it stands out
          as the summary of the three that follow. */}
      <DonutCard
        title="All Leaves"
        remaining={totalRemaining}
        allocated={totalAllocated}
        ringClass="stroke-primary"
        emphasised={true}
      />

      {firstThree.map((balance, index) => (
        <DonutCard
          key={balance._id}
          title={balance.leaveType.name}
          remaining={balance.remaining}
          allocated={balance.allocated}
          ringClass={cardColorAt(index).ring}
          emphasised={false}
        />
      ))}

      {/* When the organization has fewer than three leave types, fill the
          empty spots with a soft dashed box so the row keeps its shape. */}
      {Array.from({ length: Math.max(0, 3 - firstThree.length) }).map(
        (_, index) => (
          <Card
            key={"empty-" + index}
            className="items-center justify-center border-dashed py-0 text-center text-xs text-muted-foreground"
          >
            No leave type
          </Card>
        )
      )}
    </div>
  );
}

// One donut card: a title, a ring, and the "left / total" number in the
// middle. The ring fills up with the part of the days that are still free.
function DonutCard(props: {
  title: string;
  remaining: number;
  allocated: number;
  ringClass: string;
  emphasised: boolean;
}) {
  // Dividing by zero gives NaN, so a type with 0 days shows an empty ring.
  const percent =
    props.allocated > 0
      ? Math.round((props.remaining / props.allocated) * 100)
      : 0;

  return (
    <Card className="items-center gap-3 py-5 text-center">
      <p className="text-sm font-medium text-muted-foreground">{props.title}</p>

      <DonutRing
        percent={percent}
        ringClass={props.ringClass}
        centerTop={props.remaining + " / " + props.allocated}
        emphasised={props.emphasised}
      />
    </Card>
  );
}

// The ring itself: two circles on top of each other, and strokeDashoffset
// hides the part of the coloured one we do not want to see. This is the same
// trick the leave balance cards use, kept here so this card can stand alone.
function DonutRing(props: {
  percent: number;
  ringClass: string;
  centerTop: string;
  emphasised: boolean;
}) {
  const radius = 34;
  const circleLength = 2 * Math.PI * radius;
  const hiddenLength = circleLength - (props.percent / 100) * circleLength;

  return (
    <div className="relative h-24 w-24">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 88 88">
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-muted"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circleLength}
          strokeDashoffset={hiddenLength}
          className={"transition-all duration-700 " + props.ringClass}
        />
      </svg>

      {/* The number in the hole of the ring. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-semibold tabular-nums">
          {props.centerTop}
        </span>
        <span className="text-[11px] text-muted-foreground">Days</span>
      </div>
    </div>
  );
}
