import mongoose from "mongoose";
import type {
  ChequeDocument,
  ChequeInput,
  ChequeIds,
  ChequeStatusInput,
  ChequeDepositInput,
  ChequeClearanceInput,
  ChequeBounceInput,
  ChequeCancelInput,
} from "./cheque.types.js";
import * as repository from "./cheque.repository.js";
import type { ServiceActor, UploadedFile } from "../../types/service.types.js";
import type { ChequeStatus } from "./cheque.model.js";
import { deleteChequeFile } from "../../middlewares/upload.middleware.js";
import { notifyChequeStatus } from "../../utils/notification.util.js";

// ---------------------------------------------------------------------------
// Small helpers used by the routes below
// ---------------------------------------------------------------------------
// Tell the people who follow the cheques that one of them moved.
//
// The five routes at the bottom of this file (status, deposit, clear, bounce,
// cancel) all end the same way, so they all end with this one line. A
// bounced cheque is the reason it exists: that is money that did not arrive,
// and nobody should have to open the page to find out.
async function tellTheWorkspace(actor: ServiceActor, cheque: ChequeDocument, statusWord: string) {
  const me = actor.employee;
  await notifyChequeStatus({
    organizationId: String(actor.user?.organizationId),
    chequeNumber: cheque.chequeNumber,
    statusWord: statusWord,
    byName: me ? me.employee.name : "",
    actorUserId: String(actor.user?.userId),
  });
}

