import { useFieldArray } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ALLOWANCE_NAME_OPTIONS,
  formatMoney,
} from "@/types/salary.types";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import type { SalaryFormValues } from "@/validators/salary.schema";

// The allowance rows of the salary form.
//
// A row is added and removed without ever leaving the page: useFieldArray is
// the react-hook-form helper that keeps a LIST of fields, and it hands us
// three things we use below:
//   fields  -> the rows to draw, each with its own id for the React key
//   append  -> add one empty row at the end
//   remove  -> take the row at that place away
//
// The name box is a normal text input with a <datalist> behind it: the browser
// shows the usual allowance names as suggestions, and whoever wants a name of
// their own simply types it. That is what "custom allowance names are
// supported" means here.
export function AllowanceRows(props: {
  form: UseFormReturn<SalaryFormValues>;
}) {
  // Without this section a salary is one single amount, so the whole block
  // of rows disappears from the form.
  const { hasFeature } = useAuth();

  const form = props.form;

  const allowanceRows = useFieldArray({
    control: form.control,
    name: "allowances",
  });

  // Every allowance amount added together, redrawn while the person types.
  const allowances = form.watch("allowances") || [];

  if (!hasFeature(FEATURES.SALARIES_ALLOWANCES)) {
    return null;
  }

  let totalAllowances = 0;

  allowances.forEach((allowance) => {
    // An empty box gives NaN, and NaN would poison the whole total, so a
    // number that is not a number counts as nothing.
    if (!isNaN(allowance.amount)) {
      totalAllowances = totalAllowances + allowance.amount;
    }
  });

  const errors = form.formState.errors;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Allowances (optional)</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            The extra amounts paid on top of the basic salary. The same
            allowance cannot be added twice.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            allowanceRows.append({ name: "", amount: 0, description: "" })
          }
        >
          <Plus className="h-4 w-4" />
          Add allowance
        </Button>
      </div>

      {/* The suggestions of the name box. One list is enough for every row. */}
      <datalist id="allowance-name-options">
        {ALLOWANCE_NAME_OPTIONS.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {allowanceRows.fields.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
          No allowance yet. This salary is only the basic salary.
        </p>
      ) : null}

      {allowanceRows.fields.map((row, index) => (
        <div key={row.id} className="rounded-md border bg-muted/30 p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {/* --- The name --- */}
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor={"allowance-name-" + index} className="text-xs">
                Allowance name
              </Label>
              {/* The register names in this file are written with backticks
                  on purpose: that is how react-hook-form is told which ROW of
                  the allowance list the box belongs to. */}
              <Input
                id={"allowance-name-" + index}
                list="allowance-name-options"
                placeholder="House Allowance"
                {...form.register(`allowances.${index}.name` as const)}
              />
              {errors.allowances?.[index]?.name ? (
                <p className="text-sm text-destructive">
                  {errors.allowances[index]?.name?.message}
                </p>
              ) : null}
            </div>

            {/* --- The amount --- */}
            <div className="flex flex-col gap-2 sm:w-44">
              <Label htmlFor={"allowance-amount-" + index} className="text-xs">
                Amount
              </Label>
              <Input
                id={"allowance-amount-" + index}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register(`allowances.${index}.amount` as const, {
                  valueAsNumber: true,
                })}
              />
              {errors.allowances?.[index]?.amount ? (
                <p className="text-sm text-destructive">
                  {errors.allowances[index]?.amount?.message}
                </p>
              ) : null}
            </div>

            {/* --- The bin --- */}
            <div className="flex flex-col gap-2">
              {/* An invisible label on the same line as the two above, so the
                  button sits next to the boxes and not above them. */}
              <span className="hidden text-xs sm:block">&nbsp;</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove this allowance"
                onClick={() => allowanceRows.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* --- The description, on its own line --- */}
          <div className="mt-3 flex flex-col gap-2">
            <Label
              htmlFor={"allowance-description-" + index}
              className="text-xs"
            >
              Description (optional)
            </Label>
            <Input
              id={"allowance-description-" + index}
              placeholder="What this allowance is for"
              {...form.register(`allowances.${index}.description` as const)}
            />
            {errors.allowances?.[index]?.description ? (
              <p className="text-sm text-destructive">
                {errors.allowances[index]?.description?.message}
              </p>
            ) : null}
          </div>
        </div>
      ))}

      {allowanceRows.fields.length > 0 ? (
        <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {allowanceRows.fields.length === 1
              ? "1 allowance"
              : allowanceRows.fields.length + " allowances"}
          </span>
          <span className="font-semibold tabular-nums">
            {formatMoney(totalAllowances)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
