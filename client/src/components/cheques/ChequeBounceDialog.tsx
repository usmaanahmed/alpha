import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { chequeBounceSchema } from "@/validators/cheque.schema";
import type { ChequeBounceFormValues } from "@/validators/cheque.schema";
import { useBounceCheque } from "@/hooks/useCheques";
import { todayInputValue } from "@/lib/date";
import type { Cheque } from "@/types/cheque.types";

// The "bounce" form: the bank refused the cheque.
export function ChequeBounceDialog(props: {
  cheque: Cheque | null;
  onClose: () => void;
}) {
  const bounceCheque = useBounceCheque();

  const form = useForm<ChequeBounceFormValues>({
    resolver: zodResolver(chequeBounceSchema),
    defaultValues: {
      date: "",
      reason: "",
      charges: 0,
      actionTaken: "",
      rePresentAllowed: false,
      rePresentDate: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (props.cheque) {
      form.reset({
        date: todayInputValue(),
        reason: "",
        charges: 0,
        actionTaken: "",
        rePresentAllowed: false,
        rePresentDate: "",
        remarks: "",
      });
    }
  }, [props.cheque, form]);

  function onSubmit(values: ChequeBounceFormValues) {
    if (!props.cheque) {
      return;
    }

    bounceCheque.mutate(
      { id: props.cheque._id, values: values },
      { onSuccess: () => props.onClose() }
    );
  }

  const rePresentAllowed = form.watch("rePresentAllowed");

  return (
    <Dialog open={props.cheque !== null} onOpenChange={props.onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mark cheque as bounced</DialogTitle>
          <DialogDescription>
            Record that cheque {props.cheque?.chequeNumber} was returned unpaid
            by the bank. If it may be presented again, tick the box below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bounce-date">Bounce date</Label>
              <Input id="bounce-date" type="date" {...form.register("date")} />
              {form.formState.errors.date ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.date.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bounce-charges">Bounce charges (optional)</Label>
              <Input
                id="bounce-charges"
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                {...form.register("charges", { valueAsNumber: true })}
              />
              {form.formState.errors.charges ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.charges.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bounce-reason">Bounce reason</Label>
            <Input
              id="bounce-reason"
              placeholder="Insufficient funds, signature mismatch..."
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="bounce-action">Action taken (optional)</Label>
            <Textarea
              id="bounce-action"
              rows={2}
              placeholder="What you did about it"
              {...form.register("actionTaken")}
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              id="bounce-represent"
              type="checkbox"
              className="mt-1 h-4 w-4"
              {...form.register("rePresentAllowed")}
            />
            <div>
              <Label htmlFor="bounce-represent">Re-present allowed</Label>
              <p className="text-xs text-muted-foreground">
                Tick this if the cheque can be sent to the bank again. You can
                then re-present it from the cheque details.
              </p>
            </div>
          </div>

          {/* The re-present date only makes sense when re-presenting is
              allowed, so it appears only then. */}
          {rePresentAllowed ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="bounce-represent-date">
                Re-present date (optional)
              </Label>
              <Input
                id="bounce-represent-date"
                type="date"
                {...form.register("rePresentDate")}
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="bounce-remarks">Remarks (optional)</Label>
            <Textarea id="bounce-remarks" rows={2} {...form.register("remarks")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={bounceCheque.isPending}
            >
              {bounceCheque.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Mark as bounced
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
