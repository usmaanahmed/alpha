import { Link } from "react-router-dom";
import { ListChecks, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useTasks } from "@/hooks/useTasks";
import { PERMISSIONS } from "@/lib/permissions";

// The first page an employee (or a manager) sees after the login.
export function EmployeeDashboardPage() {
  const { user, can } = useAuth();
  const myTasksQuery = useTasks("assigned");

  // Somebody who may give tasks reads a different welcome line. That is the
  // permission of their role, or being the lead of a team, which is not a
  // role at all but still lets them hand work to their own people.
  const canAssignTasks =
    can(PERMISSIONS.TASKS_ASSIGN) || user?.isTeamLead === true;

  const myTasks = myTasksQuery.data || [];

  // Three simple counts of my own tasks.
  const openTasks = myTasks.filter(
    (task) => task.status === "todo" || task.status === "in_progress"
  );
  const completedTasks = myTasks.filter((task) => task.status === "completed");

  return (
    <div>
      <PageHeader
        avatar={
          // A bit bigger than the normal one, because it stands next to the
          // big title of the page.
          <Avatar
            name={user?.name || ""}
            photo={user?.photo || ""}
            className="h-12 w-12 text-base"
          />
        }
        title={"Hello " + (user?.name || "")}
        description={
          canAssignTasks
            ? "You can also give tasks to other people."
            : "Here are the tasks you have to do."
        }
        action={
          <Button asChild>
            <Link to="/employee/my-tasks">Open my tasks</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">All my tasks</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{myTasks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Still open</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{openTasks.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{completedTasks.length}</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>{user?.organizationName}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Login email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department</span>
              <span>{user?.departmentName || "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <span>{user?.roleName || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
