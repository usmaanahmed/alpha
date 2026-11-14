import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { OrganizationTable } from "@/components/organizations/OrganizationTable";
import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog";
import { EditOrganizationDialog } from "@/components/organizations/EditOrganizationDialog";
import { ChangePasswordDialog } from "@/components/organizations/ChangePasswordDialog";
import { ModuleSwitchesDialog } from "@/components/organizations/ModuleSwitchesDialog";
import { DeleteOrganizationDialog } from "@/components/organizations/DeleteOrganizationDialog";
import { useOrganizations } from "@/hooks/useOrganizations";
import type { Organization } from "@/types/organization.types";

export function OrganizationsPage() {
  const organizationsQuery = useOrganizations();

  // Each state below keeps the row that a dialog is working on.
  // null means the dialog is closed.
  const [organizationToEdit, setOrganizationToEdit] =
    useState<Organization | null>(null);
  const [organizationToChangePassword, setOrganizationToChangePassword] =
    useState<Organization | null>(null);
  const [organizationToDelete, setOrganizationToDelete] =
    useState<Organization | null>(null);
  // The switch board: which modules and which sections this organization
  // may use at all.
  const [organizationToEditModules, setOrganizationToEditModules] =
    useState<Organization | null>(null);

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Create organizations, give them a login password and choose which modules they can use."
        action={<CreateOrganizationDialog />}
      />

      <OrganizationTable
        data={organizationsQuery.data || []}
        isLoading={organizationsQuery.isLoading}
        isFetching={organizationsQuery.isFetching}
        onEdit={setOrganizationToEdit}
        onChangePassword={setOrganizationToChangePassword}
        onEditModules={setOrganizationToEditModules}
        onDelete={setOrganizationToDelete}
      />

      <EditOrganizationDialog
        organization={organizationToEdit}
        onClose={() => setOrganizationToEdit(null)}
      />

      <ChangePasswordDialog
        organization={organizationToChangePassword}
        onClose={() => setOrganizationToChangePassword(null)}
      />

      <ModuleSwitchesDialog
        organization={organizationToEditModules}
        onClose={() => setOrganizationToEditModules(null)}
      />

      <DeleteOrganizationDialog
        organization={organizationToDelete}
        onClose={() => setOrganizationToDelete(null)}
      />
    </div>
  );
}
