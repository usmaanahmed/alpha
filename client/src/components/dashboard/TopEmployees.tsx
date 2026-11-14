import { Link } from "react-router-dom";
import { ArrowUpRight, Crown, Trophy } from "lucide-react";
import { Avatar } from "@/components/common/Avatar";
import type { Task } from "@/types/task.types";

// The shared look of one tile of the dashboard, the same one the other
// analytics sections use, so this one sits in the same family.
const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// How many people the board shows.
const HOW_MANY = 5;

// One line of the leaderboard: a person and their two numbers.
interface LeaderboardRow {
  employeeId: string;
  name: string;
  photo: string;
  totalTasks: number;
  completedTasks: number;
}

// The colours of the medal in front of a name. The first three places get
// gold, silver and bronze, everybody else gets the quiet grey circle.
//
// The rank is also written INSIDE the medal as a number, so the board is
// never read by colour alone.
const MEDAL_CLASS = [
  "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950 shadow-md shadow-amber-500/30",
  "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 shadow-md shadow-slate-400/30",
  "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-950 shadow-md shadow-orange-500/30",
];

// The five people who carry the most tasks, best first.
//
// Everything is worked out from the tasks the dashboard already downloaded,
// so opening this board costs no extra request to the server.
export function TopEmployees(props: { tasks: Task[]; isLoading: boolean }) {
  if (props.isLoading) {
    return <LoadingTile />;
  }

  const rows = buildLeaderboard(props.tasks);

  // The longest bar of the board. Every other bar is drawn next to this one,
  // so the leader always fills the whole width and the rest can be compared
  // to them at a glance.
  const mostTasks = rows.length > 0 ? rows[0].totalTasks : 0;

  return (
    <div className={TILE}>
      {/* A soft amber glow behind the winner, for depth. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl"
      />

      <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Trophy className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Top employees
            </h2>
            <p className="text-sm text-muted-foreground">
              The five people carrying the most tasks.
            </p>
          </div>
        </div>

        <Link
          to="/organization/tasks"
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open tasks
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No task is assigned to anybody yet.
        </p>
      ) : (
        <div className="relative">
          {/* The names of the two columns, written once above the rows. */}
          <div className="mb-2 flex items-center gap-3 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span className="w-9 shrink-0" />
            <span className="min-w-0 flex-1">Employee</span>
            <span className="w-16 shrink-0 text-right">Total</span>
            <span className="w-20 shrink-0 text-right">Completed</span>
          </div>

          <div className="flex flex-col gap-2">
            {rows.map((row, index) => (
              <LeaderboardLine
                key={row.employeeId}
                row={row}
                rank={index + 1}
                mostTasks={mostTasks}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// One person of the board.
function LeaderboardLine(props: {
  row: LeaderboardRow;
  rank: number;
  mostTasks: number;
}) {
  const row = props.row;

  // The medal of the first three places, the grey circle for the others.
  const medalClass =
    MEDAL_CLASS[props.rank - 1] || "bg-muted text-muted-foreground";

  // How wide the bar of this person is, next to the leader's bar.
  const barWidth =
    props.mostTasks > 0 ? (row.totalTasks / props.mostTasks) * 100 : 0;

  // How much of their own work is already done.
  const donePercent =
    row.totalTasks > 0
      ? Math.round((row.completedTasks / row.totalTasks) * 100)
      : 0;

  const isWinner = props.rank === 1;

  return (
    <div
      className={
        "relative flex items-center gap-3 rounded-xl border p-3 transition-colors " +
        (isWinner
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border/60 bg-background/40 hover:border-border")
      }
    >
      {/* The medal, with the place written inside it. */}
      <span
        className={
          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums " +
          medalClass
        }
      >
        {props.rank}

        {/* Only the winner wears the crown. */}
        {isWinner && (
          <Crown className="absolute -top-2.5 h-4 w-4 rotate-12 text-amber-500" />
        )}
      </span>

      {/* The person, and under the name the bar that compares them to the
          leader. The percentage next to the bar says how much of their own
          work is finished. */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={row.name} photo={row.photo} size="md" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{row.name}</p>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-500"
                style={{ width: barWidth + "%" }}
              />
            </span>

            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {donePercent}% done
            </span>
          </div>
        </div>
      </div>

      {/* The two numbers of the board. */}
      <span className="w-16 shrink-0 text-right text-lg font-bold tabular-nums">
        {row.totalTasks}
      </span>

      <span className="w-20 shrink-0 text-right text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
        {row.completedTasks}
      </span>
    </div>
  );
}

// Count the tasks of every person, then keep the best five.
//
// A task nobody holds (the person was deleted, or the task was never given
// to anybody) belongs to no one, so it is simply skipped.
function buildLeaderboard(tasks: Task[]) {
  const rows: LeaderboardRow[] = [];

  tasks.forEach((task) => {
    const person = task.assignedTo;

    if (!person) {
      return;
    }

    // The line of this person, or a new line the first time we meet them.
    let row = rows.find((item) => item.employeeId === person._id);

    if (!row) {
      row = {
        employeeId: person._id,
        name: person.name,
        photo: person.photo,
        totalTasks: 0,
        completedTasks: 0,
      };
      rows.push(row);
    }

    row.totalTasks += 1;

    if (task.status === "completed") {
      row.completedTasks += 1;
    }
  });

  // Most tasks first. Two people with the same number of tasks are split by
  // how many of them they finished, and if that is equal too we sort by name
  // so the board never changes order on its own between two visits.
  rows.sort((a, b) => {
    if (b.totalTasks !== a.totalTasks) {
      return b.totalTasks - a.totalTasks;
    }
    if (b.completedTasks !== a.completedTasks) {
      return b.completedTasks - a.completedTasks;
    }
    return a.name.localeCompare(b.name);
  });

  return rows.slice(0, HOW_MANY);
}

// The same tile in grey, so the page does not jump when the tasks arrive.
function LoadingTile() {
  return <div className="h-96 animate-pulse rounded-2xl bg-muted/50" />;
}
