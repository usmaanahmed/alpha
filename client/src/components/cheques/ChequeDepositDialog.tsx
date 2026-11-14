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
import { chequeDepositSchema } from "@/validators/cheque.schema";
import type { ChequeDepositFormValues } from "@/validators/cheque.schema";
import { useDepositCheque } from "@/hooks/useCheques";
import { todayInputValue } from "@/lib/date";
import type { Cheque } from "@/types/cheque.types";

// The "deposit" form: take the cheque to the bank.
export function ChequeDepositDialog(props: {
  cheque: Cheque | null;
  onClose: () => void;
}) {
  const depositCheque = useDepositCheque();

  const form = useForm<ChequeDepositFormValues>({
    resolver: zodResolver(chequeDepositSchema),
    defaultValues: {
      date: "",
      bank: "",
      depositedBy: "",
      slipNumber: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (props.cheque) {
      form.reset({
        // The deposit is usually done today, so we fill today's date.
        date: todayInputValue(),
        bank: props.cheque.bank,
        depositedBy: "",
        slipNumber: "",
        remarks: "",
      });
    }
  }, [props.cheque, form]);

  function onSubmit(values: ChequeDepositFormValues) {
    if (!props.cheque) {
      return;
    }

    depositCheque.mutate(
      { id: props.cheque._id, values: values },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.cheque !== null} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit cheque</DialogTitle>
          <DialogDescription>
            Record that cheque {props.cheque?.chequeNumber} was deposited at the
            bank. After this you can mark it cleared or bounced.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-date">Deposit date</Label>
              <Input id="deposit-date" type="date" {...form.register("date")} />
              {form.formState.errors.date ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.date.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-bank">Deposit bank (optional)</Label>
              <Input
                id="deposit-bank"
                placeholder="Bank the cheque went to"
                {...form.register("bank")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-by">Deposited by (optional)</Label>
              <Input
                id="deposit-by"
                placeholder="Person who deposited it"
                {...form.register("depositedBy")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="deposit-slip">Deposit slip number (optional)</Label>
              <Input
                id="deposit-slip"
                placeholder="Slip number"
                {...form.register("slipNumber")}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="deposit-remarks">Remarks (optional)</Label>
            <Textarea id="deposit-remarks" rows={2} {...form.register("remarks")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={depositCheque.isPending}>
              {depositCheque.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Mark as deposited
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
