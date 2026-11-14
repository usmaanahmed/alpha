import {
  TrendingUp,
  MoreHorizontal,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// IMPORTANT: everything in this file is DEMO DATA.
//
// The snapshot shows a Performance chart, an Hours-Logged chart, a list of
// documents, a payroll breakdown and some notes. The database does not keep
// any of those yet, so the numbers below are hard-coded just to make the page
// look like the snapshot. When the server starts sending real values, replace
// the little arrays and objects at the top of each component with props.
// ---------------------------------------------------------------------------

// === Performance overview ==================================================

// One score per month, Jan..Dec, as a percent. Demo only.
const PERFORMANCE_BY_MONTH = [
  74, 78, 72, 80, 76, 82, 79, 84, 80.5, 86, 83, 87,
];
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
// Which month gets the little marker + tooltip (September here, index 8).
const HIGHLIGHT_INDEX = 8;

export function EmployeePerformanceCard() {
  // The chart is drawn in a 300 x 120 box; the numbers below turn a percent
  // into a point inside that box.
  const width = 300;
  const height = 120;
  const top = 10; // a little air above the highest point
  const bottom = 100; // the line never touches the very bottom

  const max = Math.max(...PERFORMANCE_BY_MONTH);
  const min = Math.min(...PERFORMANCE_BY_MONTH);

  // Turn every score into an [x, y] point.
  const points = PERFORMANCE_BY_MONTH.map((value, index) => {
    const x = (index / (PERFORMANCE_BY_MONTH.length - 1)) * width;
    // A higher score must sit higher up, and y grows downwards, so we flip it.
    const ratio = max === min ? 0.5 : (value - min) / (max - min);
    const y = bottom - ratio * (bottom - top);
    return { x: x, y: y };
  });

  // "M0,y L1,y L2,y ..." — the line through every point.
  const linePath = points
    .map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y)
    .join(" ");

  // The same line, then straight down and back to the start, so the area
  // under it can be filled with a soft colour.
  const areaPath =
    linePath +
    " L" + width + "," + height + " L0," + height + " Z";

  const marker = points[HIGHLIGHT_INDEX];

  return (
    <Card className="gap-0 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">Performance overview</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-3xl font-semibold tabular-nums">86.75%</span>
          </div>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            +2.05% vs last year
          </span>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-6">
        <svg
          viewBox={"0 0 " + width + " " + height}
          className="h-32 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* The soft fill under the line uses a top-to-bottom gradient. */}
          <defs>
            <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="[stop-color:var(--color-primary)]" stopOpacity="0.25" />
              <stop offset="100%" className="[stop-color:var(--color-primary)]" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path d={areaPath} fill="url(#perfFill)" />
          <path
            d={linePath}
            fill="none"
            className="stroke-primary"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />

          {/* The marker on the highlighted month. */}
          <circle
            cx={marker.x}
            cy={marker.y}
            r="4"
            className="fill-primary"
          />
        </svg>

        {/* The month labels under the chart. */}
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          {MONTH_LABELS.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

// === Hours logged ==========================================================

// Hours worked each weekday, Mon..Sun. Demo only.
const HOURS_BY_DAY = [8, 7.5, 4, 8, 7, 0, 0];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

export function EmployeeHoursCard() {
  const maxHours = Math.max(...HOURS_BY_DAY, 1);
  // The tallest day gets the strong colour, the rest stay soft.
  const tallest = HOURS_BY_DAY.indexOf(maxHours);

  return (
    <Card className="gap-0 p-6">
      <div className="flex items-start justify-between">
        <p className="font-semibold">Hours logged</p>
        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          This week
        </span>
      </div>

      <p className="mt-3 text-2xl font-semibold tabular-nums">
        34<span className="text-base font-normal text-muted-foreground">h</span>{" "}
        30<span className="text-base font-normal text-muted-foreground">m</span>
      </p>

      {/* The bars. Each column is as tall as the hours of that day. */}
      <div className="mt-5 flex h-28 items-end justify-between gap-2">
        {HOURS_BY_DAY.map((hours, index) => (
          <div
            key={index}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <div
              className={cn(
                "w-full rounded-md transition-all",
                index === tallest ? "bg-primary" : "bg-primary/25"
              )}
              // The height is a percent of the tallest bar. A day with 0
              // hours still keeps a sliver so the column is visible.
              style={{ height: Math.max(6, (hours / maxHours) * 100) + "%" }}
            />
            <span className="text-xs text-muted-foreground">
              {DAY_LETTERS[index]}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// === Documents =============================================================

// The files of the employee. Demo only.
const DOCUMENTS = [
  { name: "Performance Evaluation", size: "1.24 MB" },
  { name: "Contract Agreement", size: "895 KB" },
  { name: "Curriculum Vitae", size: "1.27 MB" },
  { name: "Portfolio", size: "3.68 MB" },
];

export function EmployeeDocumentsCard() {
  return (
    <Card className="gap-0 p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Documents</p>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {DOCUMENTS.map((doc) => (
          <div key={doc.name} className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{doc.name}.pdf</p>
              <p className="text-xs text-muted-foreground">
                PDF · {doc.size}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// === Internal notes ========================================================

// The little notes HR keeps about the employee. Demo only.
const NOTES = [
  {
    title: "Promotion Feedback",
    date: "10 January 2035",
    body: "Promoted from HR Assistant to HR Officer due to consistent performance and leadership in onboarding initiatives.",
  },
  {
    title: "Employee Appreciation",
    date: "02 May 2035",
    body: "Recognized by the Head of HR for successfully leading the Q2 training rollout with a 98% participation rate.",
  },
];

export function EmployeeNotesCard() {
  return (
    <Card className="gap-0 p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Internal notes</p>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {NOTES.map((note) => (
          <div key={note.title} className="rounded-xl bg-muted/40 p-4">
            <p className="text-sm font-medium">{note.title}</p>
            <p className="text-xs text-muted-foreground">{note.date}</p>
            <p className="mt-2 text-sm text-muted-foreground">{note.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// === Payroll summary =======================================================

// The monthly money, in whole dollars. Demo only.
const PAYROLL = {
  baseSalary: 3200,
  allowances: [
    { label: "Transportation", amount: 120 },
    { label: "Meal", amount: 110 },
    { label: "Internet (Hybrid)", amount: 70 },
  ],
  benefits: [
    { label: "Health Insurance", amount: 120 },
    { label: "Life Insurance", amount: 40 },
    { label: "Company Device", amount: 65 },
    { label: "Training Program", amount: 80 },
    { label: "Fitness Membership", amount: 50 },
  ],
  totalMonthlyValue: 3855,
};

export function EmployeePayrollCard() {
  return (
    <Card className="gap-0 p-6">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Payroll summary</p>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Description</span>
        <span>Amount · USD/month</span>
      </div>

      <div className="mt-3 flex flex-col gap-3 text-sm">
        <MoneyRow label="Base Salary" amount={PAYROLL.baseSalary} strong />

        <GroupLabel text="Allowances" />
        {PAYROLL.allowances.map((row) => (
          <MoneyRow key={row.label} label={row.label} amount={row.amount} indent />
        ))}

        <GroupLabel text="Benefits" />
        {PAYROLL.benefits.map((row) => (
          <MoneyRow key={row.label} label={row.label} amount={row.amount} indent />
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <span className="font-medium">Total Monthly Value</span>
        <span className="inline-flex items-center gap-1 text-lg font-semibold tabular-nums">
          <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ${PAYROLL.totalMonthlyValue.toLocaleString()}
        </span>
      </div>
    </Card>
  );
}

// A small grey heading inside the payroll list, like "Allowances".
function GroupLabel(props: { text: string }) {
  return (
    <p className="pt-1 text-xs font-medium text-muted-foreground">
      {props.text}
    </p>
  );
}

// One "label ....... $amount" line of the payroll list.
function MoneyRow(props: {
  label: string;
  amount: number;
  strong?: boolean;
  indent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(props.indent && "pl-3", "text-muted-foreground")}>
        {props.label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          props.strong ? "font-semibold" : "font-medium"
        )}
      >
        ${props.amount.toLocaleString()}
      </span>
    </div>
  );
}
