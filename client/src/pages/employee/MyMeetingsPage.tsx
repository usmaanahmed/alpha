import { MeetingsWorkspace } from "@/components/meetings/MeetingsWorkspace";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";

// The employee's meetings page. Somebody who only answers invitations does
// not get the "Schedule meeting" button; somebody whose role carries
// "meetings.create" does.
export function MyMeetingsPage() {
  const { can } = useAuth();

  const canSchedule = can(PERMISSIONS.MEETINGS_CREATE);

  return (
    <MeetingsWorkspace
      title="My Meetings"
      description="The meetings you organized and the ones you are invited to."
      canSchedule={canSchedule}
    />
  );
}
