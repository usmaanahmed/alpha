// Everything the cheque screens need: the shapes the server sends, the
// friendly labels for the dropdowns and the badges, and the small functions
// that turn a list of cheques into the dashboard numbers and the reminders.

export type ChequeType = "received" | "issued";

export type ChequePartyType = "customer" | "vendor" | "employee" | "other";

export type ChequeStatus =
  | "draft"
  | "issued"
  | "received"
  | "deposited"
  | "cleared"
  | "bounced"
  | "cancelled"
  | "returned"
  | "expired";

// The account that made a status change. Only the organization account can
// touch cheques, so this is always the organization.
export interface ChequeActor {
  _id: string;
  name: string;
  email: string;
}

// One line of the status history.
export interface ChequeStatusEntry {
  _id: string;
  status: ChequeStatus;
  note: string;
  by: ChequeActor | null;
  at: string;
}

// The scan of the paper cheque, or null when none was uploaded.
export interface ChequeAttachment {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface DepositInfo {
  date: string | null;
  bank: string;
  depositedBy: string;
  slipNumber: string;
  remarks: string;
}

export interface ClearanceInfo {
  date: string | null;
  clearedBy: string;
  bankReference: string;
  transactionId: string;
  remarks: string;
}

export interface BounceInfo {
  date: string | null;
  reason: string;
  charges: number;
  actionTaken: string;
  rePresentAllowed: boolean;
  rePresentDate: string | null;
  remarks: string;
}

export interface CancelInfo {
  date: string | null;
  cancelledBy: string;
  reason: string;
}

// One cheque, exactly as the server sends it.
export interface Cheque {
  _id: string;
  chequeNumber: string;
  bank: string;
  bankAccount: string;
  type: ChequeType;
  partyType: ChequePartyType;
  partyName: string;
  amount: number;
  issueDate: string | null;
  chequeDate: string | null;
  dueDate: string | null;
  description: string;
  status: ChequeStatus;
  attachment: ChequeAttachment | null;
  statusHistory: ChequeStatusEntry[];
  deposit: DepositInfo | null;
  clearance: ClearanceInfo | null;
  bounce: BounceInfo | null;
  cancel: CancelInfo | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// The friendly words for the dropdowns and the badges
// ---------------------------------------------------------------------------

export const CHEQUE_TYPE_OPTIONS: { value: ChequeType; label: string }[] = [
  { value: "received", label: "Received (money coming in)" },
  { value: "issued", label: "Issued (money going out)" },
];

export const CHEQUE_PARTY_TYPE_OPTIONS: {
  value: ChequePartyType;
  label: string;
}[] = [
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
  { value: "employee", label: "Employee" },
  { value: "other", label: "Other" },
];

// The status a cheque can be created in. The rest are reached through the
// management actions, so they are not offered in the create form.
export const CHEQUE_START_STATUS_OPTIONS: {
  value: ChequeStatus;
  label: string;
}[] = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "received", label: "Received" },
];

// Every status with its friendly label. The badge and the timeline read the
// words from here, so they are the same everywhere.
export const CHEQUE_STATUS_OPTIONS: { value: ChequeStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "received", label: "Received" },
  { value: "deposited", label: "Deposited" },
  { value: "cleared", label: "Cleared" },
  { value: "bounced", label: "Bounced" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
  { value: "expired", label: "Expired" },
];

export function getChequeStatusLabel(status: ChequeStatus) {
  const option = CHEQUE_STATUS_OPTIONS.find((item) => item.value === status);
  return option ? option.label : status;
}

export function getChequeTypeLabel(type: ChequeType) {
  return type === "received" ? "Received" : "Issued";
}

export function getPartyTypeLabel(partyType: ChequePartyType) {
  const option = CHEQUE_PARTY_TYPE_OPTIONS.find(
    (item) => item.value === partyType
  );
  return option ? option.label : partyType;
}

