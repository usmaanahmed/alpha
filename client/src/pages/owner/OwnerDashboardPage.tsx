import { Link } from "react-router-dom";
import { Building2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { useOrganizations } from "@/hooks/useOrganizations";

export function OwnerDashboardPage() {
  const organizationsQuery = useOrganizations();

  const organizations = organizationsQuery.data || [];

  // Simple counting for the three small cards.
  const totalCount = organizations.length;
  const activeCount = organizations.filter(
    (organization) => organization.status === "active"
  ).length;
  const inactiveCount = organizations.filter(
    (organization) => organization.status === "inactive"
  ).length;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A short summary of all organizations."
        action={
          <Button asChild>
            <Link to="/owner/organizations">Manage organizations</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{activeCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
