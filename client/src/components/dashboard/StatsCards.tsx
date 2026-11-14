import { Link } from "react-router-dom";
import {
  Users,
  Network,
  UsersRound,
  ClipboardList,
  Circle,
  Loader,
  CheckCircle2,
  Plane,
  MailQuestion,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types/dashboard.types";

// The colour "tone" of one pill. Each tone is the pair of Tailwind classes
// for the round icon badge, so every pill of the same family looks the same
// in the light and in the dark theme.
type Tone = "indigo" | "sky" | "violet" | "slate" | "amber" | "emerald" | "rose";

const toneClasses: Record<Tone, string> = {
  indigo:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

// How the ten pills are laid out.
//
// On a phone they are one row you drag sideways with your finger, and each
// pill only takes the width of its own text. From "sm" upwards there is room
// for a real grid, so the row turns back into the grid it always was.
const rowClasses =
  "no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 " +
  "sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 " +
  "lg:grid-cols-3 xl:grid-cols-5";

// One pill: a round icon badge on the left, the name of the number in the
// middle, and the number itself on the right.
//
// The whole pill is a link, so a click always lands on the module the number
// came from. The hint is not written on the pill — there is no room for it
// on one line — it is the tooltip the mouse shows instead.
function StatPill(props: {
  title: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: Tone;
  to: string;
}) {
  const Icon = props.icon;

  return (
    <Link
      to={props.to}
      title={props.title + " — " + props.hint}
      className="group flex shrink-0 snap-start items-center gap-2 rounded-full border bg-card p-1.5 pr-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-105",
          toneClasses[props.tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>

      {/* On a phone the title only takes the room its own words need, so the
          number sits right next to it. On a wider screen it grows again and
          pushes the number to the far end of the pill. */}
      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground sm:min-w-0 sm:flex-1 sm:truncate">
        {props.title}
      </span>

      <span className="shrink-0 text-base font-bold tabular-nums tracking-tight">
        {props.value}
      </span>
    </Link>
  );
}

// The title of the section, shown above the pills in both states so the
// heading does not appear only once the numbers have arrived.
function StatsHeading() {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Stats</h2>
      <p className="text-sm text-muted-foreground">
        The ten numbers of your workspace, straight from the server.
      </p>
    </div>
  );
}

// The ten numbers of the workspace, all counted by the server.
//
// stats is undefined while the request is still on its way, and the grey
// pills below keep the page from jumping when the real numbers arrive.
export function StatsCards(props: {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}) {
  if (props.isLoading || !props.stats) {
    return (
      <section className="flex flex-col gap-3">
        <StatsHeading />
        <LoadingPills />
      </section>
    );
  }

  const stats = props.stats;

  // The tasks that are none of the three task pills below: waiting for a
  // review, or cancelled. They live in the tooltip of the total, so the
  // numbers still add up for somebody who checks them.
  const otherTasks = stats.inReviewTasks + stats.cancelledTasks;

  return (
    <section className="flex flex-col gap-3">
      <StatsHeading />

      <div className={rowClasses}>
        <StatPill
          title="Employees"
          value={stats.totalEmployees}
          hint={stats.activeEmployees + " still working here"}
          icon={Users}
          tone="indigo"
          to="/organization/employees"
        />
        <StatPill
          title="Departments"
          value={stats.totalDepartments}
          hint="Across the organization"
          icon={Network}
          tone="sky"
          to="/organization/departments"
        />
        <StatPill
          title="Teams"
          value={stats.totalTeams}
          hint="Inside the departments"
          icon={UsersRound}
          tone="violet"
          to="/organization/teams"
        />
        <StatPill
          title="Tasks"
          value={stats.totalTasks}
          hint={
            otherTasks > 0
              ? stats.inReviewTasks +
                " in review, " +
                stats.cancelledTasks +
                " cancelled"
              : "Every task ever created"
          }
          icon={ClipboardList}
          tone="slate"
          to="/organization/tasks"
        />
        <StatPill
          title="Pending Tasks"
          value={stats.pendingTasks}
          hint="Nobody started them yet"
          icon={Circle}
          tone="amber"
          to="/organization/tasks"
        />
        <StatPill
          title="Completed Tasks"
          value={stats.completedTasks}
          hint="Finished and closed"
          icon={CheckCircle2}
          tone="emerald"
          to="/organization/tasks"
        />
        <StatPill
          title="In Progress Tasks"
          value={stats.inProgressTasks}
          hint="Being worked on now"
          icon={Loader}
          tone="violet"
          to="/organization/tasks"
        />
        <StatPill
          title="Leave"
          value={stats.employeesOnLeaveToday}
          hint="On an approved leave today"
          icon={Plane}
          tone="sky"
          to="/organization/attendance"
        />
        <StatPill
          title="Pending leave"
          value={stats.pendingLeaveRequests}
          hint="Waiting for your answer"
          icon={MailQuestion}
          tone="amber"
          to="/organization/leaves"
        />
        <StatPill
          title="Absent"
          value={stats.absentEmployees}
          hint="Marked absent today"
          icon={UserX}
          tone="rose"
          to="/organization/attendance"
        />
      </div>
    </section>
  );
}

// The same ten pills in grey, while the numbers are still on their way.
function LoadingPills() {
  return (
    <div className={rowClasses}>
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="h-11 w-36 shrink-0 animate-pulse rounded-full bg-muted/50 sm:w-auto"
        />
      ))}
    </div>
  );
}
