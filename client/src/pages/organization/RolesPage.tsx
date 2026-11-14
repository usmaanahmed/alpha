import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RoleTable } from "@/components/roles/RoleTable";
import { RoleFormDialog } from "@/components/roles/RoleFormDialog";
import { useRoles, useDeleteRole } from "@/hooks/useRoles";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Role } from "@/types/role.types";

// Organization -> Roles & permissions.
//
// This is where the organization decides what each of its roles may do. The
// people who carry that role get those rights the moment it is saved.
export function RolesPage() {
  const { can } = useAuth();
  const rolesQuery = useRoles();
  const deleteRole = useDeleteRole();

  // Two people can be on this page at the same time, so the table follows
  // what the other one saves without a reload.
  useLiveUpdates();

  // isFormOpen says if the add/edit dialog is visible.
  // roleToEdit is null when we are creating a new role.
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  function openCreateForm() {
    setRoleToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Role" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.ROLES_CREATE));

  function openEditForm(role: Role) {
    setRoleToEdit(role);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!roleToDelete) {
      return;
    }

    deleteRole.mutate(roleToDelete._id, {
      onSuccess: () => setRoleToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="Every role belongs to your organization. Tick what a role may do, and everybody who carries it gets exactly that."
        action={
          can(PERMISSIONS.ROLES_CREATE) ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              New Role
            </Button>
          ) : null
        }
      />

      <RoleTable
        data={rolesQuery.data || []}
        isLoading={rolesQuery.isLoading}
        isFetching={rolesQuery.isFetching}
        canEdit={can(PERMISSIONS.ROLES_EDIT)}
        canDelete={can(PERMISSIONS.ROLES_DELETE)}
        onEdit={openEditForm}
        onDelete={setRoleToDelete}
      />

      <RoleFormDialog
        isOpen={isFormOpen}
        role={roleToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        isOpen={roleToDelete !== null}
        title="Delete role"
        description={
          'The role "' +
          (roleToDelete?.name || "") +
          '" will be removed. A role that somebody still carries cannot be deleted: make it inactive instead.'
        }
        isPending={deleteRole.isPending}
        onConfirm={confirmDelete}
        onClose={() => setRoleToDelete(null)}
      />
    </div>
  );
}
