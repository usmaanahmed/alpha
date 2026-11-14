import { Landmark, PenLine } from "lucide-react";
import {
  formatMoney,
  formatChequeDate,
  amountToWords,
  getPartyTypeLabel,
  getChequeStatusLabel,
} from "@/types/cheque.types";
import { cn } from "@/lib/utils";
import type { Cheque } from "@/types/cheque.types";

// The colours of the diagonal "stamp" drawn across the cheque. Every status
// gets its own colour, so a cheque tells its story at a glance.
function getStampClasses(status: Cheque["status"]) {
  if (status === "cleared" || status === "received") {
    return "text-emerald-600 border-emerald-500/70 dark:text-emerald-400";
  }
  if (status === "deposited") {
    return "text-sky-600 border-sky-500/70 dark:text-sky-400";
  }
  if (status === "bounced") {
    return "text-red-600 border-red-500/70 dark:text-red-400";
  }
  if (status === "returned") {
    return "text-amber-600 border-amber-500/70 dark:text-amber-400";
  }
  if (status === "issued") {
    return "text-indigo-600 border-indigo-500/70 dark:text-indigo-400";
  }
  // draft, cancelled, expired: a plain grey stamp.
  return "text-slate-500 border-slate-400/70 dark:text-slate-400";
}

// A cheque drawn to look like the real paper thing: the bank on top, the
// "pay to the order of" line in the middle, the amount in a box, the amount
// written in words, a signature line, and the funny bank code at the bottom.
//
// - a "received" cheque has a green edge (money coming in),
// - an "issued" cheque has an indigo edge (money going out).
//
// compact makes a smaller version for the grid of cards; the big version is
// shown inside the details dialog.
export function ChequeVisual(props: { cheque: Cheque; compact?: boolean }) {
  const cheque = props.cheque;
  const compact = props.compact === true;

  const isReceived = cheque.type === "received";
  const edgeColor = isReceived ? "bg-emerald-500" : "bg-indigo-500";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-300 bg-linear-to-br from-slate-50 to-indigo-50 text-slate-800 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100",
        compact ? "p-4" : "p-6"
      )}
    >
      {/* The coloured edge on the left says if the money comes in or goes out. */}
      <span className={cn("absolute inset-y-0 left-0 w-1.5", edgeColor)} />

      {/* A faint security pattern of thin diagonal lines, like a real cheque. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 7px)",
        }}
      />

      {/* A big watermark bank icon in the corner. */}
      <Landmark
        className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 text-indigo-500/10 dark:text-indigo-300/10"
        strokeWidth={1}
      />

      {/* The diagonal status stamp. */}
      <div
        className={cn(
          "pointer-events-none absolute select-none rounded-md border-2 font-bold uppercase tracking-widest opacity-80",
          getStampClasses(cheque.status),
          compact
            ? "top-1/2 right-3 -translate-y-1/2 -rotate-12 px-2 py-0.5 text-[0.6rem]"
            : "top-8 right-8 -rotate-12 px-3 py-1 text-sm"
        )}
      >
        {getChequeStatusLabel(cheque.status)}
      </div>

      {/* Everything sits above the pattern and the watermark. */}
      <div className="relative pl-2">
        {/* --- Top: the bank and the cheque number --- */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <Landmark className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </span>
            <div className="min-w-0">
              <p
                className={cn(
                  "truncate font-semibold tracking-tight",
                  compact ? "text-sm" : "text-lg"
                )}
              >
                {cheque.bank}
              </p>
              {cheque.bankAccount ? (
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  A/C {cheque.bankAccount}
                </p>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[0.6rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Cheque No.
            </p>
            <p className="font-mono text-sm font-semibold">{cheque.chequeNumber}</p>
            <p className="mt-1 text-[0.6rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Date
            </p>
            <p className="font-mono text-xs">{formatChequeDate(cheque.chequeDate)}</p>
          </div>
        </div>

        {/* --- Middle: pay to the order of + the amount box --- */}
        <div className="mt-5 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pay to the order of
            </p>
            <p
              className={cn(
                "truncate border-b border-dashed border-slate-400/70 pb-0.5 font-medium dark:border-slate-500/70",
                compact ? "text-sm" : "text-base"
              )}
            >
              {cheque.partyName || "—"}
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                ({getPartyTypeLabel(cheque.partyType)})
              </span>
            </p>
          </div>

          <div className="shrink-0 rounded-md border-2 border-slate-400/70 bg-white/60 px-2.5 py-1 dark:border-slate-500/70 dark:bg-slate-950/40">
            <span
              className={cn(
                "font-mono font-bold",
                compact ? "text-sm" : "text-lg"
              )}
            >
              {formatMoney(cheque.amount)}
            </span>
          </div>
        </div>

        {/* The amount in words, only on the big cheque. */}
        {!compact ? (
          <p className="mt-3 truncate text-sm italic text-slate-600 dark:text-slate-300">
            {amountToWords(cheque.amount)}
          </p>
        ) : null}

        {/* --- Bottom: the memo and the signature --- */}
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.6rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Memo
            </p>
            <p className="max-w-52 truncate text-xs text-slate-600 dark:text-slate-300">
              {cheque.description || "—"}
            </p>
          </div>

          <div className="shrink-0 text-center">
            <PenLine className="mx-auto mb-0.5 h-4 w-4 text-slate-400" />
            <div className="w-28 border-t border-slate-400/70 pt-0.5 dark:border-slate-500/70">
              <p className="text-[0.6rem] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Authorised signature
              </p>
            </div>
          </div>
        </div>

        {/* The MICR line: the funny magnetic code at the bottom of a cheque.
            It is only decoration here, but it makes the drawing feel real.
            Hidden on the small cards to keep them tidy. */}
        {!compact ? (
          <p className="mt-4 truncate font-mono text-sm tracking-[0.2em] text-slate-500 dark:text-slate-400">
            ⑈{cheque.chequeNumber}⑈ {cheque.bankAccount || "000000000"}⑆
          </p>
        ) : null}
      </div>
    </div>
  );
}
