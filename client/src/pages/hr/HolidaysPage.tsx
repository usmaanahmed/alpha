import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { HolidayTable } from "@/components/hr/HolidayTable";
import { HolidayFormDialog } from "@/components/hr/HolidayFormDialog";
import { useHolidays, useDeleteHoliday } from "@/hooks/useHolidays";
import { useOpenCreateFromUrl } from "@/hooks/useOpenCreateFromUrl";
import { useAuth } from "@/context/AuthContext";
import { PERMISSIONS } from "@/lib/permissions";
import type { Holiday } from "@/types/hr.types";

// The years shown in the small dropdown: last year, this year, next year.
const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1];

// The holiday calendar of the organization.
//
// Every employee can open this page and read the list, but the buttons that
// change it are only shown to somebody whose role carries the matching
// holiday permission.
export function HolidaysPage() {
  const { can } = useAuth();

  const [year, setYear] = useState(THIS_YEAR);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<Holiday | null>(null);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const holidaysQuery = useHolidays(year);
  const deleteHoliday = useDeleteHoliday();

  const canManage = can(PERMISSIONS.HOLIDAYS_CREATE);
  const canEdit = can(PERMISSIONS.HOLIDAYS_EDIT);
  const canDelete = can(PERMISSIONS.HOLIDAYS_DELETE);

  function openCreateForm() {
    setHolidayToEdit(null);
    setIsFormOpen(true);
  }

  // Opened from the "New Holiday" tile on the dashboard ("?new=1").
  useOpenCreateFromUrl(openCreateForm, canManage);

  function openEditForm(holiday: Holiday) {
    setHolidayToEdit(holiday);
    setIsFormOpen(true);
  }

  function confirmDelete() {
    if (!holidayToDelete) {
      return;
    }

    deleteHoliday.mutate(holidayToDelete._id, {
      onSuccess: () => setHolidayToDelete(null),
    });
  }

  return (
    <div>
      <PageHeader
        title="Holidays"
        description="The days the office is closed. A holiday inside a leave is not counted as a leave day."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((oneYear) => (
                  <SelectItem key={oneYear} value={String(oneYear)}>
                    {oneYear}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canManage ? (
              <Button onClick={openCreateForm}>
                <Plus className="h-4 w-4" />
                New Holiday
              </Button>
            ) : null}
          </div>
        }
      />

      <HolidayTable
        data={holidaysQuery.data || []}
        isLoading={holidaysQuery.isLoading}
        isFetching={holidaysQuery.isFetching}
        canEdit={canEdit}
        canDelete={canDelete}
        onEdit={openEditForm}
        onDelete={setHolidayToDelete}
      />

      <HolidayFormDialog
        isOpen={isFormOpen}
        holiday={holidayToEdit}
        onClose={() => setIsFormOpen(false)}
      />

      <ConfirmDialog
        isOpen={holidayToDelete !== null}
        title="Delete holiday"
        description={
          "The holiday \"" + (holidayToDelete?.name || "") + "\" will be removed."
        }
        isPending={deleteHoliday.isPending}
        onConfirm={confirmDelete}
        onClose={() => setHolidayToDelete(null)}
      />
    </div>
  );
}
