import { MeetingsWorkspace } from "@/components/meetings/MeetingsWorkspace";

// The organization's meetings page. The organization can always schedule, so
// the "Schedule meeting" button is always shown here.
export function MeetingsPage() {
  return (
    <MeetingsWorkspace
      title="Meetings"
      description="Schedule meetings, invite your team, and track who is coming."
      canSchedule={true}
    />
  );
}
