import { useState } from "react";
import { Link } from "react-router-dom";
import { ChartPie, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DepartmentTable } from "@/components/departments/DepartmentTable";
import { DepartmentFormDialog } from "@/components/departments/DepartmentFormDialog";
import { useDepartments, useDeleteDepartment } from "@/hooks/useDepartments";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import { FEATURES } from "@/lib/features";
import { getModuleBase } from "@/types/auth.types";
import type { Department } from "@/types/department.types";

export function DepartmentsPage() {
  const { user, can, hasFeature } = useAuth();
  const departmentsQuery = useDepartments();
  const deleteDepartment = useDeleteDepartment();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(
    null
  );

  function openCreateForm() {
    setDepartmentToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Department" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, can(PERMISSIONS.DEPARTMENTS_CREATE));

  function openEditForm(department: Department) {
    setDepartmentToEdit(department);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!departmentToDelete) {
      return;
    }

    deleteDepartment.mutate(departmentToDelete._id, {
      onSuccess: () => setDepartmentToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        description="The departments of your organization."
        action={
          // The same page is mounted under /organization and under /employee,
          // so the way to the analytics is built and not written by hand.
          <div className="flex flex-wrap gap-2">
            {/* The analytics page is a section of its own, so the SaaS
                owner can leave the list and take the charts away. */}
            {hasFeature(FEATURES.DEPARTMENTS_DASHBOARD) ? (
              <Button asChild variant="outline">
                <Link to={getModuleBase(user?.role) + "/department-dashboard"}>
                  <ChartPie className="h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : null}

            {can(PERMISSIONS.DEPARTMENTS_CREATE) ? (
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4" />
                New Department
              </Button>
            ) : null}
          </div>
        }
      />

      <DepartmentTable
        data={departmentsQuery.data || []}
        isLoading={departmentsQuery.isLoading}
        isFetching={departmentsQuery.isFetching}
        canEdit={can(PERMISSIONS.DEPARTMENTS_EDIT)}
        canDelete={can(PERMISSIONS.DEPARTMENTS_DELETE)}
        onEdit={openEditForm}
        onDelete={setDepartmentToDelete}
      />

      <DepartmentFormDialog
        isOpen={isFormOpen}
        department={departmentToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        isOpen={departmentToDelete !== null}
        title="Delete department"
        description={
          "The department \"" +
          (departmentToDelete?.name || "") +
          "\" will be removed."
        }
        isPending={deleteDepartment.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDepartmentToDelete(null)}
      />
    </div>
  );
}
