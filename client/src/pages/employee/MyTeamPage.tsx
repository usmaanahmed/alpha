import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { MyTeamCard } from "@/components/teams/MyTeamCard";
import { TeamMembersDialog } from "@/components/teams/TeamMembersDialog";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { useMyTeams } from "@/hooks/useTeams";
import type { MyTeam } from "@/types/team.types";

// The page of the team lead, and of everybody who is in a team.
//
// A lead sees their people with how much work each one still has open, can
// change who is in the team, and can give a task to somebody straight from
// the list. A normal member only reads the same card.
export function MyTeamPage() {
  const myTeamsQuery = useMyTeams();

  const [teamForMembers, setTeamForMembers] = useState<MyTeam | null>(null);

  // The "give task" dialog. isTaskFormOpen says if it is open, and
  // memberToAssign is the person already chosen inside it ("" means
  // nobody yet).
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [memberToAssign, setMemberToAssign] = useState("");

  function openTaskForm(memberId: string) {
    setMemberToAssign(memberId);
    setIsTaskFormOpen(true);
  }

  const teams = myTeamsQuery.data || [];
  const iLeadSomething = teams.some((team) => team.isTeamLead);

  return (
    <div>
      <PageHeader
        title="My Team"
        description={
          iLeadSomething
            ? "The people under you. Give them a task, or change who is in the team."
            : "The team you belong to."
        }
      />

      {myTeamsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your team...</p>
      ) : teams.length === 0 ? (
        <p className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          You are not in a team yet. Your organization decides who is in which
          team.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {teams.map((team) => (
            <MyTeamCard
              key={team._id}
              team={team}
              onManageMembers={setTeamForMembers}
              onAssignTask={openTaskForm}
            />
          ))}
        </div>
      )}

      <TeamMembersDialog
        teamId={teamForMembers ? teamForMembers._id : null}
        teamName={teamForMembers ? teamForMembers.name : ""}
        currentMemberIds={(teamForMembers?.members || []).map(
          (member) => member._id
        )}
        onClose={() => setTeamForMembers(null)}
      />

      {/* The same "new task" form the manager uses. The server sends only
          the people this lead may choose, so the dropdown is already safe. */}
      <TaskFormDialog
        isOpen={isTaskFormOpen}
        task={null}
        defaultAssignedTo={memberToAssign}
        onClose={() => setIsTaskFormOpen(false)}
      />
    </div>
  );
}
