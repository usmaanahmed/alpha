import { Loader2, Pencil, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/common/Avatar";
import { useSalary } from "@/hooks/useSalaries";
import {
  getAllowances,
  getTotalAllowances,
  getSalaryTypeLabel,
  getSalaryTypeSuffix,
  formatMoney,
  formatSalaryDate,
} from "@/types/salary.types";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { Salary } from "@/types/salary.types";

// One "label: value" line, used all over this dialog.
function InfoRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="text-right font-medium tabular-nums">{props.value}</span>
    </div>
  );
}

// One of the three big amounts at the top of the dialog.
function AmountCard(props: { label: string; amount: number; note: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{props.label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {formatMoney(props.amount)}
      </p>
      <p className="text-xs text-muted-foreground">{props.note}</p>
    </div>
  );
}

// The whole salary of one employee: the amounts, and every allowance with the
// description written next to it.
//
// The page only hands over the ID, and this dialog reads the salary itself
// with GET /api/salaries/:id. That way the details are always the fresh ones,
// even when the row behind the dialog is a few minutes old.
//
// canEdit hides the "Edit" button for somebody who may only read the salaries.
export function SalaryDetailDialog(props: {
  salaryId: string | null;
  canEdit: boolean;
  onClose: () => void;
  onEdit: (salary: Salary) => void;
}) {
  // The allowances are a section of their own, so a salary can be sold as
  // one single amount.
  const { hasFeature } = useAuth();

  // salaryId is null while the dialog is closed, and then the second argument
  // is false, so no request is sent at all.
  const salaryQuery = useSalary(props.salaryId || "", props.salaryId !== null);

  if (!props.salaryId) {
    // The dialog is closed. We still return the Dialog so the close animation
    // can play, but with no content inside.
    return <Dialog open={false} onOpenChange={props.onClose} />;
  }

  const salary = salaryQuery.data;

  // The salary is still on its way, or it could not be read.
  if (!salary) {
    return (
      <Dialog open={true} onOpenChange={props.onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Salary structure</DialogTitle>
            <DialogDescription>
              {salaryQuery.isLoading
                ? "Reading the salary..."
                : "This salary could not be read."}
            </DialogDescription>
          </DialogHeader>

          {salaryQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }

  const allowances = getAllowances(salary);
  const totalAllowances = getTotalAllowances(salary);
  const suffix = getSalaryTypeSuffix(salary.salaryType);

  return (
    <Dialog open={true} onOpenChange={props.onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar
              name={salary.employee?.name || "?"}
              photo={salary.employee?.photo || ""}
              size="sm"
            />
            {salary.employee?.name || "Employee removed"}
          </DialogTitle>
          <DialogDescription>
            {getSalaryTypeLabel(salary.salaryType)} salary
            {salary.employee?.designation
              ? " · " + salary.employee.designation
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* --- The three amounts --- */}
          <div className="grid gap-3 sm:grid-cols-3">
            <AmountCard
              label="Basic salary"
              amount={salary.basicSalary}
              note={suffix}
            />
            <AmountCard
              label="Gross salary"
              amount={salary.grossSalary}
              note={suffix}
            />
            <AmountCard
              label="Net salary"
              amount={salary.netSalary}
              note={suffix}
            />
          </div>

          {props.canEdit ? (
            <div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onEdit(salary)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          ) : null}

          {/* --- The allowances --- */}
          {hasFeature(FEATURES.SALARIES_ALLOWANCES) ? (
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Allowances</p>
              <p className="text-sm font-semibold tabular-nums">
                {formatMoney(totalAllowances)}
              </p>
            </div>

            {allowances.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                This salary has no allowance. It is only the basic salary.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {allowances.map((allowance) => (
                  <li
                    key={allowance._id}
                    className="flex items-start justify-between gap-4 rounded-md bg-muted/30 p-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{allowance.name}</p>
                      {allowance.description ? (
                        <p className="text-xs text-muted-foreground">
                          {allowance.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMoney(allowance.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          ) : null}

          {/* --- The small facts --- */}
          <div className="rounded-md border p-3">
            <InfoRow
              label="Salary type"
              value={getSalaryTypeLabel(salary.salaryType)}
            />
            <InfoRow label="Email" value={salary.employee?.email || "-"} />
            <InfoRow
              label="Created"
              value={formatSalaryDate(salary.createdAt)}
            />
            <InfoRow
              label="Last updated"
              value={formatSalaryDate(salary.updatedAt)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
