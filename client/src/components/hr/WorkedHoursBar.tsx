import { FULL_WORK_DAY_HOURS } from "@/lib/attendanceStatus";
import { cn } from "@/lib/utils";

// The hours of one day, written as a number with a small bar under it.
//
// The bar is full when the person worked a whole day of 8 hours, so a short
// day is seen at once without reading the number.
export function WorkedHoursBar(props: { hours: number }) {
  if (!props.hours) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  const percent = Math.min(
    100,
    Math.round((props.hours / FULL_WORK_DAY_HOURS) * 100)
  );

  // A day under half a normal day is orange, so it stands out a little.
  const isShortDay = props.hours < FULL_WORK_DAY_HOURS / 2;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium tabular-nums">
        {props.hours + "h"}
      </span>
      <div className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isShortDay ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: percent + "%" }}
        />
      </div>
    </div>
  );
}
