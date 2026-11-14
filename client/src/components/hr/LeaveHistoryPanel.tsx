import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { CalendarRange, PieChart, TrendingUp, History } from "lucide-react";
import { LeaveWarningList } from "@/components/hr/LeaveWarningList";
import { formatDay } from "@/lib/date";
import type {
  LeaveHistory,
  LeavePeriodStats,
  LeaveHistoryCard,
} from "@/types/hr.types";

// The leave story of the employee whose request is open.
//
// The panel answers one question in three sizes: how much leave does this
// person take? All of it, then this year, then this month. After the numbers
// come the habits, which are the part that really changes an answer.

export function LeaveHistoryPanel(props: {
  history: LeaveHistory;
  employeeName: string;
}) {
  const history = props.history;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/* The habits first. An approver who reads nothing else should still
          see "4 requests in the last 3 months". */}
      <LeaveWarningList
        warnings={history.patterns}
        emptyTitle="Nothing unusual in this leave history"
        emptyText={
          props.employeeName +
          " does not take leave more often or for longer than normal."
        }
      />

      <BalanceBar history={history} />

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <MonthlyTrend
          rows={history.year.monthlyTrend}
          yearLabel={history.year.label}
        />
        <TypeDistribution rows={history.year.byLeaveType} />
      </div>

      <StatsBlock
        icon={<History className="h-4 w-4" />}
        title="All time"
        subtitle="Every request this employee ever sent"
        stats={history.overall}
      />

      <StatsBlock
        icon={<CalendarRange className="h-4 w-4" />}
        title={"Leave year " + history.year.label}
        subtitle="The leave that belongs to this year, counted by its first day"
        stats={history.year}
      />

      <StatsBlock
        icon={<CalendarRange className="h-4 w-4" />}
        title={history.month.label}
        subtitle="The requests sent this month"
        stats={history.month}
      />

      <InsightFacts history={history} />
    </div>
  );
}

// How much of the year's allowance is already gone.
//
// One bar with one number over it. It is the single most useful line of this
// whole panel: an employee at 20% of their days in July is a different case
// from one at 95%, and no list of counts says that as fast.
function BalanceBar(props: { history: LeaveHistory }) {
  const balance = props.history.balance;

  if (!balance || balance.allocated === 0) {
    return null;
  }

  // A person can end up over their allowance across leave types, so the bar
  // never draws past its own end.
  const usedWidth = Math.min(balance.utilizationPercent, 100);

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            {"Balance used in " + balance.year}
          </p>
          <p className="text-3xl leading-none font-semibold tabular-nums">
            {balance.utilizationPercent + "%"}
          </p>
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          {balance.used +
            " of " +
            balance.allocated +
            " days used · " +
            balance.remaining +
            " left"}
        </p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <span
          className="block h-full rounded-full bg-sky-500"
          style={{ width: Math.max(usedWidth, 1) + "%" }}
        />
      </div>
    </div>
  );
}

