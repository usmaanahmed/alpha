import { Avatar } from "@/components/common/Avatar";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/types/notification.types";

// The word in front of the name.
//
// Every kind of notification is a different action, and calling them all
// "by" would throw that away: a task is GIVEN to somebody, MOVED across the
// board and COMMENTED on, a cheque is ADDED, a leave request is ANSWERED,
// somebody is TAKEN OUT of a team.
function labelOfType(type: NotificationType) {
  if (type === "assigned") {
    return "Assigned by";
  }

  if (type === "reviewed") {
    return "Answered by";
  }

  if (type === "progress") {
    return "Moved by";
  }

  if (type === "comment") {
    return "Commented by";
  }

  if (type === "updated") {
    return "Updated by";
  }

  if (type === "removed") {
    return "Removed by";
  }

  return "Added by";
}

// "Assigned by Ali Khan", the small line under the message.
//
// The message says WHAT happened and this says WHO did it. They used to be
// one sentence ("Ali Khan gave you the task ..."), and splitting them means
// the eye can find the name in the same place on every line, in the toast,
// in the bell menu and on the notifications page.
//
// Nothing is drawn when the name is missing: old notifications, written
// before this line existed, have no name saved on them.
export function NotificationBy(props: {
  type: NotificationType;
  actorName: string;
  actorPhoto: string;
  className?: string;
}) {
  if (!props.actorName) {
    return null;
  }

  // A <span> and not a <p>, because this line is also drawn inside the
  // description of a toast, and a paragraph is not allowed to live there.
  // "inline-flex" still lets it lay the picture and the words in a row.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-muted-foreground",
        props.className
      )}
    >
      {/* The face. It is the smallest size we have on purpose: this line
          sits under the message and must stay quieter than it. */}
      <Avatar name={props.actorName} photo={props.actorPhoto} size="xs" />

      <span className="truncate">
        {labelOfType(props.type)}{" "}
        <span className="font-medium">{props.actorName}</span>
      </span>
    </span>
  );
}
