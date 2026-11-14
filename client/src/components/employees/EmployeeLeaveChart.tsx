import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  TileNote,
  StatusLegendRow,
} from "./EmployeeTile";
import { formatAverage } from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

const MAX_PEOPLE = 12;

const PAID_COLOR = "#0d9488";
const UNPAID_COLOR = "#d97706";
const ROW_HEIGHT = 32;
const CHART_PADDING = 40;

interface LeaveBar {
  id: string;
  name: string;
  paid: number;
  unpaid: number;
  days: number;
  pending: number;
}

function LeaveTooltip(props: {
  active?: boolean;
  payload?: { payload: LeaveBar }[];
}) {
  if (!props.active || !props.payload || props.payload.length === 0) {
    return null;
  }

  const bar = props.payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold">{bar.name}</p>

      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Paid days</span>
        <span className="font-semibold tabular-nums">{bar.paid}</span>
      </p>
      <p className="flex items-center gap-4">
        <span className="flex-1 text-muted-foreground">Unpaid days</span>
        <span className="font-semibold tabular-nums">{bar.unpaid}</span>
      </p>
      <p className="mt-1.5 flex items-center gap-4 border-t border-border/60 pt-1.5">
        <span className="flex-1 text-muted-foreground">This year</span>
        <span className="font-semibold tabular-nums">{bar.days} days</span>
      </p>

      {bar.pending > 0 ? (
        <p className="mt-1 text-muted-foreground">
          {bar.pending} more{" "}
          {bar.pending === 1 ? "request is" : "requests are"} still waiting.
        </p>
      ) : null}
    </div>
  );
}

// The time off people have actually taken this year.
//
// Only approved leave is counted, and only leave that starts in the current
// year, so the bars are days somebody really was away and not days somebody
// asked for. The split between paid and unpaid is worth having: ten unpaid
// days is a very different story from ten paid ones, both for the person and
// for the payroll.
//
// The dashed line is the company average, so a long bar is read against the
// room and not against a number somebody made up. A person with NO bar is
// worth a look too — that is usually somebody who never takes their leave.
export function EmployeeLeaveChart(props: { rows: EmployeeRow[] }) {
  const withLeave = props.rows.filter((row) => row.leaveDays > 0);

  const ranked = [...withLeave].sort((left, right) => {
    if (right.leaveDays !== left.leaveDays) {
      return right.leaveDays - left.leaveDays;
    }
    return left.name.localeCompare(right.name);
  });

  const bars: LeaveBar[] = ranked.slice(0, MAX_PEOPLE).map((row) => ({
    id: row.id,
    name: row.name,
    paid: row.paidLeaveDays,
    unpaid: row.unpaidLeaveDays,
    days: row.leaveDays,
    pending: row.pendingLeaves,
  }));

  let days = 0;
  let paid = 0;
  let unpaid = 0;
  let pending = 0;

  props.rows.forEach((row) => {
    days += row.leaveDays;
    paid += row.paidLeaveDays;
    unpaid += row.unpaidLeaveDays;
    pending += row.pendingLeaves;
  });

  // Over everybody, not only over the people who took something.
  const average = props.rows.length === 0 ? 0 : days / props.rows.length;

  const untouched = props.rows.length - withLeave.length;
  const hidden = ranked.length - bars.length;

  return (
    <div className={TILE}>
      <TileGlow className="bg-amber-500/15" />

      <TileHeader
        title="Time off taken this year"
        subtitle="Approved leave days per person, split into paid and unpaid."
      />

      {days === 0 ? (
        <TileEmpty>
          No leave has been approved this year yet.
          {pending > 0
            ? " " +
              pending +
              (pending === 1 ? " request is" : " requests are") +
              " still waiting for an answer."
            : ""}
        </TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure value={String(days)} label="days taken this year" />
            <TileFigure
              value={formatAverage(average)}
              label="days per person"
              tone="small"
            />
            <TileFigure
              value={paid + " / " + unpaid}
              label="paid / unpaid"
              tone="small"
            />
            {pending > 0 ? (
              <TileFigure
                value={String(pending)}
                label="waiting for an answer"
                tone="small"
              />
            ) : null}
          </TileFigures>

          <StatusLegendRow
            items={[
              { label: "Paid", color: PAID_COLOR },
              { label: "Unpaid", color: UNPAID_COLOR },
              { label: "Company average", color: "#94a3b8" },
            ]}
          />

          <div
            className="relative w-full"
            style={{ height: bars.length * ROW_HEIGHT + CHART_PADDING }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bars}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  interval={0}
                />
                <Tooltip
                  content={<LeaveTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                />

                {average > 0 ? (
                  <ReferenceLine
                    x={average}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.7}
                  />
                ) : null}

                <Bar
                  dataKey="paid"
                  name="Paid"
                  stackId="leave"
                  fill={PAID_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={18}
                />
                <Bar
                  dataKey="unpaid"
                  name="Unpaid"
                  stackId="leave"
                  fill={UNPAID_COLOR}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={18}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {hidden > 0 || untouched > 0 ? (
            <TileNote>
              {hidden > 0
                ? hidden +
                  (hidden === 1 ? " more person has" : " more people have") +
                  " taken leave and are not drawn here. "
                : ""}
              {untouched > 0
                ? untouched +
                  (untouched === 1 ? " person has" : " people have") +
                  " taken no leave at all this year."
                : ""}
            </TileNote>
          ) : null}
        </>
      )}
    </div>
  );
}
