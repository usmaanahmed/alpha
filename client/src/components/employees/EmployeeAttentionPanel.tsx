import { Link } from "react-router-dom";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { TILE, TileGlow, TileHeader } from "./EmployeeTile";
import { Avatar } from "@/components/common/Avatar";
import type { AttentionItem } from "./employeeAnalytics";

// How many lines the panel writes before it stops. A list longer than this is
// not a list any more, it is a page of its own.
const MAX_ITEMS = 14;

// The icon and the colours of each tone. Red is something that is already
// wrong, amber is something that will be wrong if nobody touches it, and grey
// is worth knowing without being a problem.
function toneLook(tone: "danger" | "warning" | "info") {
  if (tone === "danger") {
    return {
      icon: <CircleAlert className="h-4 w-4" />,
      className:
        "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    };
  }

  if (tone === "warning") {
    return {
      icon: <TriangleAlert className="h-4 w-4" />,
      className:
        "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    };
  }

  return {
    icon: <Info className="h-4 w-4" />,
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  };
}

// What needs somebody to look at it, person by person.
//
// This is the one tile of the page that draws no chart, because "three people
// are carrying late work" is a sentence and not a shape. Every line here comes
// from a number that is also somewhere on a chart above, so the panel never
// tells the reader something the rest of the page cannot show them.
//
// The loudest lines come first: what is already wrong, then what will be wrong
// if nobody touches it, then what is only worth knowing. Every line opens the
// person it is about, because a problem you cannot click on is a problem you
// have to go and hunt for.
export function EmployeeAttentionPanel(props: {
  items: AttentionItem[];
  employeesPath: string;
}) {
  const shown = props.items.slice(0, MAX_ITEMS);
  const hidden = props.items.length - shown.length;

  const danger = props.items.filter((item) => item.tone === "danger").length;

  return (
    <div className={TILE}>
      <TileGlow className="bg-rose-500/15" />

      <TileHeader
        title="Needs a look"
        subtitle={
          props.items.length === 0
            ? "Everybody is where they should be."
            : props.items.length +
              (props.items.length === 1 ? " thing" : " things") +
              " across your people, the loudest first."
        }
        right={
          danger > 0 ? (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
              {danger} urgent
            </span>
          ) : null
        }
      />

      {props.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CircleCheck className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium">Nothing is waiting on anybody</p>
          <p className="max-w-xs text-sm text-muted-foreground">
            No late work, no unanswered leave request, and everybody has a
            department and a team.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-2">
          {shown.map((item) => {
            const look = toneLook(item.tone);

            return (
              <Link
                key={item.key}
                to={props.employeesPath + "/" + item.employeeId}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60"
              >
                <span
                  className={
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg " +
                    look.className
                  }
                >
                  {look.icon}
                </span>

                <p className="min-w-0 flex-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 align-middle font-semibold">
                    <Avatar name={item.name} photo={item.photo} size="xs" />
                    {item.name}
                  </span>{" "}
                  <span className="text-muted-foreground">{item.text}</span>
                </p>
              </Link>
            );
          })}

          {hidden > 0 ? (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              and {hidden} more.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
