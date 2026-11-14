import { Avatar } from "@/components/common/Avatar";
import { cn } from "@/lib/utils";

// A very small "avatar plus name" used inside the squares of the calendar,
// where a whole EmployeeAvatar would be far too big.
//
// The colour classes come from the status of the day, so a chip inside a
// red square is red and one inside a green square is green.
export function PersonChip(props: {
  name: string;
  photo: string;
  colorClass: string;
  title?: string;
}) {
  return (
    <span
      title={props.title || props.name}
      className={cn(
        "flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5",
        props.colorClass
      )}
    >
      {/* The chip already has a coloured background, so the circle drops
          its own border and uses a pale version of that colour instead. */}
      <Avatar
        name={props.name}
        photo={props.photo}
        size="xs"
        className="border-0 bg-background/70 font-semibold"
      />

      <span className="truncate text-[11px] font-medium">{props.name}</span>
    </span>
  );
}
