import {
  CalendarClock,
  CalendarDays,
  AlarmClock,
  Hourglass,
  AlertTriangle,
} from "lucide-react";
import { ChequeStatusBadge } from "./ChequeStatusBadge";
import {
  formatMoney,
  formatChequeDate,
  getChequeTypeLabel,
} from "@/types/cheque.types";
import { cn } from "@/lib/utils";
import type { Cheque, ChequeReminders as Reminders } from "@/types/cheque.types";

// The colour of a reminder group. Each tone styles the icon circle, the count
// pill and the little strip on the left of every row.
type Tone = "red" | "amber" | "indigo" | "sky";

const toneClasses: Record<Tone, { icon: string; pill: string; strip: string }> = {
  red: {
    icon: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    pill: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    strip: "bg-red-500",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    pill: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    strip: "bg-amber-500",
  },
  indigo: {
    icon: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    pill: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
    strip: "bg-indigo-500",
  },
  sky: {
    icon: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
    pill: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    strip: "bg-sky-500",
  },
};

// One row inside a reminder card. Clicking it opens the cheque details.
function ReminderRow(props: {
  cheque: Cheque;
  strip: string;
  onSelect: (cheque: Cheque) => void;
}) {
  const cheque = props.cheque;

  return (
    <button
      type="button"
      onClick={() => props.onSelect(cheque)}
      className="relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-lg border bg-card px-3 py-2 pl-4 text-left text-sm transition-colors hover:bg-accent/50"
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", props.strip)} />

      <div className="min-w-0">
        <p className="truncate font-medium">
          #{cheque.chequeNumber} · {cheque.bank}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {getChequeTypeLabel(cheque.type)}
          {cheque.partyName ? " · " + cheque.partyName : ""} · Due{" "}
          {formatChequeDate(cheque.dueDate)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono font-medium">{formatMoney(cheque.amount)}</span>
        <ChequeStatusBadge status={cheque.status} />
      </div>
    </button>
  );
}

// One reminder group: a titled card that lists the cheques inside it. When the
// group is empty we still show the card with a short "nothing here" line, so
// the user can trust that the module really looked.
function ReminderGroup(props: {
  title: string;
  icon: React.ReactNode;
  tone: Tone;
  cheques: Cheque[];
  emptyText: string;
  onSelect: (cheque: Cheque) => void;
}) {
  const tone = toneClasses[props.tone];

  return (
    // "min-w-0" is what lets this card be narrower than the longest cheque
    // line inside it. A grid cell refuses to shrink below its content by
    // default, and the lines below never wrap (they truncate), so without
    // this the card would push the whole page wider than a phone screen.
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              tone.icon
            )}
          >
            {props.icon}
          </span>
          <p className="text-sm font-semibold">{props.title}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            tone.pill
          )}
        >
          {props.cheques.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {props.cheques.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{props.emptyText}</p>
        ) : (
          props.cheques.map((cheque) => (
            <ReminderRow
              key={cheque._id}
              cheque={cheque}
              strip={tone.strip}
              onSelect={props.onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

// The five reminder groups the module supports.
export function ChequeReminders(props: {
  reminders: Reminders;
  onSelect: (cheque: Cheque) => void;
}) {
  const r = props.reminders;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReminderGroup
        title="Overdue"
        tone="red"
        icon={<AlertTriangle className="h-4 w-4" />}
        cheques={r.overdue}
        emptyText="No overdue cheque. Well done."
        onSelect={props.onSelect}
      />
      <ReminderGroup
        title="Due Today"
        tone="amber"
        icon={<AlarmClock className="h-4 w-4" />}
        cheques={r.dueToday}
        emptyText="Nothing is due today."
        onSelect={props.onSelect}
      />
      <ReminderGroup
        title="Due Tomorrow"
        tone="indigo"
        icon={<CalendarDays className="h-4 w-4" />}
        cheques={r.dueTomorrow}
        emptyText="Nothing is due tomorrow."
        onSelect={props.onSelect}
      />
      <ReminderGroup
        title="Pending Clearance"
        tone="sky"
        icon={<Hourglass className="h-4 w-4" />}
        cheques={r.pendingClearance}
        emptyText="No cheque is waiting at the bank."
        onSelect={props.onSelect}
      />
      <ReminderGroup
        title="Bounce Alerts"
        tone="red"
        icon={<CalendarClock className="h-4 w-4" />}
        cheques={r.bounceAlert}
        emptyText="No bounced cheque needs attention."
        onSelect={props.onSelect}
      />
    </div>
  );
}
