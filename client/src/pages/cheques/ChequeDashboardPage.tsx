import { Link, useNavigate } from "react-router-dom";
import { Landmark, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChequeSummaryCards } from "@/components/cheques/ChequeSummaryCards";
import { ChequeReminders } from "@/components/cheques/ChequeReminders";
import { useCheques } from "@/hooks/useCheques";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { getModuleBase } from "@/types/auth.types";
import {
  buildChequeSummary,
  buildChequeReminders,
  formatMoney,
} from "@/types/cheque.types";

// The finance dashboard: a cheque-themed hero on top, then the eight summary
// numbers, then the five reminder groups. Clicking a reminder takes the user
// to the cheque list to act on it.
export function ChequeDashboardPage() {
  // The reminders are a card of their own on the switch board of the SaaS
  // owner, so the finance dashboard can be sold without them.
  const navigate = useNavigate();
  const { user, hasFeature } = useAuth();
  const chequesQuery = useCheques();

  // The organization account and an employee with the cheque permissions open
  // this very same page, only under a different address, so the two links
  // below have to be built and not written by hand.
  const chequeListPath = getModuleBase(user?.role) + "/cheques";

  const cheques = chequesQuery.data || [];
  const summary = buildChequeSummary(cheques);
  const reminders = buildChequeReminders(cheques);

  return (
    <div className="flex flex-col gap-6">
      {/* --- The hero banner, styled like a cheque --- */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-600 to-violet-700 p-4 text-white shadow-md sm:p-6 lg:p-8">
        {/* The faint diagonal security lines, like on a real cheque. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 1px, transparent 8px)",
          }}
        />
        <Landmark
          className="pointer-events-none absolute -right-6 -bottom-8 h-48 w-48 text-white/10"
          strokeWidth={1}
        />

        <div className="relative flex flex-wrap items-end justify-between gap-4 sm:gap-6">
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-100">Finance</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Cheque Dashboard
            </h1>
            <p className="mt-1 max-w-md text-sm text-indigo-100">
              The health of your cheques at a glance, and what needs your
              attention today.
            </p>
            <Button
              asChild
              variant="secondary"
              className="mt-4 bg-white text-indigo-700 hover:bg-indigo-50"
            >
              <Link to={chequeListPath}>Manage cheques</Link>
            </Button>
          </div>

          {/* The two money figures, in glassy chips. On a phone they share
              the width of the line instead of hanging off the edge. */}
          <div className="flex w-full gap-3 sm:w-auto">
            <div className="min-w-0 flex-1 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm sm:flex-none">
              <div className="flex items-center gap-2 text-indigo-100">
                <ArrowDownCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Receivable</span>
              </div>
              <p className="mt-1 font-mono text-xl font-semibold">
                {formatMoney(summary.receivable)}
              </p>
            </div>
            <div className="min-w-0 flex-1 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm sm:flex-none">
              <div className="flex items-center gap-2 text-indigo-100">
                <ArrowUpCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Payable</span>
              </div>
              <p className="mt-1 font-mono text-xl font-semibold">
                {formatMoney(summary.payable)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <ChequeSummaryCards summary={summary} />

      {hasFeature(FEATURES.CHEQUES_REMINDERS) ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Reminders</h2>
          <ChequeReminders
            reminders={reminders}
            // The dashboard is read-only, so a click sends the user to the list
            // where all the actions live.
            onSelect={() => navigate(chequeListPath)}
          />
        </div>
      ) : null}
    </div>
  );
}
