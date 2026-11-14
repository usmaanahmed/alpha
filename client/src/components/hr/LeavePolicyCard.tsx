import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { leavePolicySchema } from "@/validators/hr.schema";
import type { LeavePolicyFormValues } from "@/validators/hr.schema";
import { useLeavePolicy, useUpdateLeavePolicy } from "@/hooks/useLeaves";

// The two numbers the approval screen measures every request against.
//
// They live here, on the leave types page, because this is where the whole
// leave module is set up: the types on one side, and the two rules that hold
// for all of them on the other.
//
// Neither number blocks anything. They only decide WHEN the approval screen
// says something out loud, and an approver can still say yes over a red
// warning, because they are the one who knows whether the week really works.
export function LeavePolicyCard(props: { canEdit: boolean }) {
  const policyQuery = useLeavePolicy();
  const updatePolicy = useUpdateLeavePolicy();

  const form = useForm<LeavePolicyFormValues>({
    resolver: zodResolver(leavePolicySchema),
    defaultValues: { minWorkforcePercent: "70", highConflictPercent: "30" },
  });

  // The server is the one that knows the saved answer, so the form is filled
  // in as soon as it arrives.
  useEffect(() => {
    if (policyQuery.data) {
      form.reset({
        // The inputs want text, and the server sends numbers.
        minWorkforcePercent: String(policyQuery.data.minWorkforcePercent),
        highConflictPercent: String(policyQuery.data.highConflictPercent),
      });
    }
  }, [policyQuery.data, form]);

  function onSubmit(values: LeavePolicyFormValues) {
    updatePolicy.mutate({
      minWorkforcePercent: Number(values.minWorkforcePercent),
      highConflictPercent: Number(values.highConflictPercent),
    });
  }

  return (
    <Card className="gap-0 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <SlidersHorizontal className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className="font-semibold">Leave policy</p>
          <p className="text-sm text-muted-foreground">
            The two numbers the approval screen uses to warn whoever is
            answering a leave request. They never block an approval.
          </p>
        </div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="policy-minimum">Minimum workforce (%)</Label>
          <Input
            id="policy-minimum"
            type="number"
            min={0}
            max={100}
            disabled={!props.canEdit}
            {...form.register("minWorkforcePercent")}
          />
          <p className="text-xs text-muted-foreground">
            Approving a leave that would leave less than this share of the
            company, or of that department, at their desks shows a red warning.
          </p>
          {form.formState.errors.minWorkforcePercent ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.minWorkforcePercent.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="policy-busy">Busy period (%)</Label>
          <Input
            id="policy-busy"
            type="number"
            min={1}
            max={100}
            disabled={!props.canEdit}
            {...form.register("highConflictPercent")}
          />
          <p className="text-xs text-muted-foreground">
            From how many people away at the same time a period is called a
            high leave conflict.
          </p>
          {form.formState.errors.highConflictPercent ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.highConflictPercent.message}
            </p>
          ) : null}
        </div>

        {props.canEdit ? (
          <div className="sm:col-span-2">
            <Button type="submit" disabled={updatePolicy.isPending}>
              {updatePolicy.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save policy
            </Button>
          </div>
        ) : null}
      </form>
    </Card>
  );
}
