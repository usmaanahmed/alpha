import {
  Layers,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
} from "lucide-react";
import { formatMoney } from "@/types/cheque.types";
import { cn } from "@/lib/utils";
import type { ChequeSummary } from "@/types/cheque.types";

// The colour "tone" of a tile. Each tone is a set of Tailwind classes for the
// icon badge and the little accent glow, so a tile always looks the same.
type Tone = "slate" | "amber" | "emerald" | "red" | "zinc" | "rose" | "indigo";

const toneClasses: Record<Tone, { badge: string; glow: string }> = {
  slate: {
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
    glow: "from-slate-400/10",
  },
  amber: {
    badge: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    glow: "from-amber-400/15",
  },
  emerald: {
    badge:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    glow: "from-emerald-400/15",
  },
  red: {
    badge: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
    glow: "from-red-400/15",
  },
  zinc: {
    badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-600/30 dark:text-zinc-300",
    glow: "from-zinc-400/10",
  },
  rose: {
    badge: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
    glow: "from-rose-400/15",
  },
  indigo: {
    badge:
      "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
    glow: "from-indigo-400/15",
  },
};

// One tile: an icon in a coloured badge, a big number, and a small hint.
function Tile(props: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: Tone;
  hint?: string;
}) {
  const tone = toneClasses[props.tone];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* A soft colour glow in the top-right corner. */}
      <div
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-linear-to-br to-transparent blur-2xl",
          tone.glow
        )}
      />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">
            {props.title}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {props.value}
          </p>
          {props.hint ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{props.hint}</p>
          ) : null}
        </div>

        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            tone.badge
          )}
        >
          {props.icon}
        </span>
      </div>
    </div>
  );
}

// The eight dashboard tiles, worked out from the cheque list.
export function ChequeSummaryCards(props: { summary: ChequeSummary }) {
  const s = props.summary;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        title="Total Cheques"
        value={String(s.total)}
        tone="slate"
        icon={<Layers className="h-5 w-5" />}
      />
      <Tile
        title="Pending Cheques"
        value={String(s.pending)}
        tone="amber"
        hint="Not cleared or stopped yet"
        icon={<Clock className="h-5 w-5" />}
      />
      <Tile
        title="Cleared Cheques"
        value={String(s.cleared)}
        tone="emerald"
        icon={<CheckCircle2 className="h-5 w-5" />}
      />
      <Tile
        title="Bounced Cheques"
        value={String(s.bounced)}
        tone="red"
        icon={<XCircle className="h-5 w-5" />}
      />
      <Tile
        title="Cancelled Cheques"
        value={String(s.cancelled)}
        tone="zinc"
        icon={<Ban className="h-5 w-5" />}
      />
      <Tile
        title="Total Receivable"
        value={formatMoney(s.receivable)}
        tone="emerald"
        hint="Money still coming in"
        icon={<ArrowDownCircle className="h-5 w-5" />}
      />
      <Tile
        title="Total Payable"
        value={formatMoney(s.payable)}
        tone="rose"
        hint="Money still going out"
        icon={<ArrowUpCircle className="h-5 w-5" />}
      />
      <Tile
        title="Upcoming Due"
        value={String(s.upcomingDue)}
        tone="indigo"
        hint="Due within 7 days"
        icon={<CalendarClock className="h-5 w-5" />}
      />
    </div>
  );
}
