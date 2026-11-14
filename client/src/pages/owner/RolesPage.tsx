import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useRoleTemplates, usePermissionCatalog } from "@/hooks/useRoles";

// SaaS owner -> Default roles.
//
// Roles are not shared any more: every organization writes its own and ticks
// its own permissions. What the SaaS owner still decides is the set of roles a
// brand NEW organization starts with, and that is this page. It only reads:
// the moment an organization is created it gets its own copy of these roles
// and does whatever it wants with them.
export function RolesPage() {
  const templatesQuery = useRoleTemplates();
  const catalogQuery = usePermissionCatalog();

  const templates = templatesQuery.data || [];
  const groups = catalogQuery.data || [];

  // "employees.create" -> "Employees · Create", so the cards show real words
  // instead of the keys the database keeps.
  function labelOf(permission: string) {
    for (const group of groups) {
      const item = group.items.find((one) => one.key === permission);

      if (item) {
        return group.label + " · " + item.label;
      }
    }

    return permission;
  }

  // How many permissions exist in the whole app, so "everything" can be shown
  // as such instead of as a long list of forty badges.
  const totalPermissions = groups.reduce(
    (total, group) => total + group.items.length,
    0
  );

  return (
    <div>
      <PageHeader
        title="Default roles"
        description="The roles every new organization starts with. Each organization then owns its copy: it renames them, re-ticks their permissions or deletes them by itself."
      />

      {templatesQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            const hasEverything =
              totalPermissions > 0 &&
              template.permissions.length >= totalPermissions;

            return (
              <Card key={template.name}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {template.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                </CardHeader>

                <CardContent className="flex flex-wrap gap-1.5">
                  {template.permissions.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      No permission: this person only ever sees their own work.
                    </span>
                  ) : hasEverything ? (
                    <Badge>Every permission of the app</Badge>
                  ) : (
                    template.permissions.map((permission) => (
                      <Badge key={permission} variant="secondary">
                        {labelOf(permission)}
                      </Badge>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
