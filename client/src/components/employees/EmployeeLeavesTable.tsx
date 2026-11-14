import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { CalendarX2 } from "lucide-react";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import {
  isOneOf,
  countValues,
  buildFacetOptions,
} from "@/components/table/facets";
import { LeaveStatusPill } from "@/components/hr/LeaveStatusPill";
import { PersonInline } from "@/components/common/PersonInline";
import { formatDay } from "@/lib/date";
import type { EmployeeLeave } from "@/types/employee.types";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "partially_approved", label: "Partly approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

// The list of every leave request of one employee, shown on the detail page.
//
// This page only reads, so there are no approve / reject buttons here: those
// live on the HR "leave requests" page. Here we simply show what happened,
// with a filter on the status and on the leave type so a long history stays
// easy to walk through.
export function EmployeeLeavesTable(props: {
  data: EmployeeLeave[];
  isLoading: boolean;
  isFetching?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "fromDate", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  const columns: ColumnDef<EmployeeLeave>[] = [
    {
      id: "leaveType",
      accessorFn: (leave) => leave.leaveType?.name || "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      filterFn: isOneOf,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.leaveType?.name || "-"}
        </span>
      ),
    },
    {
      accessorKey: "fromDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="From" />
      ),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatDay(row.original.fromDate)}</span>
      ),
    },
    {
      accessorKey: "toDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="To" />
      ),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatDay(row.original.toDate)}</span>
      ),
    },
    {
      accessorKey: "totalDays",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Days" />
      ),
      size: 80,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.totalDays}</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      enableSorting: false,
      cell: ({ row }) => (
        <p
          className="max-w-64 truncate text-muted-foreground"
          title={row.original.reason}
        >
          {row.original.reason || "-"}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      filterFn: isOneOf,
      size: 120,
      cell: ({ row }) => <LeaveStatusPill status={row.original.status} />,
    },
    {
      id: "reviewedBy",
      accessorFn: (leave) => leave.reviewedByEmployee?.name || "",
      header: "Reviewed by",
      enableSorting: false,
      cell: ({ row }) =>
        row.original.reviewedByEmployee ? (
          <PersonInline
            name={row.original.reviewedByEmployee.name}
            photo={row.original.reviewedByEmployee.photo}
            textClassName="text-muted-foreground"
          />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ];

  const table = useReactTable({
    data: props.data,
    columns: columns,
    state: {
      sorting: sorting,
      columnFilters: columnFilters,
      columnVisibility: columnVisibility,
      globalFilter: searchText,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setSearchText,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
    },
  });

  function ticked(columnId: string) {
    return (table.getColumn(columnId)?.getFilterValue() as string[]) || [];
  }

  function setTicked(columnId: string, next: string[]) {
    table
      .getColumn(columnId)
      ?.setFilterValue(next.length === 0 ? undefined : next);
  }

  const isFiltered = columnFilters.length > 0 || searchText !== "";

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search a reason or a type..."
        isFiltered={isFiltered}
        onReset={() => {
          setColumnFilters([]);
          setSearchText("");
        }}
        shownCount={table.getFilteredRowModel().rows.length}
        totalCount={props.data.length}
        filterGroups={[
          {
            id: "status",
            title: "Status",
            options: STATUS_OPTIONS,
            counts: countValues(props.data, (leave) => leave.status),
            selected: ticked("status"),
            onChange: (next) => setTicked("status", next),
          },
          {
            id: "leaveType",
            title: "Type",
            options: buildFacetOptions(
              props.data,
              (leave) => leave.leaveType?.name || ""
            ),
            counts: countValues(
              props.data,
              (leave) => leave.leaveType?.name || ""
            ),
            selected: ticked("leaveType"),
            onChange: (next) => setTicked("leaveType", next),
          },
        ]}
        right={<DataTableViewOptions table={table} />}
      />

      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<CalendarX2 className="h-5 w-5" />}
        emptyTitle="No leave request"
        emptyDescription="This employee has not asked for any leave."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
