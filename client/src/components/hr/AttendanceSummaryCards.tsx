import { Card } from "@/components/ui/card";
import {
  ATTENDANCE_STATUS_LOOK,
  ATTENDANCE_STATUS_ORDER,
} from "@/lib/attendanceStatus";
import { cn } from "@/lib/utils";
import type { Attendance, AttendanceStatus } from "@/types/hr.types";

// The row of small tiles that counts how many days (or how many people)
// are in every status.
//
// It is used on both attendance pages: on the employee page it counts the
// days of one month, on the HR page it counts the people of one day.
//
// When onSelect is given, every tile becomes a button that filters the list
// under it, and selected says which one is pressed right now. Passing
// nothing turns the tiles back into plain numbers.
export function AttendanceSummaryCards(props: {
  data: Attendance[];
  extraTile?: { label: string; value: number };
  selected?: AttendanceStatus | "all";
  onSelect?: (status: AttendanceStatus | "all") => void;
}) {
  // Count how many rows every status has.
  const counts = ATTENDANCE_STATUS_ORDER.map((status) => ({
    status: status,
    count: props.data.filter((row) => row.status === status).length,
  }));

  const canFilter = props.onSelect !== undefined;

  // There is always the total plus the five statuses, and the HR page adds
  // one tile more. The grid gets exactly that many columns on a wide
  // screen, so no tile is left alone on a second line.
  const columnsClass = props.extraTile ? "lg:grid-cols-7" : "lg:grid-cols-6";

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3", columnsClass)}>
      {/* The first tile is the total, and pressing it clears the filter. */}
      <SummaryTile
        label="Total"
        value={props.data.length}
        dotClass="bg-muted-foreground"
        isActive={props.selected === "all"}
        canFilter={canFilter}
        onClick={() => props.onSelect?.("all")}
      />

      {counts.map((row) => {
        const look = ATTENDANCE_STATUS_LOOK[row.status];

        return (
          <SummaryTile
            key={row.status}
            label={look.label}
            value={row.count}
            dotClass={look.solid}
            isActive={props.selected === row.status}
            canFilter={canFilter}
            onClick={() => props.onSelect?.(row.status)}
          />
        );
      })}

      {/* The HR page adds one more tile here: the people with no row at all. */}
      {props.extraTile ? (
        <SummaryTile
          label={props.extraTile.label}
          value={props.extraTile.value}
          dotClass="bg-border"
          isActive={false}
          canFilter={false}
          onClick={() => {}}
        />
      ) : null}
    </div>
  );
}

// One tile. It is a <button> only when the tiles can filter, because a
// button that does nothing is confusing for somebody using a keyboard.
function SummaryTile(props: {
  label: string;
  value: number;
  dotClass: string;
  isActive: boolean;
  canFilter: boolean;
  onClick: () => void;
}) {
  const card = (
    <Card
      className={cn(
        "gap-0 px-4 py-3 transition-colors",
        props.canFilter && "hover:border-primary/50",
        props.isActive && "border-primary bg-accent"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", props.dotClass)} />
        <span className="truncate text-xs text-muted-foreground">
          {props.label}
        </span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{props.value}</p>
    </Card>
  );

  if (!props.canFilter) {
    return card;
  }

  return (
    <button type="button" className="text-left" onClick={props.onClick}>
      {card}
    </button>
  );
}
