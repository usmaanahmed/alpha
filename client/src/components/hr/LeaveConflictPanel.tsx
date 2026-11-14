import { Building2, UsersRound } from "lucide-react";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { formatDay } from "@/lib/date";
import type { LeaveContext, LeaveOverlap, LeaveGroupSummary } from "@/types/hr.types";

// Who else of the company is away in the same days.
//
// The panel is built to be read from the top down, in the order an approver
// thinks: first how empty the office would be, then the four counts, then the
// names, then the same picture per department and per team.

export function LeaveConflictPanel(props: {
  context: LeaveContext;
  isLoading?: boolean;
}) {
  if (props.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border bg-muted/40" />;
  }

  const conflict = props.context.conflict;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <WorkforceMeter
        workforce={conflict.workforce}
        absentNow={conflict.absentNow}
        minWorkforcePercent={props.context.policy.minWorkforcePercent}
        availablePercent={conflict.availablePercentIfApproved}
      />

      {/* The four counts of the period. They are plain tiles and not a chart:
          four numbers do not need one, and a number a person can read at a
          glance beats any drawing of it. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CountTile
          value={conflict.employeesWithRequests}
          label="People who asked"
          dot="bg-slate-400"
        />
        <CountTile
          value={conflict.approvedCount}
          label="Already approved"
          dot="bg-emerald-500"
        />
        <CountTile
          value={conflict.pendingCount}
          label="Still waiting"
          dot="bg-amber-500"
        />
        <CountTile
          value={conflict.rejectedCount}
          label="Rejected"
          dot="bg-rose-500"
        />
      </div>

      <PeopleList
        title="Already on approved leave"
        emptyText="Nobody else is on approved leave in these days."
        people={conflict.onApprovedLeave}
      />

      <PeopleList
        title="Waiting for an answer, same days"
        emptyText=""
        people={conflict.onPendingLeave}
      />

      {/* The two grid items get min-w-0 as well: a long department name
          inside one of them must shorten the column, not widen the dialog. */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <GroupSummary
          title="By department"
          icon={<Building2 className="h-4 w-4" />}
          rows={conflict.byDepartment}
        />
        <GroupSummary
          title="By team"
          icon={<UsersRound className="h-4 w-4" />}
          rows={conflict.byTeam}
        />
      </div>
    </div>
  );
}

// How much of the workforce would be at their desks if this leave is
// approved, drawn as one bar.
//
// The bar is split in three, and each piece is named right under it, so the
// colours are never the only thing carrying the meaning. The dashed line is
// the minimum the organization set for itself: a bar that ends before it is
// the whole warning, said without words.
function WorkforceMeter(props: {
  workforce: number;
  absentNow: number;
  minWorkforcePercent: number;
  availablePercent: number;
}) {
  if (props.workforce === 0) {
    return null;
  }

  // The three pieces, as percentages of the whole workforce.
  //
  // One person out of a big company is a fraction of a percent, and a piece
  // of the bar that thin would simply disappear. So the piece that stands for
  // THIS request never goes under 1.5%: it is the one the approver is
  // deciding about, and it has to stay visible.
  const awayNowPercent = Math.round((props.absentNow / props.workforce) * 100);
  const thisRequestPercent = Math.max((1 / props.workforce) * 100, 1.5);
  const isBelowMinimum = props.availablePercent < props.minWorkforcePercent;

  return (
    <div className="rounded-xl border p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm text-muted-foreground">
            Available if you approve
          </p>
          <p
            className={
              "text-3xl leading-none font-semibold tabular-nums " +
              (isBelowMinimum ? "text-rose-600 dark:text-rose-400" : "")
            }
          >
            {props.availablePercent + "%"}
          </p>
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          {props.workforce - props.absentNow - 1 + " of " + props.workforce + " people at work"}
        </p>
      </div>

      {/* The bar. A 2px gap of the surface colour sits between the two filled
          pieces, so they read as two things and not one long block. */}
      <div className="relative mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        <span
          className="bg-slate-400 dark:bg-slate-500"
          style={{ width: awayNowPercent + "%" }}
        />
        <span
          className="bg-amber-500"
          style={{ width: thisRequestPercent + "%" }}
        />

        {/* Where the minimum of the organization sits, measured from the
            right, because the bar fills with the people who are AWAY and the
            minimum is about the people who stay. */}
        <span
          className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
          style={{ right: props.minWorkforcePercent + "%" }}
          title={"Minimum " + props.minWorkforcePercent + "% must stay available"}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <MeterKey
          swatch="bg-slate-400 dark:bg-slate-500"
          text={props.absentNow + " already away"}
        />
        <MeterKey swatch="bg-amber-500" text="this request" />
        <MeterKey
          swatch="bg-foreground/50"
          text={props.minWorkforcePercent + "% minimum"}
        />
      </div>
    </div>
  );
}

