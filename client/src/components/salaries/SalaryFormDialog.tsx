import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonInline } from "@/components/common/PersonInline";
import { AllowanceRows } from "@/components/salaries/AllowanceRows";
import { salarySchema } from "@/validators/salary.schema";
import type { SalaryFormValues } from "@/validators/salary.schema";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateSalary, useUpdateSalary } from "@/hooks/useSalaries";
import {
  SALARY_TYPE_OPTIONS,
  getSalaryTypeSuffix,
  formatMoney,
} from "@/types/salary.types";
import type { Salary } from "@/types/salary.types";

// The empty form we start from when we create a new salary structure.
const emptyForm: SalaryFormValues = {
  employeeId: "",
  salaryType: "monthly",
  basicSalary: 0,
  grossSalary: 0,
  netSalary: 0,
  allowances: [],
};

// One dialog for both jobs:
// - salary is null  -> we are creating a new salary structure
// - salary is given -> we are editing that one
//
// takenEmployeeIds is everybody who already HAS a salary structure. An
// employee can have only one, so those people are not offered in the
// dropdown. The server refuses a second one as well: this only keeps the
// person from choosing something that would be refused anyway.
export function SalaryFormDialog(props: {
  isOpen: boolean;
  salary: Salary | null;
  takenEmployeeIds: string[];
  onClose: () => void;
}) {
  const employeesQuery = useEmployees();
  const createSalary = useCreateSalary();
  const updateSalary = useUpdateSalary();

  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.salary) {
      form.reset(emptyForm);
      return;
    }

    form.reset({
      employeeId: props.salary.employee ? props.salary.employee._id : "",
      salaryType: props.salary.salaryType,
      basicSalary: props.salary.basicSalary,
      grossSalary: props.salary.grossSalary,
      netSalary: props.salary.netSalary,
      allowances: (props.salary.allowances || []).map((allowance) => ({
        name: allowance.name,
        amount: allowance.amount,
        description: allowance.description,
      })),
    });
  }, [props.isOpen, props.salary, form]);

  const employeeId = form.watch("employeeId");
  const salaryType = form.watch("salaryType");
  const basicSalary = form.watch("basicSalary");
  const allowances = form.watch("allowances") || [];

  // The people we may still give a salary to: the ones without a salary
  // structure, plus the person of the salary we are editing right now
  // (otherwise their own name would disappear from their own form).
  const choosableEmployees = (employeesQuery.data || []).filter((employee) => {
    if (props.salary && props.salary.employee?._id === employee._id) {
      return true;
    }

    return !props.takenEmployeeIds.includes(employee._id);
  });

  // Basic salary plus every allowance. It is only a hint: the gross and the
  // net salary are written by hand, because an organization may count them
  // differently (a deduction, a tax, a bonus). The button below simply saves
  // the typing when the sum IS the answer.
  let suggestedGross = isNaN(basicSalary) ? 0 : basicSalary;

  allowances.forEach((allowance) => {
    if (!isNaN(allowance.amount)) {
      suggestedGross = suggestedGross + allowance.amount;
    }
  });

  function applySuggestedGross() {
    form.setValue("grossSalary", suggestedGross, { shouldValidate: true });
  }

  function onSubmit(values: SalaryFormValues) {
    if (props.salary) {
      updateSalary.mutate(
        { id: props.salary._id, values: values },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createSalary.mutate(values, { onSuccess: () => props.onClose() });
    }
  }

  const isSaving = createSalary.isPending || updateSalary.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {props.salary ? "Edit salary structure" : "Create salary structure"}
          </DialogTitle>
          <DialogDescription>
            Every employee has one salary structure: what they earn, and the
            allowances paid on top of it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* --- The employee --- */}
          <div className="flex flex-col gap-2">
            <Label>Employee</Label>
            <Select
              value={employeeId}
              onValueChange={(value) =>
                form.setValue("employeeId", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    employeesQuery.isLoading
                      ? "Loading the people..."
                      : "Choose an employee"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {choosableEmployees.map((employee) => (
                  <SelectItem key={employee._id} value={employee._id}>
                    <PersonInline
                      name={employee.name}
                      photo={employee.photo}
                      note={employee.designation || employee.department?.name || ""}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              An employee can have only one salary structure, so the people who
              already have one are not in this list.
            </p>
            {form.formState.errors.employeeId ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.employeeId.message}
              </p>
            ) : null}
          </div>

          {/* --- The salary type --- */}
          <div className="flex flex-col gap-2">
            <Label>Salary type</Label>
            <Select
              value={salaryType}
              onValueChange={(value) =>
                form.setValue(
                  "salaryType",
                  value as "monthly" | "daily" | "hourly",
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose the salary type" />
              </SelectTrigger>
              <SelectContent>
                {SALARY_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The three amounts below are all counted {getSalaryTypeSuffix(salaryType)}.
            </p>
            {form.formState.errors.salaryType ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.salaryType.message}
              </p>
            ) : null}
          </div>

          {/* --- The three amounts --- */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="salary-basic">Basic salary</Label>
              <Input
                id="salary-basic"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register("basicSalary", { valueAsNumber: true })}
              />
              {form.formState.errors.basicSalary ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.basicSalary.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="salary-gross">Gross salary</Label>
              <Input
                id="salary-gross"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register("grossSalary", { valueAsNumber: true })}
              />
              {form.formState.errors.grossSalary ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.grossSalary.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="salary-net">Net salary</Label>
              <Input
                id="salary-net"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register("netSalary", { valueAsNumber: true })}
              />
              {form.formState.errors.netSalary ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.netSalary.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* The hint: basic salary plus the allowances. */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
            <span className="text-muted-foreground">
              Basic salary + allowances ={" "}
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(suggestedGross)}
              </span>
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={applySuggestedGross}
            >
              Use as gross salary
            </Button>
          </div>

          {/* --- The allowances, added and removed without a reload --- */}
          <AllowanceRows form={form} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.salary ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
