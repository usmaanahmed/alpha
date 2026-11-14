import { Link, useNavigate } from "react-router-dom";
import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingAnalyticsHero } from "@/components/meetings/MeetingAnalyticsHero";
import { MeetingStatusRing } from "@/components/meetings/MeetingStatusRing";
import { MeetingResponseRing } from "@/components/meetings/MeetingResponseRing";
import { MeetingLoadChart } from "@/components/meetings/MeetingLoadChart";
import { MeetingTimeHeatmap } from "@/components/meetings/MeetingTimeHeatmap";
import { MeetingDurationChart } from "@/components/meetings/MeetingDurationChart";
import { MeetingPeopleChart } from "@/components/meetings/MeetingPeopleChart";
import { MeetingOrganizerChart } from "@/components/meetings/MeetingOrganizerChart";
import { MeetingFollowUpTile } from "@/components/meetings/MeetingFollowUpTile";
import { MeetingAttentionPanel } from "@/components/meetings/MeetingAttentionPanel";
import { UpcomingMeetings } from "@/components/meetings/UpcomingMeetings";
import { TILE, TileSkeleton } from "@/components/meetings/MeetingTile";
import { buildHeadline } from "@/components/meetings/meetingAnalytics";
import { useMeetings } from "@/hooks/useMeetings";
import { useAuth } from "@/context/AuthContext";
import { getModuleBase } from "@/types/auth.types";

// The meeting dashboard: the whole meeting module read back as analytics.
//
// Nine tiles, and each one answers a different question about the same list
// of meetings:
//
//   the banner   — what is next, and what today and the week already cost
//   two rings    — where the meetings stand, and how invitations are answered
//   the bars     — how busy the diary has been, week by week or month by month
//   the heat map — which day and which hours of the week get eaten
//   the lengths  — how long meetings run, in the room and on the screen
//   two more bars— who sits in them, and who calls them
//   the meters   — agenda, minutes and follow-up: are they run properly
//   the panel    — what is waiting on somebody right now
//   the diary    — the days ahead, and what each one already costs
//
// Every one of those numbers is worked out on the React side, in
// components/meetings/meetingAnalytics.ts, from the one meeting list the
// module already loads. So this page adds no endpoint, and it can never
// disagree with the meetings board: both read the same query.
export function MeetingDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const meetingsQuery = useMeetings();

  const meetings = meetingsQuery.data || [];
  const headline = buildHeadline(meetings);

  // The organization account and an employee with the meeting permissions
  // open this very same page under a different address, so the path to the
  // board has to be built and not written by hand.
  const meetingsPath = getModuleBase(user?.role) + "/meetings";

  // The dashboard only reads. Clicking anything sends the user to the
  // meetings board, where every action lives.
  function openMeetings() {
    navigate(meetingsPath);
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <MeetingAnalyticsHero headline={headline} meetingsPath={meetingsPath} />

      {meetingsQuery.isLoading ? (
        <LoadingTiles />
      ) : meetings.length === 0 ? (
        <EmptyState meetingsPath={meetingsPath} />
      ) : (
        <>
          {/* Where everything stands: the meetings themselves, and the
              invitations that were sent for them. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <MeetingStatusRing meetings={meetings} />
            <MeetingResponseRing meetings={meetings} />
          </div>

          {/* How the load has moved over time, and what is still to come. */}
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <MeetingLoadChart meetings={meetings} />
            </div>
            <UpcomingMeetings meetings={meetings} onView={openMeetings} />
          </div>

          {/* Which hours of the week the meetings really eat. */}
          <MeetingTimeHeatmap meetings={meetings} />

          {/* What is wrong right now, how long meetings run, and whether
              they are actually run properly. */}
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <MeetingAttentionPanel meetings={meetings} onOpen={openMeetings} />
            <MeetingDurationChart meetings={meetings} />
            <MeetingFollowUpTile meetings={meetings} />
          </div>

          {/* The two sides of every meeting: the people in the room, and the
              person who put them there. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <MeetingPeopleChart meetings={meetings} />
            <MeetingOrganizerChart meetings={meetings} />
          </div>
        </>
      )}
    </div>
  );
}

// Grey tiles in the shape of the real ones, so the page does not jump when
// the meetings arrive from the server.
function LoadingTiles() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <TileSkeleton />
        <TileSkeleton />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <TileSkeleton className="h-96 xl:col-span-2" />
        <TileSkeleton className="h-96" />
      </div>
      <TileSkeleton className="h-80" />
    </div>
  );
}

// A workspace that has never scheduled a meeting would only see nine empty
// tiles, which says nothing. It gets one line and the way to start instead.
function EmptyState(props: { meetingsPath: string }) {
  return (
    <div className={TILE}>
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          <CalendarPlus className="h-6 w-6" />
        </span>
        <p className="text-lg font-semibold tracking-tight">
          There is nothing to analyse yet
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          The charts on this page are built from your meetings. Schedule the
          first one and this dashboard fills itself in.
        </p>
        <Button asChild className="mt-1">
          <Link to={props.meetingsPath}>Schedule a meeting</Link>
        </Button>
      </div>
    </div>
  );
}
