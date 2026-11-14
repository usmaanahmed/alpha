import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { UserMinus, UsersRound } from "lucide-react";
import {
  TILE,
  TileGlow,
  TileHeader,
  TileEmpty,
  LegendRow,
  LegendFootRow,
} from "./TeamTile";
import {
  CHART_TOOLTIP_STYLE,
  REST_COLOR,
  formatAverage,
  percentOf,
} from "./teamAnalytics";
import type { TeamRow, TeamHeadline } from "./teamAnalytics";

// A ring with more than a handful of slices is unreadable, so only the eight
// biggest teams get a slice of their own. The rows arrive ranked, so the eight
// biggest are simply the first eight.
const MAX_SLICES = 8;

// One drawn slice of the ring.
interface Slice {
  name: string;
  value: number;
  color: string;
}

// How the people of the workspace are shared out over the teams.
//
// The grey slice at the end is everybody who is in no team at all. It is not a
// mistake — a workspace does not have to put everybody in a team — but it is
// the number that says how much of this page's story is missing, so it is
// drawn and not hidden.
//
// The legend lists every team, including the ones with nobody in them: an
// empty team draws no slice, but "this team holds zero people" is an answer,
// and dropping the line would quietly hide it.
//
// The number in the hole counts every person ONCE, while the slices count
// them per team. In this app somebody belongs to one team, so the two agree;
// if a person were ever written into two teams, the hole would be the honest
// number of the two.
export function TeamSizeRing(props: {
  rows: TeamRow[];
  headline: TeamHeadline;
}) {
  const head = props.headline;

  // Everybody this ring knows about: the people who sit in a team, plus the
  // ones who sit in none. The second half is only known to somebody whose
  // role opens the employee module.
  const total = head.people + head.peopleWithoutTeam;

  const slices: Slice[] = [];

  if (props.rows.length <= MAX_SLICES) {
    props.rows.forEach((row) => {
      slices.push({ name: row.name, value: row.size, color: row.color });
    });
  } else {
    // Too many teams: the seven biggest keep their own slice and everything
    // under them is added up into one last grey slice.
    const shown = props.rows.slice(0, MAX_SLICES - 1);
    const rest = props.rows.slice(MAX_SLICES - 1);

    shown.forEach((row) => {
      slices.push({ name: row.name, value: row.size, color: row.color });
    });

    let restTotal = 0;
    rest.forEach((row) => {
      restTotal += row.size;
    });

    slices.push({
      name: "Other teams (" + rest.length + ")",
      value: restTotal,
      color: REST_COLOR,
    });
  }

  if (head.peopleWithoutTeam > 0) {
    slices.push({
      name: "In no team",
      value: head.peopleWithoutTeam,
      color: REST_COLOR,
    });
  }

  // A team nobody is in yet would only be an invisible slice, so it stays out
  // of the ring while keeping its line in the legend.
  const drawnSlices = slices.filter((slice) => slice.value > 0);

  return (
    <div className={TILE}>
      <TileGlow className="bg-teal-500/15" />

      <TileHeader
        title="How the people are grouped"
        subtitle="Every team, and the share of the workspace that sits in it."
      />

      {total === 0 ? (
        <TileEmpty>Nobody sits in a team yet.</TileEmpty>
      ) : (
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* The ring, with the headcount written in its hole. */}
          <div className="relative mx-auto h-56 w-56 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={drawnSlices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="98%"
                  // The small gap and the stroke in the card colour are what
                  // keep two slices apart even when their colours are close.
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {drawnSlices.map((slice) => (
                    <Cell key={slice.name} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {head.people}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                in a team
              </p>
            </div>
          </div>

          {/* Our own legend, so the number is written next to every colour and
              the ring is never read by colour alone. The list can get long, so
              it scrolls inside the tile. */}
          <div className="flex max-h-60 min-w-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
            {slices.map((slice) => (
              <LegendRow
                key={slice.name}
                color={slice.color}
                name={slice.name}
                value={String(slice.value)}
                percent={percentOf(slice.value, total) + "%"}
              />
            ))}

            <LegendFootRow
              icon={<UsersRound className="h-4 w-4" />}
              name="Average team size"
              value={formatAverage(head.averageSize)}
            />

            {head.emptyTeams > 0 ? (
              <LegendFootRow
                icon={<UserMinus className="h-4 w-4" />}
                name="Teams with nobody in them"
                value={String(head.emptyTeams)}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