// The date inputs of the forms send text like "2026-07-30".
// An empty text means "no date", so we save null.
function toDate(text: string | undefined) {
  if (!text) {
    return null;
  }
  const date = new Date(text);
  // new Date("hello") gives an invalid date, we do not want to save that.
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

// The whole cheque lifecycle, drawn as a map of "from this status you may
// move to these statuses" for the SIMPLE moves only.
//
//   Draft ─► Issued / Received ─► Deposited ─► Cleared
//                                     │
//                                     └─► Bounced ─► (re-present) Deposited
//
// The four heavy steps (Deposited, Cleared, Bounced, Cancelled) have their
// own forms and their own routes further down, because they write extra
// papers. This map is only used by the small "change status" route, so it
// lists the moves that need nothing more than a short note.
const ALLOWED_SIMPLE_MOVES: Record<ChequeStatus, ChequeStatus[]> = {
  draft: ["issued", "received", "expired"],
  issued: ["received", "returned", "expired"],
  received: ["issued", "returned", "expired"],
  // A returned cheque can go back to the bank, so we allow re-presenting it.
  deposited: ["returned"],
  // Re-presenting a bounced cheque puts it back to "deposited".
  bounced: ["deposited"],
  returned: ["deposited", "issued", "received"],
  // These three are the end of the road for the simple route.
  cleared: [],
  cancelled: [],
  expired: [],
};

// Write one new line at the end of the history. The user is always the
// organization account, so "by" is its id.
function pushHistory(
  cheque: ChequeDocument,
  status: ChequeStatus,
  note: string | undefined,
  organizationId: string,
) {
  cheque.statusHistory.push({
    status: status,
    note: note || "",
    by: new mongoose.Types.ObjectId(organizationId),
    at: new Date(),
  });
}

// ---------------------------------------------------------------------------
// Reading and writing the cheque itself
// ---------------------------------------------------------------------------
// GET /api/cheques
// Every cheque of the organization, newest first. The dashboard numbers and
// the reminders are all worked out on the React side from this same list,
// so this one route is enough for the whole module.
export async function getAllCheques(actor: ServiceActor) {
  const organizationId = String(actor.user?.organizationId);
  const cheques = await repository.findCheques(organizationId);
  return {
    status: "success",
    data: cheques,
  };
}

// POST /api/cheques
export async function createCheque(actor: ServiceActor, input: ChequeInput) {
  const organizationId = String(actor.user?.organizationId);
  const status = input.status;
  const cheque = await repository.insertCheque(organizationId, input, status, toDate(input.issueDate), toDate(input.chequeDate), toDate(input.dueDate));
  return {
    status: "success",
    message: "Cheque created successfully",
    data: cheque,
  };
}

// PUT /api/cheques/:id
// This edits the descriptive fields of the cheque (number, bank, party,
// amount, dates, description). It does NOT change the status: the status is
// only ever moved through the management actions below, so the history stays
// honest.
export async function updateCheque(actor: ServiceActor, input: ChequeInput, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  cheque.chequeNumber = input.chequeNumber;
  cheque.bank = input.bank;
  cheque.bankAccount = input.bankAccount || "";
  cheque.type = input.type;
  cheque.partyType = input.partyType;
  cheque.partyName = input.partyName || "";
  cheque.amount = input.amount;
  cheque.issueDate = toDate(input.issueDate);
  cheque.chequeDate = toDate(input.chequeDate);
  cheque.dueDate = toDate(input.dueDate);
  cheque.description = input.description || "";
  await repository.saveCheque(cheque);
  return {
    status: "success",
    message: "Cheque updated successfully",
    data: cheque,
  };
}

// DELETE /api/cheques/:id
export async function deleteCheque(actor: ServiceActor, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  // The scan on the disk has to go away too, otherwise it would stay there
  // forever with nothing pointing at it.
  if (cheque.attachment) {
    deleteChequeFile(cheque.attachment.fileName);
  }
  await repository.removeCheque(cheque);
  return {
    status: "success",
    message: "Cheque deleted successfully",
  };
}

// ---------------------------------------------------------------------------
// The status workflow
// ---------------------------------------------------------------------------
// PATCH /api/cheques/:id/status
// The small route for the simple moves: Issue, Receive, Return, Expire, and
// re-presenting a bounced cheque. The heavy steps have their own routes.
export async function changeChequeStatus(actor: ServiceActor, input: ChequeStatusInput, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  const nextStatus = input.status;
  const allowed = ALLOWED_SIMPLE_MOVES[cheque.status];
  if (!allowed.includes(nextStatus)) {
    return {
      status: "invalid",
      message: "A cheque cannot move from \"" +
        cheque.status +
        "\" to \"" +
        nextStatus +
        "\" this way",
    };
  }
  cheque.status = nextStatus;
  pushHistory(cheque, nextStatus, input.note, organizationId);
  await repository.saveCheque(cheque);
  await tellTheWorkspace(actor, cheque, cheque.status);
  return {
    status: "success",
    message: "Cheque status updated",
    data: cheque,
  };
}

// PATCH /api/cheques/:id/deposit
// Take the cheque to the bank. Only a cheque that was issued, received or
// returned can be deposited.
export async function depositCheque(actor: ServiceActor, input: ChequeDepositInput, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  const canDeposit = cheque.status === "issued" ||
    cheque.status === "received" ||
    cheque.status === "returned";
  if (!canDeposit) {
    return {
      status: "invalid",
      message: "Only an issued, received or returned cheque can be deposited",
    };
  }
  cheque.deposit = {
    date: toDate(input.date),
    bank: input.bank || "",
    depositedBy: input.depositedBy || "",
    slipNumber: input.slipNumber || "",
    remarks: input.remarks || "",
  };
  cheque.status = "deposited";
  pushHistory(cheque, "deposited", input.remarks, organizationId);
  await repository.saveCheque(cheque);
  await tellTheWorkspace(actor, cheque, "deposited");
  return {
    status: "success",
    message: "Cheque marked as deposited",
    data: cheque,
  };
}

// PATCH /api/cheques/:id/clear
// The bank paid the cheque. Only a deposited cheque can be cleared.
export async function clearCheque(actor: ServiceActor, input: ChequeClearanceInput, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  if (cheque.status !== "deposited") {
    return {
      status: "invalid",
      message: "Only a deposited cheque can be cleared",
    };
  }
  cheque.clearance = {
    date: toDate(input.date),
    clearedBy: input.clearedBy || "",
    bankReference: input.bankReference || "",
    transactionId: input.transactionId || "",
    remarks: input.remarks || "",
  };
  cheque.status = "cleared";
  pushHistory(cheque, "cleared", input.remarks, organizationId);
  await repository.saveCheque(cheque);
  await tellTheWorkspace(actor, cheque, "cleared");
  return {
    status: "success",
    message: "Cheque marked as cleared",
    data: cheque,
  };
}

// PATCH /api/cheques/:id/bounce
// The bank refused the cheque. Only a deposited cheque can bounce.
export async function bounceCheque(actor: ServiceActor, input: ChequeBounceInput, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  if (cheque.status !== "deposited") {
    return {
      status: "invalid",
      message: "Only a deposited cheque can bounce",
    };
  }
  cheque.bounce = {
    date: toDate(input.date),
    reason: input.reason,
    charges: input.charges || 0,
    actionTaken: input.actionTaken || "",
    rePresentAllowed: input.rePresentAllowed === true,
    rePresentDate: toDate(input.rePresentDate),
    remarks: input.remarks || "",
  };
  cheque.status = "bounced";
  pushHistory(cheque, "bounced", input.reason, organizationId);
  await repository.saveCheque(cheque);
  await tellTheWorkspace(actor, cheque, "bounced");
  return {
    status: "success",
    message: "Cheque marked as bounced",
    data: cheque,
  };
}

// PATCH /api/cheques/:id/cancel
// Stop the cheque. A cheque that is already cleared or already cancelled
// cannot be cancelled.
export async function cancelCheque(actor: ServiceActor, input: ChequeCancelInput, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  if (cheque.status === "cleared" || cheque.status === "cancelled") {
    return {
      status: "invalid",
      message: "A cleared or already cancelled cheque cannot be cancelled",
    };
  }
  cheque.cancel = {
    date: toDate(input.date),
    cancelledBy: input.cancelledBy || "",
    reason: input.reason,
  };
  cheque.status = "cancelled";
  pushHistory(cheque, "cancelled", input.reason, organizationId);
  await repository.saveCheque(cheque);
  await tellTheWorkspace(actor, cheque, "cancelled");
  return {
    status: "success",
    message: "Cheque cancelled",
    data: cheque,
  };
}

// ---------------------------------------------------------------------------
// The scanned picture of the cheque
// ---------------------------------------------------------------------------
// POST /api/cheques/:id/scan
// Add or replace the scan of the cheque. uploadChequeScan already saved the
// file on the disk before we arrive here, so our job is to write the small
// card of that file inside the cheque, and to throw away the old scan.
export async function uploadChequeScan(
  actor: ServiceActor,
  ids: ChequeIds,
  uploadedFile: UploadedFile | undefined,
) {
  const organizationId = String(actor.user?.organizationId);
  const file = uploadedFile;
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    // The file is already on the disk, so if we stop now we clean it up.
    if (file) {
      deleteChequeFile(file.filename);
    }
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  if (!file) {
    return {
      status: "invalid",
      message: "Please choose a file",
    };
  }
  // If a scan was there already, the new one takes its place, so we remove
  // the old file from the disk.
  if (cheque.attachment) {
    deleteChequeFile(cheque.attachment.fileName);
  }
  cheque.attachment = {
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    uploadedAt: new Date(),
  };
  await repository.saveCheque(cheque);
  return {
    status: "success",
    message: "Cheque scan uploaded",
    data: cheque,
  };
}

// DELETE /api/cheques/:id/scan
export async function deleteChequeScan(actor: ServiceActor, ids: ChequeIds) {
  const organizationId = String(actor.user?.organizationId);
  const cheque = await repository.findCheque(ids, organizationId);
  if (!cheque) {
    return {
      status: "not_found",
      message: "Cheque not found",
    };
  }
  if (!cheque.attachment) {
    return {
      status: "not_found",
      message: "This cheque has no scan",
    };
  }
  // First the file on the disk, then the card in the database.
  deleteChequeFile(cheque.attachment.fileName);
  cheque.attachment = null;
  await repository.saveCheque(cheque);
  return {
    status: "success",
    message: "Cheque scan removed",
  };
}
