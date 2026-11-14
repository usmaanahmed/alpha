import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { chequeSchema } from "@/validators/cheque.schema";
import type { ChequeFormValues } from "@/validators/cheque.schema";
import {
  useCreateCheque,
  useUpdateCheque,
  useUploadChequeScan,
} from "@/hooks/useCheques";
import { ChequeScanInput } from "./ChequeScanInput";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import {
  CHEQUE_TYPE_OPTIONS,
  CHEQUE_PARTY_TYPE_OPTIONS,
  CHEQUE_START_STATUS_OPTIONS,
  toChequeDateInput,
} from "@/types/cheque.types";
import type { Cheque } from "@/types/cheque.types";

// The form we start from when we add a new cheque.
const emptyForm: ChequeFormValues = {
  chequeNumber: "",
  bank: "",
  bankAccount: "",
  type: "received",
  partyType: "customer",
  partyName: "",
  amount: 0,
  issueDate: "",
  chequeDate: "",
  dueDate: "",
  description: "",
  status: "draft",
};

// One dialog for both jobs:
// - cheque is null  -> we are adding a new cheque
// - cheque is given -> we are editing that cheque
//
// The scan is a separate request, so after the cheque is saved we send the
// chosen file (if any) to the scan route.
export function ChequeFormDialog(props: {
  isOpen: boolean;
  cheque: Cheque | null;
  onClose: () => void;
}) {
  const { hasFeature } = useAuth();

  const createCheque = useCreateCheque();
  const updateCheque = useUpdateCheque();
  const uploadScan = useUploadChequeScan();

  // The scan file the user chose but did not send yet.
  const [scanFile, setScanFile] = useState<File | null>(null);

  const isEditing = props.cheque !== null;

  const form = useForm<ChequeFormValues>({
    resolver: zodResolver(chequeSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    // Every time the dialog opens we forget the last chosen file.
    setScanFile(null);

    if (!props.cheque) {
      form.reset(emptyForm);
      return;
    }

    // When we edit a cheque whose status is already past "received", the
    // status dropdown only offers draft / issued / received, so we fall back
    // to "draft". The server ignores this field on an edit anyway: the status
    // is only moved through the management actions.
    const startStatus =
      props.cheque.status === "issued" || props.cheque.status === "received"
        ? props.cheque.status
        : "draft";

    form.reset({
      chequeNumber: props.cheque.chequeNumber,
      bank: props.cheque.bank,
      bankAccount: props.cheque.bankAccount,
      type: props.cheque.type,
      partyType: props.cheque.partyType,
      partyName: props.cheque.partyName,
      amount: props.cheque.amount,
      issueDate: toChequeDateInput(props.cheque.issueDate),
      chequeDate: toChequeDateInput(props.cheque.chequeDate),
      dueDate: toChequeDateInput(props.cheque.dueDate),
      description: props.cheque.description,
      status: startStatus,
    });
  }, [props.isOpen, props.cheque, form]);

  function onSubmit(values: ChequeFormValues) {
    if (props.cheque) {
      const chequeId = props.cheque._id;

      updateCheque.mutate(
        { id: chequeId, values: values },
        {
          onSuccess: () => {
            // If a new scan was chosen, send it, then close.
            if (scanFile) {
              uploadScan.mutate(
                { id: chequeId, file: scanFile },
                { onSuccess: () => props.onClose() }
              );
            } else {
              props.onClose();
            }
          },
        }
      );
    } else {
      createCheque.mutate(values, {
        onSuccess: (response) => {
          // The server sends the new cheque back, so we know its id and can
          // attach the scan right away.
          const newCheque = response.data;

          if (scanFile && newCheque?._id) {
            uploadScan.mutate(
              { id: newCheque._id, file: scanFile },
              { onSuccess: () => props.onClose() }
            );
          } else {
            props.onClose();
          }
        },
      });
    }
  }

  const isSaving =
    createCheque.isPending || updateCheque.isPending || uploadScan.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{props.cheque ? "Edit cheque" : "New cheque"}</DialogTitle>
          <DialogDescription>
            A "received" cheque is money coming in, an "issued" cheque is money
            going out. After it is saved you move it through its life from the
            cheque details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* --- The cheque and the bank --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-number">Cheque number</Label>
              <Input
                id="cheque-number"
                placeholder="000123"
                {...form.register("chequeNumber")}
              />
              {form.formState.errors.chequeNumber ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.chequeNumber.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-bank">Bank</Label>
              <Input
                id="cheque-bank"
                placeholder="City Bank"
                {...form.register("bank")}
              />
              {form.formState.errors.bank ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.bank.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-account">Bank account (optional)</Label>
              <Input
                id="cheque-account"
                placeholder="Account number or name"
                {...form.register("bankAccount")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-amount">Amount</Label>
              <Input
                id="cheque-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="1500"
                {...form.register("amount", { valueAsNumber: true })}
              />
              {form.formState.errors.amount ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              ) : null}
            </div>
          </div>

          {/* --- Type and party --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Cheque type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value) =>
                  form.setValue("type", value as ChequeFormValues["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHEQUE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Party type</Label>
              <Select
                value={form.watch("partyType")}
                onValueChange={(value) =>
                  form.setValue(
                    "partyType",
                    value as ChequeFormValues["partyType"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHEQUE_PARTY_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="cheque-party">Party name (optional)</Label>
              <Input
                id="cheque-party"
                placeholder="Who the cheque is for or from"
                {...form.register("partyName")}
              />
            </div>
          </div>

          {/* --- The three dates --- */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-issue-date">Issue date (optional)</Label>
              <Input
                id="cheque-issue-date"
                type="date"
                {...form.register("issueDate")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-date">Cheque date (optional)</Label>
              <Input
                id="cheque-date"
                type="date"
                {...form.register("chequeDate")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cheque-due-date">Due date (optional)</Label>
              <Input
                id="cheque-due-date"
                type="date"
                {...form.register("dueDate")}
              />
            </div>
          </div>

          {/* The starting status is only asked when we create the cheque.
              After that it moves through the management actions. */}
          {!isEditing ? (
            <div className="flex flex-col gap-2">
              <Label>Starting status</Label>
              <Select
                value={form.watch("status")}
                onValueChange={(value) =>
                  form.setValue("status", value as ChequeFormValues["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHEQUE_START_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                "Draft" is a cheque you are still preparing. Choose "Issued" or
                "Received" if the cheque already changed hands.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="cheque-description">Description / remarks (optional)</Label>
            <Textarea
              id="cheque-description"
              rows={2}
              placeholder="Any note about this cheque"
              {...form.register("description")}
            />
          </div>

          {/* The picture of the paper cheque is a section of its own, so
              an organization can keep its cheques without the scans. */}
          {hasFeature(FEATURES.CHEQUES_SCAN) ? (
            <ChequeScanInput
              currentScan={props.cheque?.attachment || null}
              file={scanFile}
              onChange={setScanFile}
            />
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.cheque ? "Save changes" : "Create cheque"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
