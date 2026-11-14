import { cn } from "@/lib/utils";

// The small "active / inactive" mark used by the employees, the departments,
// the teams, the roles and the organizations.
//
// It is a coloured dot with the word next to it instead of a filled badge:
// in a compact table a row already carries a name, a status and sometimes a
// second badge, and filled badges everywhere quickly turn the list into
// confetti. A dot says the same thing while staying quiet.
export function ActiveStatusPill(props: { status: "active" | "inactive" }) {
  const isActive = props.status === "active";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
        isActive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
        )}
      />
      {props.status}
    </span>
  );
}
