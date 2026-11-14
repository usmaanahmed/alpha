import { getPhotoUrl, getInitials } from "@/lib/photo";
import { cn } from "@/lib/utils";

// The round picture of one person, and nothing else.
//
// This is the one place in the whole app that decides how a picture looks.
// When the person has no picture we draw a grey circle with the first
// letters of the name, so a row never changes height because somebody
// forgot to upload a photo.
//
// Four sizes are enough for every screen we have:
// - xs -> inside a calendar square or a small chip
// - sm -> inside a table cell, a dropdown line, a sentence
// - md -> the normal one, used next to a name and a subtitle
// - lg -> the big one at the top of the employee detail page
export type AvatarSize = "xs" | "sm" | "md" | "lg";

// The classes of every size, written out one by one so it is easy to read
// and easy to change one size without touching the others.
const SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-20 w-20 text-xl",
};

export function Avatar(props: {
  name: string;
  photo: string;
  size?: AvatarSize;
  // Extra classes, used when a chip wants its own background colour.
  className?: string;
}) {
  const size = props.size || "md";
  const sizeClass = SIZE_CLASS[size];
  const photoUrl = getPhotoUrl(props.photo);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={props.name}
        title={props.name}
        className={cn(
          "shrink-0 rounded-full border object-cover",
          sizeClass,
          props.className
        )}
      />
    );
  }

  return (
    <span
      title={props.name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border bg-muted font-medium text-muted-foreground",
        sizeClass,
        props.className
      )}
    >
      {getInitials(props.name)}
    </span>
  );
}
