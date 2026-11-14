import { Badge } from "@/components/ui/badge";
import {
  getMeetingStatusLabel,
  getMeetingStatusVariant,
} from "@/types/meeting.types";
import type { MeetingStatus } from "@/types/meeting.types";

// The small coloured pill that shows the status of a meeting. The colour and
// the word both come from types/meeting.types.ts, so every screen shows the
// same thing.
export function MeetingStatusBadge(props: { status: MeetingStatus }) {
  return (
    <Badge variant={getMeetingStatusVariant(props.status)}>
      {getMeetingStatusLabel(props.status)}
    </Badge>
  );
}
