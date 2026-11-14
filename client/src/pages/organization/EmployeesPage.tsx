import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeePasswordDialog } from "@/components/employees/EmployeePasswordDialog";
import { useEmployees, useDeleteEmployee } from "@/hooks/useEmployees";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Employee } from "@/types/employee.types";

export function EmployeesPage() {
  const { can } = useAuth();
  const employeesQuery = useEmployees();
  const deleteEmployee = useDeleteEmployee();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [employeeForPassword, setEmployeeForPassword] = useState<Employee | null>(
    null
  );

  function openCreateForm() {
    setEmployeeToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Employee" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.EMPLOYEES_CREATE));

  function openEditForm(employee: Employee) {
    setEmployeeToEdit(employee);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!employeeToDelete) {
      return;
    }

    deleteEmployee.mutate(employeeToDelete._id, {
      onSuccess: () => setEmployeeToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Open a row to see what that person is busy with today."
        action={
          can(PERMISSIONS.EMPLOYEES_CREATE) ? (
            <Button onClick={openCreateForm}>
              <Plus className="h-4 w-4" />
              Add Employee
            </Button>
          ) : null
        }
      />

      <EmployeeTable
        data={employeesQuery.data || []}
        isLoading={employeesQuery.isLoading}
        isFetching={employeesQuery.isFetching}
        canEdit={can(PERMISSIONS.EMPLOYEES_EDIT)}
        canDelete={can(PERMISSIONS.EMPLOYEES_DELETE)}
        onEdit={openEditForm}
        onChangePassword={setEmployeeForPassword}
        onDelete={setEmployeeToDelete}
      />

      <EmployeeFormDialog
        isOpen={isFormOpen}
        employee={employeeToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <EmployeePasswordDialog
        employee={employeeForPassword}
        onClose={() => setEmployeeForPassword(null)}
      />

      <ConfirmDialog
        isOpen={employeeToDelete !== null}
        title="Delete employee"
        description={
          "The employee \"" + (employeeToDelete?.name || "") + "\" will be removed."
        }
        isPending={deleteEmployee.isPending}
        onConfirm={confirmDelete}
        onClose={() => setEmployeeToDelete(null)}
      />
    </div>
  );
}
