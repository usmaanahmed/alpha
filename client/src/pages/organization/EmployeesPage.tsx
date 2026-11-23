import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { EmployeeFormDialog } from "@/components/employees/EmployeeFormDialog";
import { EmployeeImportResultDialog } from "@/components/employees/EmployeeImportResultDialog";
import { EmployeeSelectionDock } from "@/components/employees/EmployeeSelectionDock";
import { EmployeePasswordDialog } from "@/components/employees/EmployeePasswordDialog";
import {
  useEmployees,
  useDeleteEmployee,
  useDownloadEmployeeTemplate,
  useExportEmployees,
  useImportEmployees,
  useBulkDeleteEmployees,
  useBulkEmployeeStatus,
} from "@/hooks/useEmployees";
import type { EmployeeImportResult } from "@/api/employee.api";
import type { RowSelectionState } from "@tanstack/react-table";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Employee } from "@/types/employee.types";

export function EmployeesPage() {
  const { can } = useAuth();
  const employeesQuery = useEmployees();
  const deleteEmployee = useDeleteEmployee();
  const downloadTemplate = useDownloadEmployeeTemplate();
  const exportEmployees = useExportEmployees();
  const importEmployees = useImportEmployees();
  const bulkDelete = useBulkDeleteEmployees();
  const bulkStatus = useBulkEmployeeStatus();

  // The ticked rows of the table: { employeeId: true }. The dock at the
  // bottom works on them.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const selectedIds = Object.keys(rowSelection).filter(
    (id) => rowSelection[id]
  );

  // Of the ticked employees, who is inactive right now (can be set active)
  // and who is active right now (can be set inactive). A button is shown only
  // when it would change somebody.
  const allEmployees = employeesQuery.data || [];
  const tickedEmployees = allEmployees.filter((employee) => rowSelection[employee._id]);
  const inactiveIds = tickedEmployees
    .filter((employee) => employee.status === "inactive")
    .map((employee) => employee._id);
  const activeIds = tickedEmployees
    .filter((employee) => employee.status === "active")
    .map((employee) => employee._id);

  // The real <input type="file"> is hidden, the Import button clicks it.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<EmployeeImportResult | null>(null);

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

  function handleSheetChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files ? event.target.files[0] : null;
    // Clear the input, so choosing the same file again still triggers onChange.
    event.target.value = "";
    if (!file) {
      return;
    }

    importEmployees.mutate(file, {
      onSuccess: (result) => {
        setImportResult(result);
        if (result.createdCount > 0) {
          toast.success(result.createdCount + " employee(s) imported");
        }
      },
    });
  }

  function changeSelectedStatus(status: "active" | "inactive") {
    // Only the employees that really change: "set active" skips the ones that
    // are already active, and the other way round.
    const idsToChange = status === "active" ? inactiveIds : activeIds;
    bulkStatus.mutate(
      { ids: idsToChange, status: status },
      { onSuccess: () => setRowSelection({}) }
    );
  }

  function confirmBulkDelete() {
    bulkDelete.mutate(selectedIds, {
      onSuccess: () => {
        setIsBulkDeleteOpen(false);
        setRowSelection({});
      },
    });
  }

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
          <div className="flex flex-wrap gap-2">
            {can(PERMISSIONS.EMPLOYEES_CREATE) ? (
              <Button
                variant="outline"
                onClick={() => downloadTemplate.mutate()}
                disabled={downloadTemplate.isPending}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Template
              </Button>
            ) : null}
            {can(PERMISSIONS.EMPLOYEES_CREATE) ? (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importEmployees.isPending}
              >
                <Upload className="h-4 w-4" />
                {importEmployees.isPending ? "Importing..." : "Import"}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => exportEmployees.mutate()}
              disabled={exportEmployees.isPending}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            {can(PERMISSIONS.EMPLOYEES_CREATE) ? (
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4" />
                Add Employee
              </Button>
            ) : null}
          </div>
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
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <EmployeeSelectionDock
        selectedCount={selectedIds.length}
        canSetActive={can(PERMISSIONS.EMPLOYEES_EDIT) && inactiveIds.length > 0}
        canSetInactive={can(PERMISSIONS.EMPLOYEES_EDIT) && activeIds.length > 0}
        canDelete={can(PERMISSIONS.EMPLOYEES_DELETE)}
        isBusy={bulkStatus.isPending || bulkDelete.isPending}
        onSetActive={() => changeSelectedStatus("active")}
        onSetInactive={() => changeSelectedStatus("inactive")}
        onDelete={() => setIsBulkDeleteOpen(true)}
        onClear={() => setRowSelection({})}
      />

      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        title="Delete selected employees"
        description={
          selectedIds.length +
          " employee(s) will be deleted. An employee who still has tasks, leave requests or a team to lead is skipped."
        }
        isPending={bulkDelete.isPending}
        onConfirm={confirmBulkDelete}
        onClose={() => setIsBulkDeleteOpen(false)}
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

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleSheetChosen}
      />

      <EmployeeImportResultDialog
        result={importResult}
        onClose={() => setImportResult(null)}
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
