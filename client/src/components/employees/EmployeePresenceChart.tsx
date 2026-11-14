import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  TileFigure,
  TileFigures,
  LegendRow,
} from "./EmployeeTile";
import { Avatar } from "@/components/common/Avatar";
import {
  CHART_TOOLTIP_STYLE,
  buildPresenceSlices,
  percentOf,
  presenceColor,
  presenceLabel,
} from "./employeeAnalytics";
import type { EmployeeRow } from "./employeeAnalytics";

// How many faces the "who is not in" list shows before it stops counting out
// loud.
const MAX_FACES = 12;

// Today, over the whole workforce.
//
// The ring is the attendance of today, and "not marked" is a slice of its own
// on purpose: a day nobody answered for is not an absence. Turning it into one
// would accuse people of something they did not do, and it would also hide the
// real reading of that grey slice — that today's attendance has not been done
// yet.
//
// Under the ring are the faces of everybody who is not at their desk, because
// "6 away" is a number and "these six people" is what somebody planning the
// day actually needs.
export function EmployeePresenceChart(props: {
  rows: EmployeeRow[];
  attendancePath: string;
}) {
  const slices = buildPresenceSlices(props.rows);
  const drawn = slices.filter((slice) => slice.value > 0);

  const total = props.rows.length;

  const inToday = props.rows.filter(
    (row) => row.presence === "present" || row.presence === "half_day"
  ).length;

  // Everybody who is not at their desk today, and who somebody said so about:
  // the unmarked people are not "away", they are unanswered.
  const away = props.rows.filter(
    (row) => row.presence === "on_leave" || row.presence === "absent"
  );

  const notMarked = props.rows.filter(
    (row) => row.presence === "not_marked"
  ).length;

  return (
    <div className={TILE}>
      <TileGlow className="bg-emerald-500/15" />

      <TileHeader
        title="Where everybody is today"
        subtitle="The attendance of today over the whole team, and the faces of whoever is not in."
        right={
          <Link
            to={props.attendancePath}
            className="text-sm font-medium text-primary hover:underline"
          >
            Open attendance
          </Link>
        }
      />

      {total === 0 ? (
        <TileEmpty>Nobody works here yet.</TileEmpty>
      ) : (
        <>
          <TileFigures>
            <TileFigure
              value={percentOf(inToday, total) + "%"}
              label="of the team is in"
            />
            <TileFigure
              value={inToday + " of " + total}
              label="at their desk"
              tone="small"
            />
            {notMarked > 0 ? (
              <TileFigure
                value={String(notMarked)}
                label="still unanswered"
                tone="small"
              />
            ) : null}
          </TileFigures>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={drawn}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="98%"
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {drawn.map((slice) => (
                      <Cell key={slice.key} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-3xl font-bold tabular-nums leading-none">
                  {inToday}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">in today</p>
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {slices.map((slice) => (
                <LegendRow
                  key={slice.key}
                  color={slice.color}
                  name={slice.name}
                  value={String(slice.value)}
                  percent={percentOf(slice.value, total) + "%"}
                />
              ))}
            </div>
          </div>

          {/* Who is not in. */}
          <div className="relative mt-5 border-t border-border/60 pt-4">
            <p className="mb-2.5 text-sm font-medium">
              Not at their desk
              <span className="font-normal text-muted-foreground">
                {" "}
                — {away.length} {away.length === 1 ? "person" : "people"} on
                leave or absent
              </span>
            </p>

            {away.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Everybody who was marked today is in.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {away.slice(0, MAX_FACES).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 py-1.5 pl-1.5 pr-3"
                  >
                    <Avatar name={row.name} photo={row.photo} size="sm" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight">
                        {row.name}
                      </p>
                      <p
                        className="truncate text-xs"
                        style={{ color: presenceColor(row.presence) }}
                      >
                        {presenceLabel(row.presence)}
                      </p>
                    </div>
                  </div>
                ))}

                {away.length > MAX_FACES ? (
                  <span className="self-center text-sm text-muted-foreground">
                    and {away.length - MAX_FACES} more.
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
