import { useRef } from "react";
import {
  Upload,
  Trash2,
  ExternalLink,
  Pencil,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChequeStatusBadge } from "./ChequeStatusBadge";
import { ChequeVisual } from "./ChequeVisual";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { useUploadChequeScan, useDeleteChequeScan } from "@/hooks/useCheques";
import {
  formatMoney,
  formatChequeDate,
  formatChequeDateTime,
  getChequeTypeLabel,
  getPartyTypeLabel,
  getChequeStatusLabel,
  getChequeScanUrl,
} from "@/types/cheque.types";
import type { Cheque, ChequeStatus } from "@/types/cheque.types";

// One "label: value" line used all over this dialog.
function InfoRow(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="text-right font-medium">{props.value}</span>
    </div>
  );
}

// One titled block of details, for example the deposit papers. Shown only
// when that step really happened.
function DetailBlock(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="mb-1 text-sm font-semibold">{props.title}</p>
      {props.children}
    </div>
  );
}

// Work out which action buttons make sense for the status the cheque is in
// right now. The server checks the same rules again, this only hides the
// buttons that would not work anyway.
//
// "simple" actions go through the small status dialog, "deposit" / "clear" /
// "bounce" / "cancel" open their own bigger form.
interface Action {
  key: string;
  label: string;
  kind: "deposit" | "clear" | "bounce" | "cancel" | "simple";
  // Only for "simple" actions: the status we move to.
  target?: ChequeStatus;
  danger?: boolean;
}

function getActions(cheque: Cheque): Action[] {
  const status = cheque.status;

  if (status === "draft") {
    return [
      { key: "issue", label: "Mark issued", kind: "simple", target: "issued" },
      {
        key: "receive",
        label: "Mark received",
        kind: "simple",
        target: "received",
      },
      { key: "cancel", label: "Cancel", kind: "cancel", danger: true },
    ];
  }

  if (status === "issued" || status === "received") {
    return [
      { key: "deposit", label: "Deposit", kind: "deposit" },
      { key: "return", label: "Mark returned", kind: "simple", target: "returned" },
      { key: "expire", label: "Mark expired", kind: "simple", target: "expired" },
      { key: "cancel", label: "Cancel", kind: "cancel", danger: true },
    ];
  }

  if (status === "deposited") {
    return [
      { key: "clear", label: "Mark cleared", kind: "clear" },
      { key: "bounce", label: "Mark bounced", kind: "bounce", danger: true },
      { key: "return", label: "Mark returned", kind: "simple", target: "returned" },
      { key: "cancel", label: "Cancel", kind: "cancel", danger: true },
    ];
  }

  if (status === "bounced") {
    return [
      {
        key: "represent",
        label: "Re-present",
        kind: "simple",
        target: "deposited",
      },
      { key: "cancel", label: "Cancel", kind: "cancel", danger: true },
    ];
  }

  if (status === "returned") {
    return [
      { key: "deposit", label: "Deposit again", kind: "deposit" },
      { key: "cancel", label: "Cancel", kind: "cancel", danger: true },
    ];
  }

  if (status === "expired") {
    return [{ key: "cancel", label: "Cancel", kind: "cancel", danger: true }];
  }

  // cleared and cancelled are the end of the road.
  return [];
}

