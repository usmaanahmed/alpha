import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { MailCheck } from "lucide-react";
import {
  TILE,
  TileHeader,
  TileGlow,
  TileEmpty,
  LegendRow,
  LegendFootRow,
} from "./MeetingTile";
import {
  buildResponseTotals,
  percentOf,
  CHART_TOOLTIP_STYLE,
} from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

// How the team answers its invitations.
//
// One slice per answer, over every invitation of every meeting that is still
// standing. The invitations of a cancelled meeting are left out: nobody was
// ever going to sit in that meeting, so their silence says nothing.
//
// The number in the hole is the share that said yes, because that is the one
// figure worth watching: an organizer who sees it fall knows the invitations
// are being sent to the wrong people, or too many of them.
export function MeetingResponseRing(props: { meetings: Meeting[] }) {
  const totals = buildResponseTotals(props.meetings);

  // An answer nobody gave would only be an invisible slice, so it stays out
  // of the ring but keeps its line in the legend.
  const drawn = totals.slices.filter((slice) => slice.value > 0);

  const silent = totals.total - totals.answered;

  return (
    <div className={TILE}>
      <TileGlow className="bg-sky-500/15" />

      <TileHeader
        title="How invitations are answered"
        subtitle="Every invitation sent for a meeting that is still standing."
      />

      {totals.total === 0 ? (
        <TileEmpty>Nobody has been invited to a meeting yet.</TileEmpty>
      ) : (
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          {/* The ring, with the share that said yes in its hole. */}
          <div className="relative mx-auto h-52 w-52 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={drawn}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="64%"
                  outerRadius="98%"
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {drawn.map((slice) => (
                    <Cell key={slice.response} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-bold tabular-nums leading-none">
                {totals.acceptRate}%
              </p>
              <p className="mt-1 px-6 text-center text-xs text-muted-foreground">
                said yes
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {totals.slices.map((slice) => (
              <LegendRow
                key={slice.response}
                color={slice.color}
                name={slice.name}
                value={String(slice.value)}
                percent={percentOf(slice.value, totals.total) + "%"}
              />
            ))}

            {/* How many invitations got any answer at all. This is not a
                fifth slice: it is three of the four above added together. */}
            <LegendFootRow
              icon={<MailCheck className="h-4 w-4" />}
              name="Invitations answered"
              value={totals.answered + " of " + totals.total}
              percent={totals.replyRate + "%"}
            />

            <p className="text-xs text-muted-foreground">
              {silent === 0
                ? "Everybody has answered."
                : silent +
                  (silent === 1 ? " invitation is" : " invitations are") +
                  " still waiting for an answer."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
