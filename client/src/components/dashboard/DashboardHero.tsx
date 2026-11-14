import { Link } from "react-router-dom";
import {
  UserPlus,
  ClipboardList,
  CalendarPlus,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// The four jobs an organization starts most often, straight from the banner.
interface QuickAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Add employee", to: "/organization/employees", icon: UserPlus },
  { label: "New task", to: "/organization/tasks", icon: ClipboardList },
  { label: "Schedule meeting", to: "/organization/meetings", icon: CalendarPlus },
  { label: "New cheque", to: "/organization/cheques", icon: ReceiptText },
];

// "Good morning" / "Good afternoon" / "Good evening", read from the clock of
// the person looking at the screen.
function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
}

// Today written the long way, for example "Thursday, 30 July 2026".
function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// The banner at the top of the dashboard: who you are, what day it is, the
// four quick actions, and the three numbers that matter before you read
// anything else.
export function DashboardHero(props: {
  organizationName: string;
  headline: { label: string; value: string }[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-5 text-white shadow-xl shadow-indigo-500/20 sm:rounded-3xl sm:p-6 lg:p-8">
      {/* Two soft light orbs and a faint grid, drawn with plain css so the
          banner needs no image file. */}
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-fuchsia-300/25 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className="relative flex flex-wrap items-start justify-between gap-6 lg:gap-8">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {todayLabel()}
          </span>

          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            {greeting()}, {props.organizationName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-indigo-100">
            Every module of your workspace on one page — the numbers, the
            charts and the people who are away.
          </p>

          {/* The quick actions, as glassy pills. */}
          <div className="mt-5 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3.5 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* The headline numbers on the right. On a phone they share the whole
            width of the banner instead of leaving a ragged edge. */}
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          {props.headline.map((item) => (
            <div
              key={item.label}
              className="min-w-32 flex-1 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm sm:flex-none"
            >
              <p className="text-xs font-medium text-indigo-100">{item.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
