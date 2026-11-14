import { ClipboardList, UserCog, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/common/Avatar";
import type { MyTeam } from "@/types/team.types";

// One team of the logged in employee.
//
// The same card is used by the lead and by a normal member: only the lead
// gets the two buttons, because only the lead can change the people and
// give the work. The server checks that again on every request.
export function MyTeamCard(props: {
  team: MyTeam;
  onManageMembers: (team: MyTeam) => void;
  // Called with the id of the member who should receive a new task.
  // An empty id means "open the form without anybody chosen yet".
  onAssignTask: (memberId: string) => void;
}) {
  const members = props.team.members || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          {props.team.name}

          {props.team.isTeamLead ? (
            <Badge variant="default">You are the lead</Badge>
          ) : (
            <Badge variant="secondary">You are a member</Badge>
          )}
        </CardTitle>

        <CardDescription>
          {props.team.department?.name || "No department"}
          {props.team.description ? " - " + props.team.description : ""}
        </CardDescription>

        {props.team.isTeamLead ? (
          <CardAction className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => props.onManageMembers(props.team)}
            >
              <UserCog className="h-4 w-4" />
              Manage members
            </Button>
            <Button size="sm" onClick={() => props.onAssignTask("")}>
              <ClipboardList className="h-4 w-4" />
              Assign task
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {/* The lead is shown first, because they are part of the team too,
            they simply are not one of the members. */}
        {props.team.teamLead ? (
          <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
            <Avatar
              name={props.team.teamLead.name}
              photo={props.team.teamLead.photo}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {props.team.teamLead.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {props.team.teamLead.designation || props.team.teamLead.email}
              </p>
            </div>
            <Badge variant="outline">Team lead</Badge>
          </div>
        ) : null}

        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            This team has no member yet.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <Avatar name={member.name} photo={member.photo} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {member.designation || member.email}
                </p>
              </div>

              {/* How much work this person still has open. */}
              <Badge variant={member.openTaskCount > 0 ? "secondary" : "outline"}>
                {member.openTaskCount} open
              </Badge>

              {props.team.isTeamLead ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => props.onAssignTask(member._id)}
                >
                  Give task
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
