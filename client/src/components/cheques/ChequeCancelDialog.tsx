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
import { chequeCancelSchema } from "@/validators/cheque.schema";
import type { ChequeCancelFormValues } from "@/validators/cheque.schema";
import { useCancelCheque } from "@/hooks/useCheques";
import { todayInputValue } from "@/lib/date";
import type { Cheque } from "@/types/cheque.types";

// The "cancel" form: stop the cheque for good.
export function ChequeCancelDialog(props: {
  cheque: Cheque | null;
  onClose: () => void;
}) {
  const cancelCheque = useCancelCheque();

  const form = useForm<ChequeCancelFormValues>({
    resolver: zodResolver(chequeCancelSchema),
    defaultValues: {
      date: "",
      cancelledBy: "",
      reason: "",
    },
  });

  useEffect(() => {
    if (props.cheque) {
      form.reset({
        date: todayInputValue(),
        cancelledBy: "",
        reason: "",
      });
    }
  }, [props.cheque, form]);

  function onSubmit(values: ChequeCancelFormValues) {
    if (!props.cheque) {
      return;
    }

    cancelCheque.mutate(
      { id: props.cheque._id, values: values },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.cheque !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel cheque</DialogTitle>
          <DialogDescription>
            Stop cheque {props.cheque?.chequeNumber}. A cancelled cheque cannot
            be moved anywhere else.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cancel-date">Cancel date</Label>
              <Input id="cancel-date" type="date" {...form.register("date")} />
              {form.formState.errors.date ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.date.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cancel-by">Cancelled by (optional)</Label>
              <Input
                id="cancel-by"
                placeholder="Person who cancelled it"
                {...form.register("cancelledBy")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-reason">Cancel reason</Label>
            <Textarea
              id="cancel-reason"
              rows={2}
              placeholder="Why the cheque is cancelled"
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={cancelCheque.isPending}
            >
              {cancelCheque.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Cancel cheque
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