// The colour of the status badge. We map every status to one of the badge
// variants (defined in components/ui/badge.tsx) so the same status always
// looks the same.
export function getChequeStatusVariant(status: ChequeStatus) {
  if (status === "cleared") {
    return "default" as const; // the main colour, this is the happy end
  }
  if (status === "bounced" || status === "cancelled" || status === "expired") {
    return "destructive" as const;
  }
  if (status === "deposited") {
    return "reassigned" as const; // the violet one, "on its way"
  }
  // draft, issued, received, returned
  return "secondary" as const;
}

// ---------------------------------------------------------------------------
// Money and dates
// ---------------------------------------------------------------------------

// 1500 -> "1,500.00". We do not force a currency symbol, because different
// organizations use different money.
export function formatMoney(amount: number) {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Turn a number into English words, the way a real cheque writes it:
// 1500.5 -> "One Thousand Five Hundred and 50/100".
// This is only for the pretty cheque drawing, so it stays simple and stops
// at billions, which is far more than any cheque this app will ever hold.
export function amountToWords(amount: number) {
  if (!isFinite(amount) || amount < 0) {
    return "";
  }

  const ones = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight",
    "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen",
    "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
    "Eighty", "Ninety",
  ];

  // Words for any number under one thousand, for example 942.
  function under1000(value: number): string {
    let text = "";

    if (value >= 100) {
      text += ones[Math.floor(value / 100)] + " Hundred";
      value = value % 100;
      if (value > 0) {
        text += " ";
      }
    }

    if (value >= 20) {
      text += tens[Math.floor(value / 10)];
      if (value % 10 > 0) {
        text += " " + ones[value % 10];
      }
    } else if (value > 0) {
      text += ones[value];
    }

    return text;
  }

  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const centText = String(cents).padStart(2, "0") + "/100";

  if (whole === 0) {
    return "Zero and " + centText;
  }

  // We cut the number into groups of three digits and name each group.
  const groups = [
    { value: 1000000000, name: "Billion" },
    { value: 1000000, name: "Million" },
    { value: 1000, name: "Thousand" },
    { value: 1, name: "" },
  ];

  let remaining = whole;
  let words = "";

  groups.forEach((group) => {
    if (remaining >= group.value) {
      const count = Math.floor(remaining / group.value);
      remaining = remaining % group.value;
      words += under1000(count);
      words += group.name ? " " + group.name + " " : "";
    }
  });

  return words.trim() + " and " + centText;
}

