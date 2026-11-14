import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonInline } from "@/components/common/PersonInline";
import { TeamMemberPicker } from "@/components/teams/TeamMemberPicker";
import { teamSchema } from "@/validators/team.schema";
import type { TeamFormValues } from "@/validators/team.schema";
import { useActiveDepartments } from "@/hooks/useDepartments";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateTeam, useUpdateTeam, useTeams } from "@/hooks/useTeams";
import type { Team } from "@/types/team.types";

// The empty form we start from when we create a new team.
const emptyForm: TeamFormValues = {
  name: "",
  description: "",
  departmentId: "",
  teamLeadId: "",
  memberIds: [],
  status: "active",
};

// One dialog for both jobs:
// - team is null  -> we are creating a new team
// - team is given -> we are editing that team
//
// Only the organization opens this dialog. A team lead never changes the
// team itself, they only change who is inside it.
export function TeamFormDialog(props: {
  isOpen: boolean;
  team: Team | null;
  onClose: () => void;
}) {
  const departmentsQuery = useActiveDepartments();
  const employeesQuery = useEmployees();
  const teamsQuery = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.team) {
      form.reset(emptyForm);
      return;
    }

    form.reset({
      name: props.team.name,
      description: props.team.description,
      departmentId: props.team.department ? props.team.department._id : "",
      teamLeadId: props.team.teamLead ? props.team.teamLead._id : "",
      memberIds: (props.team.members || []).map((member) => member._id),
      status: props.team.status,
    });
  }, [props.isOpen, props.team, form]);

  const departmentId = form.watch("departmentId");
  const teamLeadId = form.watch("teamLeadId");
  const memberIds = form.watch("memberIds");

  // Everybody who is already a member of ANOTHER team. One employee is in
  // only one team, so those people are not offered here. The team we are
  // editing right now does not count, otherwise its own members would
  // disappear from their own form.
  const takenMemberIds: string[] = [];

  (teamsQuery.data || []).forEach((otherTeam) => {
    if (props.team && otherTeam._id === props.team._id) {
      return;
    }

    (otherTeam.members || []).forEach((member) => {
      takenMemberIds.push(member._id);
    });
  });

  // The active people of the chosen department. Both the "team lead"
  // dropdown and the member picker are built from this one list.
  const departmentPeople = (employeesQuery.data || []).filter(
    (employee) =>
      employee.status === "active" && employee.department?._id === departmentId
  );

  // The lead is never a member of its own team, and somebody who already
  // belongs to another team cannot be taken.
  const choosableMembers = departmentPeople.filter(
    (employee) =>
      employee._id !== teamLeadId && !takenMemberIds.includes(employee._id)
  );

  // Changing the department empties the two people fields, because a lead
  // and its members always work in the same department as the team.
  function onDepartmentChange(value: string) {
    form.setValue("departmentId", value, { shouldValidate: true });
    form.setValue("teamLeadId", "");
    form.setValue("memberIds", []);
  }

  // The new lead must not stay in the member list at the same time.
  function onTeamLeadChange(value: string) {
    form.setValue("teamLeadId", value, { shouldValidate: true });
    form.setValue(
      "memberIds",
      memberIds.filter((memberId) => memberId !== value)
    );
  }

  function onSubmit(values: TeamFormValues) {
    if (props.team) {
      updateTeam.mutate(
        { id: props.team._id, values: values },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createTeam.mutate(values, { onSuccess: () => props.onClose() });
    }
  }

  const isSaving = createTeam.isPending || updateTeam.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{props.team ? "Edit team" : "Create team"}</DialogTitle>
          <DialogDescription>
            A team lives inside one department. One department can have one or
            many teams.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input id="team-name" placeholder="Backend" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="team-description">Description (optional)</Label>
            <Textarea
              id="team-description"
              placeholder="What this team works on"
              {...form.register("description")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={onDepartmentChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a department" />
              </SelectTrigger>
              <SelectContent>
                {(departmentsQuery.data || []).map((department) => (
                  <SelectItem key={department._id} value={department._id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.departmentId ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.departmentId.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Team lead</Label>
            <Select
              value={teamLeadId}
              onValueChange={onTeamLeadChange}
              disabled={departmentId === ""}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    departmentId === ""
                      ? "Choose a department first"
                      : "Choose the team lead"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {departmentPeople.map((employee) => (
                  <SelectItem key={employee._id} value={employee._id}>
                    <PersonInline
                      name={employee.name}
                      photo={employee.photo}
                      note={employee.designation || employee.role?.name || ""}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The team lead gives the tasks to the members and follows their
              work.
            </p>
            {form.formState.errors.teamLeadId ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.teamLeadId.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Members (optional)</Label>
            <TeamMemberPicker
              people={choosableMembers.map((employee) => ({
                _id: employee._id,
                name: employee.name,
                photo: employee.photo,
                designation: employee.designation,
              }))}
              selected={memberIds}
              onChange={(next) => form.setValue("memberIds", next)}
              isLoading={employeesQuery.isLoading}
              emptyText={
                departmentId === ""
                  ? "Choose a department first."
                  : "Everybody of this department is already in a team."
              }
            />
            <p className="text-xs text-muted-foreground">
              One employee can be in only one team, so the people who already
              have a team are not in this list.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) =>
                form.setValue("status", value as "active" | "inactive")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              An inactive team is kept, but its lead cannot give tasks from it
              any more.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.team ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
