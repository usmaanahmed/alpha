import type { ChequeInput, ChequeIds } from "./cheque.types.js";
import { Cheque } from "./cheque.model.js";
import type { ChequeStatus, ChequeDocument } from "./cheque.model.js";

export async function findCheques(organizationId: string) {
  return Cheque.find({ organization: organizationId })
    // The history keeps only the id of the account that made each change, so
    // we ask for its name as well, otherwise the timeline would show blanks.
    .populate("statusHistory.by", "name email")
    .sort({ createdAt: -1 });
}

export async function insertCheque(
  organizationId: string,
  input: ChequeInput,
  status: ChequeStatus,
  issueDate: Date | null,
  chequeDate: Date | null,
  dueDate: Date | null,
) {
  return Cheque.create({
    organization: organizationId,
    chequeNumber: input.chequeNumber,
    bank: input.bank,
    bankAccount: input.bankAccount || "",
    type: input.type,
    partyType: input.partyType,
    partyName: input.partyName || "",
    amount: input.amount,
    issueDate: issueDate,
    chequeDate: chequeDate,
    dueDate: dueDate,
    description: input.description || "",
    status: status,
    // The first line of the history: the status the cheque was born in.
    statusHistory: [
      {
        status: status,
        note: "Cheque created",
        by: organizationId,
        at: new Date(),
      },
    ],
  });
}

export async function findCheque(ids: ChequeIds, organizationId: string) {
  return Cheque.findOne({
    _id: ids.id,
    organization: organizationId,
  });
}

export async function saveCheque(cheque: ChequeDocument) {
  return cheque.save();
}

export async function removeCheque(cheque: ChequeDocument) {
  return Cheque.deleteOne({ _id: cheque._id });
}