// "2026-07-30T00:00:00.000Z" -> "30 Jul 2026". null gives "-".
export function formatChequeDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// The same but with the hour, for the history timeline.
export function formatChequeDateTime(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "2026-07-30T00:00:00.000Z" -> "2026-07-30", which is what a date input
// wants. Empty when there is no date.
export function toChequeDateInput(value: string | null) {
  if (!value) {
    return "";
  }
  return value.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Which statuses count as "still open"
// ---------------------------------------------------------------------------

// A cheque is "pending" while its money has not moved yet and nobody stopped
// it: it is still somewhere on the way to being cleared.
export function isPending(cheque: Cheque) {
  return (
    cheque.status === "draft" ||
    cheque.status === "issued" ||
    cheque.status === "received" ||
    cheque.status === "deposited" ||
    cheque.status === "returned"
  );
}

// ---------------------------------------------------------------------------
// The dashboard numbers
// ---------------------------------------------------------------------------

// Everything the dashboard cards show. We work it all out here, in one
// place, from the list the server already sent us.
export interface ChequeSummary {
  total: number;
  pending: number;
  cleared: number;
  bounced: number;
  cancelled: number;
  receivable: number;
  payable: number;
  upcomingDue: number;
}

export function buildChequeSummary(cheques: Cheque[]): ChequeSummary {
  const summary: ChequeSummary = {
    total: cheques.length,
    pending: 0,
    cleared: 0,
    bounced: 0,
    cancelled: 0,
    receivable: 0,
    payable: 0,
    upcomingDue: 0,
  };

  cheques.forEach((cheque) => {
    if (cheque.status === "cleared") {
      summary.cleared += 1;
    }
    if (cheque.status === "bounced") {
      summary.bounced += 1;
    }
    if (cheque.status === "cancelled") {
      summary.cancelled += 1;
    }

    if (isPending(cheque)) {
      summary.pending += 1;

      // Receivable = money we still expect to GET (received cheques).
      // Payable    = money we still have to PAY (issued cheques).
      if (cheque.type === "received") {
        summary.receivable += cheque.amount;
      } else {
        summary.payable += cheque.amount;
      }
    }

    if (isDueSoon(cheque)) {
      summary.upcomingDue += 1;
    }
  });

  return summary;
}

// ---------------------------------------------------------------------------
// The reminders
// ---------------------------------------------------------------------------

// The number of whole days from today until the due date.
// 0 means today, 1 means tomorrow, a negative number means the day is gone.
// null when the cheque has no due date.
export function daysUntilDue(cheque: Cheque) {
  if (!cheque.dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(cheque.dueDate);
  due.setHours(0, 0, 0, 0);

  const oneDay = 1000 * 60 * 60 * 24;
  return Math.round((due.getTime() - today.getTime()) / oneDay);
}

// A pending cheque whose due date is today or within the next 7 days.
export function isDueSoon(cheque: Cheque) {
  if (!isPending(cheque)) {
    return false;
  }

  const days = daysUntilDue(cheque);
  return days !== null && days >= 0 && days <= 7;
}

// The five reminder groups the module supports. Every group is just a
// filtered slice of the same list.
export interface ChequeReminders {
  dueToday: Cheque[];
  dueTomorrow: Cheque[];
  overdue: Cheque[];
  pendingClearance: Cheque[];
  bounceAlert: Cheque[];
}

export function buildChequeReminders(cheques: Cheque[]): ChequeReminders {
  const reminders: ChequeReminders = {
    dueToday: [],
    dueTomorrow: [],
    overdue: [],
    pendingClearance: [],
    bounceAlert: [],
  };

  cheques.forEach((cheque) => {
    // A bounced cheque that may be presented again is always an alert.
    if (cheque.status === "bounced") {
      reminders.bounceAlert.push(cheque);
    }

    // A deposited cheque is money we are still waiting for the bank to pay.
    if (cheque.status === "deposited") {
      reminders.pendingClearance.push(cheque);
    }

    if (!isPending(cheque)) {
      return;
    }

    const days = daysUntilDue(cheque);
    if (days === null) {
      return;
    }

    if (days < 0) {
      reminders.overdue.push(cheque);
    } else if (days === 0) {
      reminders.dueToday.push(cheque);
    } else if (days === 1) {
      reminders.dueTomorrow.push(cheque);
    }
  });

  return reminders;
}

// ---------------------------------------------------------------------------
// Filtering the list
// ---------------------------------------------------------------------------

// type and status are lists, because the filter dropdowns of the toolbar let
// a person tick several answers at once ("show me bounced AND returned").
// An empty list means nothing is ticked, and that is the same as "show all".
export interface ChequeFilters {
  search: string;
  type: string[];
  status: string[];
}

export const EMPTY_CHEQUE_FILTERS: ChequeFilters = {
  search: "",
  type: [],
  status: [],
};

export function filterCheques(cheques: Cheque[], filters: ChequeFilters) {
  const search = filters.search.trim().toLowerCase();

  return cheques.filter((cheque) => {
    if (filters.type.length > 0 && !filters.type.includes(cheque.type)) {
      return false;
    }

    if (filters.status.length > 0 && !filters.status.includes(cheque.status)) {
      return false;
    }

    if (search !== "") {
      const text =
        cheque.chequeNumber +
        " " +
        cheque.bank +
        " " +
        cheque.bankAccount +
        " " +
        cheque.partyName +
        " " +
        cheque.description;

      if (!text.toLowerCase().includes(search)) {
        return false;
      }
    }

    return true;
  });
}

// The scan of a cheque lives on the disk of the server, and the server gives
// us only its file name. To open it in the browser we build the full
// address, the same way lib/attachment.ts does for the task files.
export function getChequeScanUrl(fileName: string) {
  if (!fileName) {
    return "";
  }

  const apiUrl = import.meta.env.VITE_API_URL || "/api";
  const serverUrl = apiUrl.replace(/\/api\/?$/, "");

  return serverUrl + "/uploads/cheques/" + fileName;
}