// One entry of the little key under the bar: a swatch and the words for it.
function MeterKey(props: { swatch: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={"h-2 w-2 rounded-full " + props.swatch} />
      {props.text}
    </span>
  );
}

// One of the four counts. The number wears normal ink and a small coloured
// dot carries which count it is, so the digits stay easy to read.
function CountTile(props: { value: number; label: string; dot: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-2xl leading-none font-semibold tabular-nums">
        {props.value}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + props.dot} />
        {props.label}
      </p>
    </div>
  );
}

// The names behind one of the counts. An empty emptyText means "say nothing
// at all when the list is empty", which is what the pending list wants: a
// heading with "nobody" under it would only be noise.
function PeopleList(props: {
  title: string;
  emptyText: string;
  people: LeaveOverlap[];
}) {
  if (props.people.length === 0 && props.emptyText === "") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {props.title}
        <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
          {props.people.length}
        </span>
      </p>

      {props.people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{props.emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {props.people.map((overlap) => (
            <li
              key={overlap.employee._id + overlap.fromDate}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <span className="min-w-0">
                <EmployeeAvatar
                  name={overlap.employee.name}
                  photo={overlap.employee.photo}
                  subtitle={
                    overlap.employee.departmentName ||
                    overlap.employee.designation
                  }
                  size="sm"
                />
              </span>

              {/* flex-wrap here too: on a narrow phone the chip, the two
                  dates and the day count do not fit on one line, and without
                  it they would push the whole dialog sideways. */}
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {overlap.leaveTypeName}
                </span>
                {formatDay(overlap.fromDate) + " – " + formatDay(overlap.toDate)}
                <span className="font-medium text-foreground">
                  {overlap.daysInPeriod +
                    (overlap.daysInPeriod === 1 ? " day" : " days")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The same picture, one line per department or per team.
//
// The bars all wear ONE colour: what is being compared is how long they are,
// not which one they are, so a second colour would only invent a difference
// that is not in the numbers.
function GroupSummary(props: {
  title: string;
  icon: React.ReactNode;
  rows: LeaveGroupSummary[];
}) {
  // A group with nobody away says nothing an approver needs, so the list
  // keeps only the ones that are really touched, and at most five of them.
  const rowsWithLeave = props.rows.filter(
    (row) => row.onLeave > 0 || row.pending > 0
  );

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-medium">
        {props.icon}
        {props.title}
      </p>

      {rowsWithLeave.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody is away in these days.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rowsWithLeave.slice(0, 5).map((row) => (
            <li key={row._id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">
                  {row.name}
                  {row.hasRequester ? (
                    <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                      this employee
                    </span>
                  ) : null}
                </span>

                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {row.onLeave + " of " + row.total}
                  {row.pending > 0 ? " · " + row.pending + " waiting" : ""}
                </span>
              </div>

              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-sky-500"
                  style={{ width: Math.max(row.percent, 2) + "%" }}
                />
              </div>
            </li>
          ))}

          {/* Never hide a cut silently: if the list is longer, say so. */}
          {rowsWithLeave.length > 5 ? (
            <li className="text-xs text-muted-foreground">
              {"and " + (rowsWithLeave.length - 5) + " more"}
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
