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
import { PartyPopper } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { isOneOf, countValues } from "@/components/table/facets";
import { formatDay } from "@/lib/date";
import type { Holiday } from "@/types/hr.types";

const KIND_OPTIONS = [
  { value: "full", label: "Full holiday" },
  { value: "optional", label: "Optional" },
];

// The months, in the order of the year and not in alphabetical order, so the
// filter dropdown reads the way a calendar does.
const MONTH_OPTIONS = [
  { value: "January", label: "January" },
  { value: "February", label: "February" },
  { value: "March", label: "March" },
  { value: "April", label: "April" },
  { value: "May", label: "May" },
  { value: "June", label: "June" },
  { value: "July", label: "July" },
  { value: "August", label: "August" },
  { value: "September", label: "September" },
  { value: "October", label: "October" },
  { value: "November", label: "November" },
  { value: "December", label: "December" },
];

// The month a holiday falls in, as a word. The dates come from the server in
// UTC, so we read them in UTC too: otherwise a holiday on the first of a
// month would jump to the month before for somebody living west of London.
function monthOf(holiday: Holiday) {
  return new Date(holiday.date).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

// The holiday list of one year.
//
// A normal employee can read the list but sees no buttons at all, because
// canEdit and canDelete are both false for them. The two are separate, so an
// organization can let somebody fix a holiday without letting them remove
// one. The server checks the same permissions again, this only hides the
// buttons that would not work anyway.
export function HolidayTable(props: {
  data: Holiday[];
  isLoading: boolean;
  isFetching?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (holiday: Holiday) => void;
  onDelete: (holiday: Holiday) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    // A holiday list is read as a calendar, so it starts sorted by date.
    { id: "date", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // "month" is a helper column that only exists so the month filter has
  // something to work on, so it starts hidden and stays hidden.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    month: false,
  });
  const [searchText, setSearchText] = useState("");

  const showActions = props.canEdit || props.canDelete;

  const columns: ColumnDef<Holiday>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      size: 150,
      cell: ({ row }) => {
        const date = new Date(row.original.date);

        return (
          <div className="flex items-center gap-2">
            {/* The day number big, the weekday small next to it: it is what
                a person actually looks for in a holiday list. */}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold tabular-nums">
              {date.getUTCDate()}
            </span>
            <div>
              <p className="font-medium">{formatDay(row.original.date)}</p>
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
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Holiday" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      // A hidden helper column so the month filter has something to work on.
      // The date column already shows the month, so this one never appears.
      id: "month",
      accessorFn: monthOf,
      filterFn: isOneOf,
      header: "",
      cell: () => null,
    },
    {
      id: "kind",
      accessorFn: (holiday) => (holiday.isOptional ? "optional" : "full"),
      header: "Type",
      enableSorting: false,
      filterFn: isOneOf,
      size: 130,
      cell: ({ row }) =>
        row.original.isOptional ? (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            Optional
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Full holiday
          </span>
        ),
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ row }) => (
        <p
          className="max-w-md truncate text-muted-foreground"
          title={row.original.description}
        >
          {row.original.description || "-"}
        </p>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      size: 48,
      cell: ({ row }) =>
        showActions ? (
          <DataTableRowActions>
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
        ) : null,
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
    initialState: {
      pagination: { pageSize: 25 },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setSearchText,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
        searchPlaceholder="Search a holiday..."
        isFiltered={isFiltered}
        onReset={() => {
          setColumnFilters([]);
          setSearchText("");
        }}
        shownCount={table.getFilteredRowModel().rows.length}
        totalCount={props.data.length}
        filterGroups={[
          {
            id: "month",
            title: "Month",
            options: MONTH_OPTIONS,
            counts: countValues(props.data, monthOf),
            selected: ticked("month"),
            onChange: (next) => setTicked("month", next),
          },
          {
            id: "kind",
            title: "Type",
            options: KIND_OPTIONS,
            counts: countValues(props.data, (holiday) =>
              holiday.isOptional ? "optional" : "full"
            ),
            selected: ticked("kind"),
            onChange: (next) => setTicked("kind", next),
          },
        ]}
        right={<DataTableViewOptions table={table} />}
      />

      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<PartyPopper className="h-5 w-5" />}
        emptyTitle="No holiday in this year"
        emptyDescription="Change the filters, or add the first day off."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
