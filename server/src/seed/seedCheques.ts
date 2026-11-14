import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import { Cheque } from "../modules/cheque/cheque.model.js";
import type { ChequeStatus, ChequeType } from "../modules/cheque/cheque.model.js";
import { Organization } from "../modules/organization/organization.model.js";

// Run this file with "npm run seed:cheques".
//
// It fills the cheque dashboard with one cheque of every kind, so you can see
// that all eight summary cards (Total, Pending, Cleared, Bounced, Cancelled,
// Receivable, Payable, Upcoming Due) really work.
//
// Every cheque made here has a number that starts with "SEED-". Before it
// inserts anything the script deletes the old "SEED-" cheques again, so you
// can run it as many times as you like without making copies, and your own
// real cheques are never touched.

// ---------------------------------------------------------------------------
// Small date helpers, all worked out from "right now"
// ---------------------------------------------------------------------------

// A new Date that is a number of days after today. A negative number gives a
// day in the past. The time of day is set to noon so the date never slips to
// the day before or after because of the timezone.
function daysFromNow(days: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

// ---------------------------------------------------------------------------
// A tiny builder so each cheque below stays short and easy to read
// ---------------------------------------------------------------------------

// One line of the status history. "by" is always the organization account.
function historyLine(
  status: ChequeStatus,
  note: string,
  organizationId: mongoose.Types.ObjectId,
  at: Date
) {
  return { status: status, note: note, by: organizationId, at: at };
}

async function seedCheques() {
  await connectDatabase();

  // 1) Find the organization to attach the cheques to.
  //
  // We prefer the organization that already owns a cheque, so the seed shows
  // up on the very same dashboard you are looking at. If there are no cheques
  // yet, we take the first organization in the database.
  //
  // The organization of that newest cheque can also be GONE: deleting an
  // organization leaves its cheques behind, and then the id on them points at
  // nothing. Answering "no organization found" for that would be wrong, so we
  // fall back on the first organization there, exactly as if there were no
  // cheque at all.
  const existingCheque = await Cheque.findOne().sort({ createdAt: -1 });

  const chequeOrganization = existingCheque
    ? await Organization.findById(existingCheque.organization)
    : null;

  const organization = chequeOrganization
    ? chequeOrganization
    : await Organization.findOne();

  if (!organization) {
    console.log(
      "No organization found. Create an organization first, then run this seed."
    );
    await mongoose.disconnect();
    return;
  }

  const orgId = organization._id as mongoose.Types.ObjectId;
  console.log("Seeding cheques for organization:", organization.name);

  // 2) Remove the cheques a previous run of this seed made, so re-running does
  //    not pile up copies. We recognise them by the "SEED-" number prefix.
  const removed = await Cheque.deleteMany({
    organization: orgId,
    chequeNumber: { $regex: "^SEED-" },
  });
  if (removed.deletedCount > 0) {
    console.log("Removed old seed cheques:", removed.deletedCount);
  }

  // 3) Build the list. Read the comment on each one to see which card it
  //    feeds. Together they light up all eight cards.
  const cheques = [
    // --- PENDING + RECEIVABLE + UPCOMING DUE ---
    // Money coming in, still on the way, due in 3 days -> receivable AND
    // one of the "due within 7 days" cheques.
    {
      organization: orgId,
      chequeNumber: "SEED-1001",
      bank: "Meezan Bank",
      bankAccount: "PK-0001",
      type: "received" as ChequeType,
      partyType: "customer",
      partyName: "Ali Traders",
      amount: 1000,
      issueDate: daysFromNow(-2),
      chequeDate: daysFromNow(-2),
      dueDate: daysFromNow(3),
      description: "Payment for invoice INV-2201",
      status: "received" as ChequeStatus,
      statusHistory: [
        historyLine("received", "Cheque created", orgId, daysFromNow(-2)),
      ],
    },

    // --- PENDING + RECEIVABLE (not upcoming: due far away) ---
    {
      organization: orgId,
      chequeNumber: "SEED-1002",
      bank: "HBL",
      bankAccount: "PK-0002",
      type: "received" as ChequeType,
      partyType: "customer",
      partyName: "Bright Electronics",
      amount: 2500,
      issueDate: daysFromNow(-1),
      chequeDate: daysFromNow(-1),
      dueDate: daysFromNow(20),
      description: "Advance for order ORD-88",
      status: "received" as ChequeStatus,
      statusHistory: [
        historyLine("received", "Cheque created", orgId, daysFromNow(-1)),
      ],
    },

    // --- PENDING + RECEIVABLE + OVERDUE (past due, so NOT upcoming) ---
    // This one shows in the "overdue" reminder, and still counts as pending
    // receivable money.
    {
      organization: orgId,
      chequeNumber: "SEED-1003",
      bank: "UBL",
      bankAccount: "PK-0003",
      type: "received" as ChequeType,
      partyType: "other",
      partyName: "Walk-in Sale",
      amount: 600,
      issueDate: daysFromNow(-10),
      chequeDate: daysFromNow(-10),
      dueDate: daysFromNow(-3),
      description: "Counter sale, cheque not yet banked",
      status: "received" as ChequeStatus,
      statusHistory: [
        historyLine("received", "Cheque created", orgId, daysFromNow(-10)),
      ],
    },

    // --- PENDING + PAYABLE + UPCOMING DUE ---
    // Money going out, due in 5 days.
    {
      organization: orgId,
      chequeNumber: "SEED-1004",
      bank: "Bank Alfalah",
      bankAccount: "PK-0004",
      type: "issued" as ChequeType,
      partyType: "vendor",
      partyName: "Karachi Supplies Co.",
      amount: 800,
      issueDate: daysFromNow(-1),
      chequeDate: daysFromNow(-1),
      dueDate: daysFromNow(5),
      description: "Raw material purchase",
      status: "issued" as ChequeStatus,
      statusHistory: [
        historyLine("issued", "Cheque created", orgId, daysFromNow(-1)),
      ],
    },

    // --- PENDING + PAYABLE (not upcoming: due far away) ---
    {
      organization: orgId,
      chequeNumber: "SEED-1005",
      bank: "MCB",
      bankAccount: "PK-0005",
      type: "issued" as ChequeType,
      partyType: "vendor",
      partyName: "Lahore Packaging Ltd.",
      amount: 3200,
      issueDate: daysFromNow(-1),
      chequeDate: daysFromNow(-1),
      dueDate: daysFromNow(40),
      description: "Packaging order for August",
      status: "issued" as ChequeStatus,
      statusHistory: [
        historyLine("issued", "Cheque created", orgId, daysFromNow(-1)),
      ],
    },

    // --- PENDING (deposited) + RECEIVABLE + UPCOMING DUE + pending clearance ---
    // A received cheque taken to the bank, still waiting to clear. "deposited"
    // counts as pending, so it adds to receivable and, being due in 2 days, to
    // the upcoming-due card too.
    {
      organization: orgId,
      chequeNumber: "SEED-1006",
      bank: "Standard Chartered",
      bankAccount: "PK-0006",
      type: "received" as ChequeType,
      partyType: "customer",
      partyName: "Sunrise Foods",
      amount: 1500,
      issueDate: daysFromNow(-5),
      chequeDate: daysFromNow(-5),
      dueDate: daysFromNow(2),
      description: "Monthly supply payment",
      status: "deposited" as ChequeStatus,
      deposit: {
        date: daysFromNow(-1),
        bank: "Standard Chartered",
        depositedBy: "Accounts Dept",
        slipNumber: "DEP-5541",
        remarks: "Deposited at main branch",
      },
      statusHistory: [
        historyLine("received", "Cheque created", orgId, daysFromNow(-5)),
        historyLine("deposited", "Deposited at main branch", orgId, daysFromNow(-1)),
      ],
    },

    // --- CLEARED (received) ---
    // Money that already came in. Cleared cheques are NOT pending, so this one
    // feeds the Cleared card but not receivable.
    {
      organization: orgId,
      chequeNumber: "SEED-1007",
      bank: "Meezan Bank",
      bankAccount: "PK-0007",
      type: "received" as ChequeType,
      partyType: "customer",
      partyName: "Ali Traders",
      amount: 5000,
      issueDate: daysFromNow(-20),
      chequeDate: daysFromNow(-20),
      dueDate: daysFromNow(-12),
      description: "Full settlement of INV-2100",
      status: "cleared" as ChequeStatus,
      deposit: {
        date: daysFromNow(-14),
        bank: "Meezan Bank",
        depositedBy: "Accounts Dept",
        slipNumber: "DEP-5500",
        remarks: "",
      },
      clearance: {
        date: daysFromNow(-12),
        clearedBy: "Bank",
        bankReference: "CLR-9001",
        transactionId: "TXN-778812",
        remarks: "Cleared in 2 days",
      },
      statusHistory: [
        historyLine("received", "Cheque created", orgId, daysFromNow(-20)),
        historyLine("deposited", "Sent to bank", orgId, daysFromNow(-14)),
        historyLine("cleared", "Cleared in 2 days", orgId, daysFromNow(-12)),
      ],
    },

    // --- CLEARED (issued) ---
    {
      organization: orgId,
      chequeNumber: "SEED-1008",
      bank: "Bank Alfalah",
      bankAccount: "PK-0008",
      type: "issued" as ChequeType,
      partyType: "vendor",
      partyName: "Karachi Supplies Co.",
      amount: 1200,
      issueDate: daysFromNow(-18),
      chequeDate: daysFromNow(-18),
      dueDate: daysFromNow(-10),
      description: "Payment cleared for June supplies",
      status: "cleared" as ChequeStatus,
      deposit: {
        date: daysFromNow(-12),
        bank: "Bank Alfalah",
        depositedBy: "Vendor",
        slipNumber: "DEP-5490",
        remarks: "",
      },
      clearance: {
        date: daysFromNow(-10),
        clearedBy: "Bank",
        bankReference: "CLR-9002",
        transactionId: "TXN-778820",
        remarks: "",
      },
      statusHistory: [
        historyLine("issued", "Cheque created", orgId, daysFromNow(-18)),
        historyLine("deposited", "Vendor banked it", orgId, daysFromNow(-12)),
        historyLine("cleared", "Cleared", orgId, daysFromNow(-10)),
      ],
    },

    // --- BOUNCED ---
    // A received cheque the bank refused. It feeds the Bounced card and the
    // bounce-alert reminder.
    {
      organization: orgId,
      chequeNumber: "SEED-1009",
      bank: "HBL",
      bankAccount: "PK-0009",
      type: "received" as ChequeType,
      partyType: "customer",
      partyName: "Delta Distributors",
      amount: 900,
      issueDate: daysFromNow(-15),
      chequeDate: daysFromNow(-15),
      dueDate: daysFromNow(-8),
      description: "Cheque returned by bank",
      status: "bounced" as ChequeStatus,
      deposit: {
        date: daysFromNow(-9),
        bank: "HBL",
        depositedBy: "Accounts Dept",
        slipNumber: "DEP-5470",
        remarks: "",
      },
      bounce: {
        date: daysFromNow(-8),
        reason: "Insufficient funds",
        charges: 50,
        actionTaken: "Called the customer",
        rePresentAllowed: true,
        rePresentDate: daysFromNow(6),
        remarks: "Customer promised to re-fund the account",
      },
      statusHistory: [
        historyLine("received", "Cheque created", orgId, daysFromNow(-15)),
        historyLine("deposited", "Banked", orgId, daysFromNow(-9)),
        historyLine("bounced", "Insufficient funds", orgId, daysFromNow(-8)),
      ],
    },

    // --- CANCELLED ---
    // An issued cheque that was stopped before it went anywhere.
    {
      organization: orgId,
      chequeNumber: "SEED-1010",
      bank: "MCB",
      bankAccount: "PK-0010",
      type: "issued" as ChequeType,
      partyType: "employee",
      partyName: "Usman Khan",
      amount: 700,
      issueDate: daysFromNow(-6),
      chequeDate: daysFromNow(-6),
      dueDate: daysFromNow(4),
      description: "Advance salary cheque, later cancelled",
      status: "cancelled" as ChequeStatus,
      cancel: {
        date: daysFromNow(-2),
        cancelledBy: "Finance Manager",
        reason: "Paid in cash instead",
      },
      statusHistory: [
        historyLine("issued", "Cheque created", orgId, daysFromNow(-6)),
        historyLine("cancelled", "Paid in cash instead", orgId, daysFromNow(-2)),
      ],
    },
  ];

  // 4) Save them all.
  await Cheque.insertMany(cheques);

  console.log("Inserted seed cheques:", cheques.length);
  console.log("");
  console.log("What the cards should now show (plus your own cheques):");
  console.log("  Total Cheques     : 10 seeded");
  console.log("  Pending Cheques   : 6  (SEED-1001..1006)");
  console.log("  Cleared Cheques   : 2  (SEED-1007, 1008)");
  console.log("  Bounced Cheques   : 1  (SEED-1009)");
  console.log("  Cancelled Cheques : 1  (SEED-1010)");
  console.log("  Total Receivable  : 5,600  (1000+2500+600+1500)");
  console.log("  Total Payable     : 4,000  (800+3200)");
  console.log("  Upcoming Due      : 3  (SEED-1001, 1004, 1006)");

  await mongoose.disconnect();
}

seedCheques();
