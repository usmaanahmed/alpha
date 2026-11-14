import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState, VisibilityState } from "@tanstack/react-table";
import {
  ArrowRight,
  Inbox,
  MessageSquareQuote,
  X,
  Check,
  ThumbsUp,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { LeaveStatusPill } from "@/components/hr/LeaveStatusPill";
import { LEAVE_STATUS_LOOK } from "@/lib/leaveStatus";
import { formatDay } from "@/lib/date";
import type { LeaveRequest } from "@/types/hr.types";

// The list of leave requests.
//
// showEmployee is false on the "my leaves" page, because there every row is
// the same person and that column would say nothing. The column is not
// removed, it is hidden, so the two pages keep exactly the same table.
//
// Pressing a row anywhere answers that request, exactly like the "Answer"
// button does, and a row that cannot be answered opens its full story
// instead. The buttons at the end of the row are the exceptions: they stop
// the press themselves, so "Recommend" and "Cancel" still do their own job.
//
// The action buttons come from canReview, canRecommend and canCancel, which
// the server puts on every row. So the React side never repeats the rules, it
// only follows what the server already decided.
//
// The status tiles and the search box live on the page above this table,
// because they are also the tiles that count the requests, so this table
// only sorts and pages.
export function LeaveRequestTable(props: {
  data: LeaveRequest[];
  isLoading: boolean;
  isFetching?: boolean;
  showEmployee: boolean;
  onReview: (request: LeaveRequest) => void;
  onRecommend: (request: LeaveRequest) => void;
  onHistory: (request: LeaveRequest) => void;
  onCancel: (request: LeaveRequest) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    // The newest request first: it is the one still waiting for an answer.
    { id: "createdAt", desc: true },
  ]);

  // Which columns are on the screen.
  //
  // The employee column is turned off on the "my leaves" page, where every
  // row is the same person. createdAt is never shown at all: it only exists
  // so the table can start sorted on the day the request was sent.
  const columnVisibility: VisibilityState = {
    employee: props.showEmployee,
    createdAt: false,
  };

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      id: "employee",
      accessorFn: (request) => request.employee.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employee" />
      ),
      cell: ({ row }) => (
        <div className="relative">
          {/* A thin coloured line on the left edge of the row that repeats
              the colour of the status. The negative values pull it into the
              padding of the cell, so it touches both edges of the row. */}
          <span
            className={
              "absolute -top-1.5 -bottom-1.5 -left-3 w-0.5 rounded-full " +
              LEAVE_STATUS_LOOK[row.original.status].solid
            }
          />
          <EmployeeAvatar
            name={row.original.employee.name}
            photo={row.original.employee.photo}
            subtitle={row.original.department?.name}
            size="sm"
          />
        </div>
      ),
    },
    {
      id: "leaveType",
      accessorFn: (request) => request.leaveType.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Leave type" />
      ),
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{row.original.leaveType.name}</span>
          {!row.original.leaveType.isPaid ? (
            <span className="rounded-full bg-slate-500/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-400">
              unpaid
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "days",
      accessorFn: (request) => request.fromDate,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Days" />
      ),
      size: 200,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted/70 px-2 py-0.5 text-xs whitespace-nowrap tabular-nums">
          {formatDay(row.original.fromDate)}
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          {formatDay(row.original.toDate)}
        </span>
      ),
    },
    {
      accessorKey: "totalDays",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Total" />
      ),
      size: 110,
      cell: ({ row }) => {
        // A request that was answered can count fewer days than it asked for:
        // the approver ticked only some days, or a weekend, a holiday or an
        // already recorded attendance took one out. When that happened the
        // asked number is shown under it, so the difference is never a
        // surprise, and the history dialog explains every missing day.
        const isShorter =
          row.original.status !== "pending" &&
          row.original.requestedDays > row.original.totalDays;

        return (
          <div>
            <span className="font-semibold tabular-nums">
              {row.original.totalDays}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                {row.original.totalDays === 1 ? "day" : "days"}
              </span>
            </span>

            {isShorter ? (
              <p className="text-xs text-muted-foreground tabular-nums">
                {"of " + row.original.requestedDays + " asked"}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="max-w-64">
          <p className="truncate" title={row.original.reason}>
            {row.original.reason}
          </p>

          {/* A request that carries papers says so right here, so an approver
              knows there is something to open before clicking anything. */}
          {row.original.documents.length > 0 ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3 shrink-0" />
              {row.original.documents.length === 1
                ? "1 document"
                : row.original.documents.length + " documents"}
            </p>
          ) : null}

          {row.original.reviewRemarks ? (
            <p
              className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"
              title={row.original.reviewRemarks}
            >
              <MessageSquareQuote className="h-3 w-3 shrink-0" />
              {row.original.reviewRemarks}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => <LeaveStatusPill status={row.original.status} />,
    },
    {
      // A hidden column, only there so the table can start sorted on the day
      // the request was sent.
      accessorKey: "createdAt",
      header: "",
      cell: () => null,
    },
    {
      id: "actions",
      header: "",
      size: 200,
      cell: ({ row }) => (
        // The whole row opens the history, so a press on one of these buttons
        // must stop right here. Without this line, "Answer" would open the
        // answer dialog AND the history dialog behind it.
        <div
          className="flex items-center justify-end gap-1.5"
          onClick={(event) => event.stopPropagation()}
        >
          {/* There is no "History" button any more: the row itself opens it.
              Leaving both would put the same thing on the screen twice. */}

          {/* A team lead advises and an approver decides, so the two buttons
              can both be there on the same row for the same person. */}
          {row.original.canRecommend ? (
            <Button
              size="xs"
              variant="outline"
              onClick={() => props.onRecommend(row.original)}
            >
              <ThumbsUp className="h-3 w-3" />
              Recommend
            </Button>
          ) : null}

          {row.original.canReview ? (
            <Button size="xs" onClick={() => props.onReview(row.original)}>
              <Check className="h-3 w-3" />
              Answer
            </Button>
          ) : row.original.canCancel ? (
            <Button
              size="xs"
              variant="outline"
              onClick={() => props.onCancel(row.original)}
            >
              <X className="h-3 w-3" />
              Cancel
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: props.data,
    columns: columns,
    state: {
      sorting: sorting,
      columnVisibility: columnVisibility,
    },
    initialState: {
      pagination: { pageSize: 25 },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Pressing anywhere on a row opens the same dialog the "Answer" button
          opens, so a person does not have to aim at a small button to do the
          one thing this page is for.

          A row that cannot be answered opens its full story instead: an
          approved, rejected or cancelled request has nothing left to decide,
          and so does my own request, which nobody may answer themselves.

          The shell paints the pointer cursor by itself as soon as onRowClick
          is given, so a row looks pressable before it is pressed. */}
      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<Inbox className="h-5 w-5" />}
        emptyTitle="Nothing here"
        emptyDescription="No leave request matches this filter."
        onRowClick={(request) =>
          request.canReview ? props.onReview(request) : props.onHistory(request)
        }
      />

      <DataTablePagination table={table} />
    </div>
  );
}
