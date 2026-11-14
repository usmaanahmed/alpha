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
import { isOneOf, countValues } from "@/components/table/facets";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { WorkedHoursBar } from "./WorkedHoursBar";
import { formatTime } from "@/lib/date";
import type { Attendance } from "@/types/hr.types";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half day" },
  { value: "on_leave", label: "On leave" },
  { value: "holiday", label: "Holiday" },
];

// The days of the logged in employee for one month, as a list.
// The calendar above it shows the same days as squares; this table is for
// when somebody wants to read the real times.
export function MyAttendanceTable(props: {
  data: Attendance[];
  isLoading: boolean;
  isFetching?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  const columns: ColumnDef<Attendance>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      size: 190,
      cell: ({ row }) => {
        // The dates come from the server in UTC, and they are read in UTC
        // too, so a day never slides to the one before it.
        const date = new Date(row.original.date);

        return (
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums">
              {date.getUTCDate()}
            </span>
            <div>
              <p className="font-medium">
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {date.toLocaleDateString(undefined, {
                  weekday: "long",
                  timeZone: "UTC",
                })}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "checkIn",
      header: "Check in",
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatTime(row.original.checkIn)}</span>
      ),
    },
    {
      accessorKey: "checkOut",
      header: "Check out",
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (
        <span className="tabular-nums">{formatTime(row.original.checkOut)}</span>
      ),
    },
    {
      accessorKey: "workedHours",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hours" />
      ),
      size: 170,
      cell: ({ row }) => <WorkedHoursBar hours={row.original.workedHours} />,
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      filterFn: isOneOf,
      size: 120,
      cell: ({ row }) => <AttendanceStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      enableSorting: false,
      cell: ({ row }) => (
        <p
          className="max-w-64 truncate text-muted-foreground"
          title={row.original.remarks}
        >
          {row.original.remarks || "-"}
        </p>
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
      // A month never has more than 31 days, so the whole month fits on one
      // page and the pagination line stays quiet.
      pagination: { pageSize: 31 },
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
        searchPlaceholder="Search a remark..."
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
            counts: countValues(props.data, (day) => day.status),
            selected: ticked("status"),
            onChange: (next) => setTicked("status", next),
          },
        ]}
        right={<DataTableViewOptions table={table} />}
      />

      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<CalendarX2 className="h-5 w-5" />}
        emptyTitle="No attendance in this month"
        emptyDescription="Change the filters, or pick another month above."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
