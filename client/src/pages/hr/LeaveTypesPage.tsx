import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LeaveTypeCards } from "@/components/hr/LeaveTypeCards";
import { LeaveTypeFormDialog } from "@/components/hr/LeaveTypeFormDialog";
import { LeavePolicyCard } from "@/components/hr/LeavePolicyCard";
import { useLeaveTypes, useDeleteLeaveType } from "@/hooks/useLeaves";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { LeaveType } from "@/types/hr.types";

// The kinds of leave the organization offers.
// The page is opened by the permission "leave_types.view", and each button on
// it by its own permission.
export function LeaveTypesPage() {
  const { can } = useAuth();
  const leaveTypesQuery = useLeaveTypes();
  const deleteLeaveType = useDeleteLeaveType();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [leaveTypeToEdit, setLeaveTypeToEdit] = useState<LeaveType | null>(null);
  const [leaveTypeToDelete, setLeaveTypeToDelete] = useState<LeaveType | null>(
    null
  );

  function openCreateForm() {
    setLeaveTypeToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Leave Type" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.LEAVE_TYPES_CREATE));

  function openEditForm(leaveType: LeaveType) {
    setLeaveTypeToEdit(leaveType);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!leaveTypeToDelete) {
      return;
    }

    deleteLeaveType.mutate(leaveTypeToDelete._id, {
      onSuccess: () => setLeaveTypeToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Leave types"
        description="Every employee gets these days for one year. An inactive type is hidden from the apply form."
        action={
          can(PERMISSIONS.LEAVE_TYPES_CREATE) ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              New Leave Type
            </Button>
          ) : null
        }
      />

      {/* The rules that hold for every leave type, above the types
          themselves. It is the same job: setting up how leave works here. */}
      <div className="mb-5">
        <LeavePolicyCard canEdit={can(PERMISSIONS.LEAVE_TYPES_EDIT)} />
      </div>

      <LeaveTypeCards
        data={leaveTypesQuery.data || []}
        isLoading={leaveTypesQuery.isLoading}
        canEdit={can(PERMISSIONS.LEAVE_TYPES_EDIT)}
        canDelete={can(PERMISSIONS.LEAVE_TYPES_DELETE)}
        onEdit={openEditForm}
        onDelete={setLeaveTypeToDelete}
      />

      <LeaveTypeFormDialog
        isOpen={isFormOpen}
        leaveType={leaveTypeToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        isOpen={leaveTypeToDelete !== null}
        title="Delete leave type"
        description={
          "The leave type \"" +
          (leaveTypeToDelete?.name || "") +
          "\" will be removed. A type that is already used in a request cannot be deleted."
        }
        isPending={deleteLeaveType.isPending}
        onConfirm={confirmDelete}
        onClose={() => setLeaveTypeToDelete(null)}
      />
    </div>
  );
}