// Twelve months of the year, and the leave days approved in each.
//
// A column per month, because a month is a discrete bucket and the eye
// compares heights along one baseline. There is only one series, so the title
// names it and no legend box is needed.
function MonthlyTrend(props: {
  rows: LeaveHistory["year"]["monthlyTrend"];
  yearLabel: string;
}) {
  const hasAnything = props.rows.some((row) => row.daysApproved > 0);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <TrendingUp className="h-4 w-4" />
        {"Leave days approved per month, " + props.yearLabel}
      </p>

      {!hasAnything ? (
        <p className="text-sm text-muted-foreground">
          No leave has been approved for this employee this year.
        </p>
      ) : (
        // min-w-0 AND overflow-hidden, because a recharts chart is the one
        // thing here that can really run away: it measures the box it is in
        // and draws itself that wide, so a box with no upper limit grows once
        // and never shrinks back when the phone is turned.
        <div className="h-44 w-full min-w-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={props.rows}
              margin={{ top: 8, right: 4, bottom: 0, left: -24 }}
            >
              {/* The grid is there to be measured against, not to be looked
                  at, so only the horizontal lines and only very faint. */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/60"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Tooltip
                content={<TrendTooltip />}
                cursor={{ className: "fill-muted/50" }}
              />
              <Bar
                dataKey="daysApproved"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// The little card that follows the mouse over the chart. It is written the
// same way as the other tooltips of this app, so a chart in a dialog looks
// like a chart on the dashboard.
function TrendTooltip(props: {
  active?: boolean;
  payload?: { payload: { label: string; requests: number; daysApproved: number } }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const row = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold">{row.label}</p>

      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Days approved</span>
        <span className="font-semibold tabular-nums">{row.daysApproved}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Requests</span>
        <span className="font-semibold tabular-nums">{row.requests}</span>
      </p>
    </div>
  );
}

// Which kinds of leave this person takes.
//
// Horizontal bars and not a pie: a pie makes a person compare angles, and
// bars along one edge are read straight off. Every bar carries its own name
// and its own number, so the colour is never doing the work alone.
function TypeDistribution(props: {
  rows: { name: string; requests: number; daysApproved: number }[];
}) {
  const rowsWithDays = props.rows.filter((row) => row.daysApproved > 0);

  const biggest = rowsWithDays.reduce(
    (most, row) => Math.max(most, row.daysApproved),
    0
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        <PieChart className="h-4 w-4" />
        Leave types used this year
      </p>

      {rowsWithDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No leave type has been used this year yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rowsWithDays.map((row) => (
            <li key={row.name}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {row.daysApproved +
                    (row.daysApproved === 1 ? " day · " : " days · ") +
                    row.requests +
                    (row.requests === 1 ? " request" : " requests")}
                </span>
              </div>

              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-violet-500"
                  style={{
                    width:
                      Math.max(
                        Math.round((row.daysApproved / biggest) * 100),
                        2
                      ) + "%",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// One of the three blocks of counts: all time, this year, this month.
function StatsBlock(props: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  stats: LeavePeriodStats;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium">
          {props.icon}
          {props.title}
        </p>
        <p className="text-xs text-muted-foreground">{props.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Tile value={props.stats.requests} label="Requests" dot="bg-slate-400" />
        <Tile
          value={props.stats.approved}
          label="Approved"
          dot="bg-emerald-500"
        />
        <Tile value={props.stats.rejected} label="Rejected" dot="bg-rose-500" />
        <Tile value={props.stats.pending} label="Waiting" dot="bg-amber-500" />
        <Tile
          value={props.stats.cancelled}
          label="Cancelled"
          dot="bg-slate-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Tile value={props.stats.daysRequested} label="Days requested" />
        <Tile value={props.stats.daysApproved} label="Days approved" />
        <Tile value={props.stats.daysRejected} label="Days rejected" />
      </div>
    </div>
  );
}

// One number. The digits wear normal ink and a small coloured dot says which
// count it is, so a row of five tiles stays easy to read.
function Tile(props: { value: number; label: string; dot?: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xl leading-none font-semibold tabular-nums">
        {props.value}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {props.dot ? (
          <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + props.dot} />
        ) : null}
        {props.label}
      </p>
    </div>
  );
}

// The handful of single facts that do not need a chart: the two rates, the
// average, and the last three leaves.
function InsightFacts(props: { history: LeaveHistory }) {
  const insights = props.history.insights;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">In short</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <FactRow
          label="Approval rate"
          value={insights.approvalRate + "%"}
          note="of the requests that were decided"
        />
        <FactRow
          label="Rejection rate"
          value={insights.rejectionRate + "%"}
          note="of the requests that were decided"
        />
        <FactRow
          label="Average length"
          value={
            insights.averageDaysPerRequest +
            (insights.averageDaysPerRequest === 1 ? " day" : " days")
          }
          note="per request"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <LeaveCardRow label="Last leave" card={insights.lastLeave} />
        <LeaveCardRow label="Last approved" card={insights.lastApproved} />
        <LeaveCardRow label="Last rejected" card={insights.lastRejected} />
      </div>
    </div>
  );
}

function FactRow(props: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xl leading-none font-semibold tabular-nums">
        {props.value}
      </p>
      <p className="mt-1 text-xs font-medium">{props.label}</p>
      <p className="text-xs text-muted-foreground">{props.note}</p>
    </div>
  );
}

function LeaveCardRow(props: { label: string; card: LeaveHistoryCard | null }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-xs font-medium">{props.label}</p>

      {!props.card ? (
        <p className="mt-1 text-sm text-muted-foreground">Never</p>
      ) : (
        <>
          <p className="mt-1 text-sm tabular-nums">
            {formatDay(props.card.fromDate) +
              " – " +
              formatDay(props.card.toDate)}
          </p>
          <p className="text-xs text-muted-foreground">
            {props.card.leaveTypeName +
              " · " +
              props.card.days +
              (props.card.days === 1 ? " day" : " days")}
          </p>
        </>
      )}
    </div>
  );
}
