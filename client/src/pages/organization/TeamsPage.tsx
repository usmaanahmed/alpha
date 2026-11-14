import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TeamTable } from "@/components/teams/TeamTable";
import { TeamFormDialog } from "@/components/teams/TeamFormDialog";
import { TeamMembersDialog } from "@/components/teams/TeamMembersDialog";
import { useTeams, useDeleteTeam } from "@/hooks/useTeams";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Team } from "@/types/team.types";

// The teams are built here: one team lives inside one department, and one
// department can have one or many teams.
export function TeamsPage() {
  const { can } = useAuth();
  const teamsQuery = useTeams();
  const deleteTeam = useDeleteTeam();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [teamToEdit, setTeamToEdit] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [teamForMembers, setTeamForMembers] = useState<Team | null>(null);

  function openCreateForm() {
    setTeamToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Team" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.TEAMS_CREATE));

  function openEditForm(team: Team) {
    setTeamToEdit(team);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!teamToDelete) {
      return;
    }

    deleteTeam.mutate(teamToDelete._id, {
      onSuccess: () => setTeamToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Teams"
        description="The teams of your departments. Every team has one lead, and that lead gives the tasks to its members."
        action={
          can(PERMISSIONS.TEAMS_CREATE) ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              New Team
            </Button>
          ) : null
        }
      />

      <TeamTable
        data={teamsQuery.data || []}
        isLoading={teamsQuery.isLoading}
        isFetching={teamsQuery.isFetching}
        canEdit={can(PERMISSIONS.TEAMS_EDIT)}
        canDelete={can(PERMISSIONS.TEAMS_DELETE)}
        onEdit={openEditForm}
        onManageMembers={setTeamForMembers}
        onDelete={setTeamToDelete}
      />

      <TeamFormDialog
        isOpen={isFormOpen}
        team={teamToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <TeamMembersDialog
        teamId={teamForMembers ? teamForMembers._id : null}
        teamName={teamForMembers ? teamForMembers.name : ""}
        currentMemberIds={(teamForMembers?.members || []).map(
          (member) => member._id
        )}
        onClose={() => setTeamForMembers(null)}
      />

      <ConfirmDialog
        isOpen={teamToDelete !== null}
        title="Delete team"
        description={
          "The team \"" +
          (teamToDelete?.name || "") +
          "\" will be removed. Its people keep their job and their tasks, they simply stop being in a team."
        }
        isPending={deleteTeam.isPending}
        onConfirm={confirmDelete}
        onClose={() => setTeamToDelete(null)}
      />
    </div>
  );
}
