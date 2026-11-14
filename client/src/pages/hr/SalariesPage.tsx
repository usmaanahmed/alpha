import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SalaryTable } from "@/components/salaries/SalaryTable";
import { SalaryFormDialog } from "@/components/salaries/SalaryFormDialog";
import { SalaryDetailDialog } from "@/components/salaries/SalaryDetailDialog";
import { useSalaries, useDeleteSalary } from "@/hooks/useSalaries";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Salary } from "@/types/salary.types";

// The salary structures of the organization: one per employee, with the
// allowances paid on top of the basic salary.
export function SalariesPage() {
  const { can } = useAuth();
  const salariesQuery = useSalaries();
  const deleteSalary = useDeleteSalary();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [salaryToEdit, setSalaryToEdit] = useState<Salary | null>(null);
  // Only the id: the view dialog reads the salary itself, so it always shows
  // the fresh one.
  const [salaryIdToView, setSalaryIdToView] = useState<string | null>(null);
  const [salaryToDelete, setSalaryToDelete] = useState<Salary | null>(null);

  const salaries = salariesQuery.data || [];

  // Everybody who already has a salary structure. The form uses it to leave
  // those people out of its dropdown, because one employee has only one.
  const takenEmployeeIds: string[] = [];

  salaries.forEach((salary) => {
    if (salary.employee) {
      takenEmployeeIds.push(salary.employee._id);
    }
  });

  function openCreateForm() {
    setSalaryToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from a "New salary" tile with "?new=1" on the address.
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.SALARIES_CREATE));

  function openEditForm(salary: Salary) {
    // The view dialog is closed first, so the form is not opened behind it.
    setSalaryIdToView(null);
    setSalaryToEdit(salary);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!salaryToDelete) {
      return;
    }

    deleteSalary.mutate(salaryToDelete._id, {
      onSuccess: () => setSalaryToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Salaries"
        description="The salary structure of every employee: the basic, gross and net amounts, and the allowances paid on top of them."
        action={
          can(PERMISSIONS.SALARIES_CREATE) ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              New Salary
            </Button>
          ) : null
        }
      />

      <SalaryTable
        data={salaries}
        isLoading={salariesQuery.isLoading}
        isFetching={salariesQuery.isFetching}
        canEdit={can(PERMISSIONS.SALARIES_EDIT)}
        canDelete={can(PERMISSIONS.SALARIES_DELETE)}
        onView={(salary) => setSalaryIdToView(salary._id)}
        onEdit={openEditForm}
        onDelete={setSalaryToDelete}
      />

      <SalaryFormDialog
        isOpen={isFormOpen}
        salary={salaryToEdit}
        takenEmployeeIds={takenEmployeeIds}
        onClose={() => setIsFormOpen(false)}
      />

      <SalaryDetailDialog
        salaryId={salaryIdToView}
        canEdit={can(PERMISSIONS.SALARIES_EDIT)}
        onClose={() => setSalaryIdToView(null)}
        onEdit={openEditForm}
      />

      <ConfirmDialog
        isOpen={salaryToDelete !== null}
        title="Delete salary structure"
        description={
          "The salary structure of " +
          (salaryToDelete?.employee?.name || "this employee") +
          " will be removed, together with all of its allowances. The employee keeps their job."
        }
        isPending={deleteSalary.isPending}
        onConfirm={confirmDelete}
        onClose={() => setSalaryToDelete(null)}
      />
    </div>
  );
}
