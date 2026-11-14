import { UserPlus, Repeat2 } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import { PersonInline } from "@/components/common/PersonInline";
import type { Task } from "@/types/task.types";
import { getAssignmentHistory, formatDateTime } from "@/types/task.types";

// The whole life of a task in one column, oldest first:
// who received it, on which day and at which hour, who gave it, and the
// reason the task moved.
//
// The first line is the moment the task was created, so it has no reason
// and gets its own icon. Every line after it is a reassignment.
export function TaskAssignmentTimeline(props: { task: Task }) {
  const history = getAssignmentHistory(props.task);

  // Tasks that already existed before this feature have no timeline.
  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This task has no assignment history yet.
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {history.map((entry, index) => {
        const isFirst = index === 0;
        const isLast = index === history.length - 1;

        // "who did it": the organization account is not an employee, so it
        // has neither a name nor a picture of its own.
        const doneByName =
          entry.byType === "organization"
            ? "Organization"
            : entry.byEmployee?.name || "A manager";
        const doneByPhoto =
          entry.byType === "organization" ? "" : entry.byEmployee?.photo || "";

        return (
          <li key={entry._id} className="flex gap-3">
            {/* The dot of this line, and the line going down to the next
                one. The last line has no tail, so the column stops there. */}
            <div className="flex flex-col items-center">
              <span
                className={
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full " +
                  (isFirst
                    ? "bg-muted text-muted-foreground"
                    : "bg-violet-500/10 text-violet-700 dark:text-violet-400")
                }
              >
                {isFirst ? (
                  <UserPlus className="h-3 w-3" />
                ) : (
                  <Repeat2 className="h-3 w-3" />
                )}
              </span>

              {!isLast ? <span className="w-px flex-1 bg-border" /> : null}
            </div>

            <div className={"flex flex-col gap-1 " + (isLast ? "" : "pb-4")}>
              {/* The person who received the task on this line. */}
              <div className="flex items-center gap-2">
                <Avatar
                  name={entry.employee?.name || "Employee removed"}
                  photo={entry.employee?.photo || ""}
                  size="sm"
                />
                <span className="text-sm font-medium">
                  {entry.employee?.name || "Employee removed"}
                </span>
                {isLast ? (
                  <span className="text-xs font-normal text-muted-foreground">
                    (has it now)
                  </span>
                ) : null}
              </div>

              {/* The person who made the move, with their picture too. */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>{isFirst ? "Assigned by" : "Reassigned by"}</span>
                <PersonInline
                  name={doneByName}
                  photo={doneByPhoto}
                  size="xs"
                  textClassName="text-xs"
                />
                <span>· {formatDateTime(entry.at)}</span>
              </div>

              {entry.reason ? (
                <p className="mt-1 border-l-2 border-violet-500/30 pl-2 text-xs text-muted-foreground italic">
                  {entry.reason}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
