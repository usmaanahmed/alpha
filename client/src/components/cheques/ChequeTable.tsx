import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { ChequeStatusBadge } from "./ChequeStatusBadge";
import {
  formatMoney,
  formatChequeDate,
  getPartyTypeLabel,
  daysUntilDue,
  isPending,
} from "@/types/cheque.types";
import { cn } from "@/lib/utils";
import type { Cheque } from "@/types/cheque.types";

// A pending cheque whose due date is already gone. It is asked twice (once
// for the colour of the date, once for the "Overdue" line under it), so it
// lives in its own small function.
function isOverdue(cheque: Cheque) {
  const days = daysUntilDue(cheque);
  return isPending(cheque) && days !== null && days < 0;
}

// The main cheque list. Clicking a row (or "View details") opens the detail
// dialog, where all the management actions live.
//
// This table has no toolbar of its own: the search box and the two filter
// dropdowns live on the page above it, because the very same filters also
// drive the card view next to this one.
export function ChequeTable(props: {
  data: Cheque[];
  isLoading: boolean;
  isFetching?: boolean;
  // "View details" is always there for somebody who may read the cheques;
  // the two others follow the permissions of the logged in person.
  canEdit: boolean;
  canDelete: boolean;
  onView: (cheque: Cheque) => void;
  onEdit: (cheque: Cheque) => void;
  onDelete: (cheque: Cheque) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    // The nearest due date first: that is the cheque that needs an eye on it.
    { id: "dueDate", desc: false },
  ]);

  const columns: ColumnDef<Cheque>[] = [
    {
      accessorKey: "chequeNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cheque" />
      ),
      size: 150,
      cell: ({ row }) => (
        <div>
          <p className="font-medium tabular-nums">
            {"#" + row.original.chequeNumber}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.bank}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          {row.original.type === "received" ? (
            <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
          ) : (
            <ArrowUpCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500" />
          )}
          {row.original.type === "received" ? "Received" : "Issued"}
        </span>
      ),
    },
    {
      accessorKey: "partyName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Party" />
      ),
      cell: ({ row }) => (
        <div className="max-w-52">
          <p className="truncate">{row.original.partyName || "-"}</p>
          <p className="text-xs text-muted-foreground">
            {getPartyTypeLabel(row.original.partyType)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      // The money column is read right to left, so its title is pushed to the
      // right edge too and the digits line up under it.
      header: ({ column }) => (
        <div className="flex justify-end">
          <DataTableColumnHeader column={column} title="Amount" />
        </div>
      ),
      size: 130,
      cell: ({ row }) => (
        <p className="text-right font-medium tabular-nums">
          {formatMoney(row.original.amount)}
        </p>
      ),
    },
    {
      accessorKey: "dueDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Due date" />
      ),
      size: 140,
      cell: ({ row }) => (
        <div
          className={cn(
            "tabular-nums",
            isOverdue(row.original) && "font-medium text-destructive"
          )}
        >
          {formatChequeDate(row.original.dueDate)}
          {isOverdue(row.original) ? (
            <span className="block text-xs">Overdue</span>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => <ChequeStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      size: 48,
      cell: ({ row }) => (
        <DataTableRowActions>
          <DropdownMenuItem onClick={() => props.onView(row.original)}>
            View details
          </DropdownMenuItem>
          {props.canEdit ? (
            <DropdownMenuItem onClick={() => props.onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
          ) : null}
          {props.canDelete ? (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => props.onDelete(row.original)}
            >
              Delete
            </DropdownMenuItem>
          ) : null}
        </DataTableRowActions>
      ),
    },
  ];

  const table = useReactTable({
    data: props.data,
    columns: columns,
    state: { sorting: sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<Wallet className="h-5 w-5" />}
        emptyTitle="No cheque to show"
        emptyDescription="Change the filters above, or create your first one."
        onRowClick={props.onView}
        // A cheque that is late gets a very pale red row, so it is found
        // without having to read the date of every line.
        rowClassName={(cheque) =>
          isOverdue(cheque) ? "bg-destructive/5" : undefined
        }
      />

      <DataTablePagination table={table} />
    </div>
  );
}
