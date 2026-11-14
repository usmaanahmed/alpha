import { Avatar } from "@/components/common/Avatar";
import type { AvatarSize } from "@/components/common/Avatar";
import { cn } from "@/lib/utils";

// A picture and a name on ONE line, for a table cell, a dropdown line, or
// the middle of a sentence.
//
// EmployeeAvatar puts the name above a small grey subtitle and takes two
// lines. This one stays flat, so it fits where there is no room for that.
//
// The organization account is not an employee and has no picture, so it is
// simply passed here as the name "Organization" with an empty photo, and
// the grey circle with the "O" is drawn for it like for anybody else.
export function PersonInline(props: {
  name: string;
  photo: string;
  size?: AvatarSize;
  // A small grey word right after the name, for example "Manager".
  note?: string;
  // Extra classes for the text, used when a line must be small or muted.
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-1.5", props.className)}>
      <Avatar name={props.name} photo={props.photo} size={props.size || "sm"} />

      <span className={cn("truncate", props.textClassName)}>{props.name}</span>

      {props.note ? (
        <span className="shrink-0 text-xs text-muted-foreground">
          {props.note}
        </span>
      ) : null}
    </span>
  );
}