export function ChequeDetailDialog(props: {
  cheque: Cheque | null;
  onClose: () => void;
  onEdit: (cheque: Cheque) => void;
  onDeposit: (cheque: Cheque) => void;
  onClear: (cheque: Cheque) => void;
  onBounce: (cheque: Cheque) => void;
  onCancel: (cheque: Cheque) => void;
  // For the simple moves: the page opens the small status dialog with the
  // target status and the words to show on it.
  onSimpleMove: (cheque: Cheque, target: ChequeStatus, label: string) => void;
}) {
  const { hasFeature } = useAuth();

  const uploadScan = useUploadChequeScan();
  const deleteScan = useDeleteChequeScan();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cheque = props.cheque;

  if (!cheque) {
    // The dialog is closed. We still return the Dialog so the close animation
    // can play, but with no content inside.
    return <Dialog open={false} onOpenChange={props.onClose} />;
  }

  function handleScanChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !cheque) {
      return;
    }

    uploadScan.mutate({ id: cheque._id, file: file });

    // Let the same file be chosen again later.
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function runAction(action: Action) {
    // TypeScript loses the "not null" fact inside this nested function, so we
    // check cheque one more time here.
    if (!cheque) {
      return;
    }

    if (action.kind === "deposit") {
      props.onDeposit(cheque);
    } else if (action.kind === "clear") {
      props.onClear(cheque);
    } else if (action.kind === "bounce") {
      props.onBounce(cheque);
    } else if (action.kind === "cancel") {
      props.onCancel(cheque);
    } else if (action.kind === "simple" && action.target) {
      props.onSimpleMove(cheque, action.target, action.label);
    }
  }

  const actions = getActions(cheque);

  return (
    <Dialog open={true} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Cheque #{cheque.chequeNumber}
            <ChequeStatusBadge status={cheque.status} />
          </DialogTitle>
          <DialogDescription>
            {getChequeTypeLabel(cheque.type)} cheque of {formatMoney(cheque.amount)}
            {cheque.partyName ? " · " + cheque.partyName : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* --- The cheque itself, drawn like the real paper --- */}
          <ChequeVisual cheque={cheque} />

          {/* --- The action buttons --- */}
          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <Button
                  key={action.key}
                  size="sm"
                  variant={action.danger ? "destructive" : "default"}
                  onClick={() => runAction(action)}
                >
                  <ArrowRight className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onEdit(cheque)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">
                This cheque is {getChequeStatusLabel(cheque.status).toLowerCase()},
                so it cannot move any further.
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => props.onEdit(cheque)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </div>
          )}

          {/* --- The extra details the drawing does not already show --- */}
          <div className="rounded-md border p-3">
            <InfoRow label="Type" value={getChequeTypeLabel(cheque.type)} />
            <InfoRow
              label="Party"
              value={
                (cheque.partyName || "-") +
                " (" +
                getPartyTypeLabel(cheque.partyType) +
                ")"
              }
            />
            <InfoRow label="Issue date" value={formatChequeDate(cheque.issueDate)} />
            <InfoRow label="Cheque date" value={formatChequeDate(cheque.chequeDate)} />
            <InfoRow label="Due date" value={formatChequeDate(cheque.dueDate)} />
          </div>

          {/* --- The cheque scan --- */}
          {hasFeature(FEATURES.CHEQUES_SCAN) ? (
          <div className="rounded-md border p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Cheque scan</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadScan.isPending}
                >
                  <Upload className="h-4 w-4" />
                  {cheque.attachment ? "Replace" : "Upload"}
                </Button>
                {cheque.attachment ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteScan.mutate(cheque._id)}
                    disabled={deleteScan.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            {cheque.attachment ? (
              <a
                href={getChequeScanUrl(cheque.attachment.fileName)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                {cheque.attachment.originalName}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">No scan uploaded yet.</p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              className="hidden"
              onChange={handleScanChosen}
            />
          </div>
          ) : null}

          {/* --- The management blocks, each shown only when it happened --- */}
          {cheque.deposit ? (
            <DetailBlock title="Deposit">
              <InfoRow label="Deposit date" value={formatChequeDate(cheque.deposit.date)} />
              <InfoRow label="Deposit bank" value={cheque.deposit.bank || "-"} />
              <InfoRow label="Deposited by" value={cheque.deposit.depositedBy || "-"} />
              <InfoRow label="Slip number" value={cheque.deposit.slipNumber || "-"} />
              {cheque.deposit.remarks ? (
                <InfoRow label="Remarks" value={cheque.deposit.remarks} />
              ) : null}
            </DetailBlock>
          ) : null}

          {cheque.clearance ? (
            <DetailBlock title="Clearance">
              <InfoRow label="Clearance date" value={formatChequeDate(cheque.clearance.date)} />
              <InfoRow label="Cleared by" value={cheque.clearance.clearedBy || "-"} />
              <InfoRow label="Bank reference" value={cheque.clearance.bankReference || "-"} />
              <InfoRow label="Transaction ID" value={cheque.clearance.transactionId || "-"} />
              {cheque.clearance.remarks ? (
                <InfoRow label="Remarks" value={cheque.clearance.remarks} />
              ) : null}
            </DetailBlock>
          ) : null}

          {cheque.bounce ? (
            <DetailBlock title="Bounce">
              <InfoRow label="Bounce date" value={formatChequeDate(cheque.bounce.date)} />
              <InfoRow label="Reason" value={cheque.bounce.reason || "-"} />
              <InfoRow label="Charges" value={formatMoney(cheque.bounce.charges)} />
              <InfoRow label="Action taken" value={cheque.bounce.actionTaken || "-"} />
              <InfoRow
                label="Re-present allowed"
                value={cheque.bounce.rePresentAllowed ? "Yes" : "No"}
              />
              {cheque.bounce.rePresentDate ? (
                <InfoRow
                  label="Re-present date"
                  value={formatChequeDate(cheque.bounce.rePresentDate)}
                />
              ) : null}
              {cheque.bounce.remarks ? (
                <InfoRow label="Remarks" value={cheque.bounce.remarks} />
              ) : null}
            </DetailBlock>
          ) : null}

          {cheque.cancel ? (
            <DetailBlock title="Cancellation">
              <InfoRow label="Cancel date" value={formatChequeDate(cheque.cancel.date)} />
              <InfoRow label="Cancelled by" value={cheque.cancel.cancelledBy || "-"} />
              <InfoRow label="Reason" value={cheque.cancel.reason || "-"} />
            </DetailBlock>
          ) : null}

          {/* --- The status history --- */}
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-semibold">Status history</p>
            <ol className="flex flex-col gap-2">
              {cheque.statusHistory.map((entry) => (
                <li key={entry._id} className="flex items-start gap-3 text-sm">
                  <ChequeStatusBadge status={entry.status} />
                  <div className="min-w-0">
                    <p className="text-muted-foreground">
                      {formatChequeDateTime(entry.at)}
                      {entry.by ? " · " + entry.by.name : ""}
                    </p>
                    {entry.note ? <p>{entry.note}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
