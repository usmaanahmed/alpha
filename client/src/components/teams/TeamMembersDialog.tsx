import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TeamMemberPicker } from "@/components/teams/TeamMemberPicker";
import { useTeamCandidates, useUpdateTeamMembers } from "@/hooks/useTeams";

// The small dialog that only changes WHO is in a team.
//
// Two people open it: the organization from the team table, and the team
// lead from the "My Team" page. The server checks the same rule again, so
// a lead can only ever save their own team.
//
// The dialog is open while teamId is not null, like the other "one row"
// dialogs of the app.
export function TeamMembersDialog(props: {
  teamId: string | null;
  teamName: string;
  currentMemberIds: string[];
  onClose: () => void;
}) {
  const isOpen = props.teamId !== null;

  const candidatesQuery = useTeamCandidates(props.teamId || "", isOpen);
  const updateMembers = useUpdateTeamMembers();

  // What is ticked right now. It starts from the members the team already
  // has, and the user adds and removes from there.
  const [selected, setSelected] = useState<string[]>([]);

  // We only copy the members when the dialog OPENS. The parent builds
  // props.currentMemberIds with a .map(), so it is a brand new list on
  // every render: watching it here would throw away the ticks the user
  // just made.
  useEffect(() => {
    if (isOpen) {
      setSelected(props.currentMemberIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, props.teamId]);

  function onSave() {
    if (!props.teamId) {
      return;
    }

    updateMembers.mutate(
      { id: props.teamId, memberIds: selected },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Members of {props.teamName}</DialogTitle>
          <DialogDescription>
            Only the active people of this team's department are listed, and
            only the ones who are not already in another team.
          </DialogDescription>
        </DialogHeader>

        <TeamMemberPicker
          people={candidatesQuery.data || []}
          selected={selected}
          onChange={setSelected}
          isLoading={candidatesQuery.isLoading}
          emptyText="Everybody of this department is already in a team."
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={updateMembers.isPending}>
            {updateMembers.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save members
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
