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
import { chequeClearanceSchema } from "@/validators/cheque.schema";
import type { ChequeClearanceFormValues } from "@/validators/cheque.schema";
import { useClearCheque } from "@/hooks/useCheques";
import { todayInputValue } from "@/lib/date";
import type { Cheque } from "@/types/cheque.types";

// The "clearance" form: the bank paid the cheque, the money moved.
export function ChequeClearanceDialog(props: {
  cheque: Cheque | null;
  onClose: () => void;
}) {
  const clearCheque = useClearCheque();

  const form = useForm<ChequeClearanceFormValues>({
    resolver: zodResolver(chequeClearanceSchema),
    defaultValues: {
      date: "",
      clearedBy: "",
      bankReference: "",
      transactionId: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (props.cheque) {
      form.reset({
        date: todayInputValue(),
        clearedBy: "",
        bankReference: "",
        transactionId: "",
        remarks: "",
      });
    }
  }, [props.cheque, form]);

  function onSubmit(values: ChequeClearanceFormValues) {
    if (!props.cheque) {
      return;
    }

    clearCheque.mutate(
      { id: props.cheque._id, values: values },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.cheque !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear cheque</DialogTitle>
          <DialogDescription>
            Record that cheque {props.cheque?.chequeNumber} was cleared by the
            bank. This is the happy end of a cheque.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="clear-date">Clearance date</Label>
              <Input id="clear-date" type="date" {...form.register("date")} />
              {form.formState.errors.date ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.date.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clear-by">Cleared by (optional)</Label>
              <Input
                id="clear-by"
                placeholder="Person who confirmed it"
                {...form.register("clearedBy")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clear-reference">Bank reference (optional)</Label>
              <Input
                id="clear-reference"
                placeholder="Reference from the bank"
                {...form.register("bankReference")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="clear-transaction">Transaction ID (optional)</Label>
              <Input
                id="clear-transaction"
                placeholder="Transaction id"
                {...form.register("transactionId")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clear-remarks">Remarks (optional)</Label>
            <Textarea id="clear-remarks" rows={2} {...form.register("remarks")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={clearCheque.isPending}>
              {clearCheque.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Mark as cleared
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
