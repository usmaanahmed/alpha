import { Avatar } from "@/components/common/Avatar";
import type { AvatarSize } from "@/components/common/Avatar";

// The round picture of one person, with the name next to it and a small
// grey line under the name (the designation, the department...).
//
// This is the two line version, used in table cells and in the header of a
// dialog. When there is no room for two lines, use PersonInline instead.
export function EmployeeAvatar(props: {
  name: string;
  photo: string;
  // A small grey line under the name, for example the designation.
  subtitle?: string;
  size?: AvatarSize;
}) {
  return (
    <div className="flex items-center gap-2">
      <Avatar name={props.name} photo={props.photo} size={props.size || "md"} />

      <div className="min-w-0">
        <p className="truncate font-medium">{props.name}</p>
        {props.subtitle ? (
          <p className="truncate text-xs text-muted-foreground">
            {props.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
