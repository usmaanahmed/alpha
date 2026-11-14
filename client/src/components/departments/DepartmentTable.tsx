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
import { Building2 } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { isOneOf, countValues } from "@/components/table/facets";
import { ActiveStatusPill } from "@/components/common/ActiveStatusPill";
import type { Department } from "@/types/department.types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// canEdit and canDelete come from the permissions of the logged in person, so
// somebody who may only read the departments sees no button at all. The
// server checks the same permissions again on every request.
interface DepartmentTableProps {
  data: Department[];
  isLoading: boolean;
  isFetching?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
}

export function DepartmentTable(props: DepartmentTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  const columns: ColumnDef<Department>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      cell: ({ row }) => (
        // A long description would push every other column off the screen,
        // so it is cut with three dots and shown in full on hover.
        <p
          className="max-w-md truncate text-muted-foreground"
          title={row.original.description}
        >
          {row.original.description || "-"}
        </p>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      filterFn: isOneOf,
      size: 110,
      cell: ({ row }) => <ActiveStatusPill status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      size: 120,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      size: 48,
      cell: ({ row }) =>
        props.canEdit || props.canDelete ? (
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
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setSearchText,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
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
        searchPlaceholder="Search departments..."
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
            counts: countValues(props.data, (department) => department.status),
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
        emptyIcon={<Building2 className="h-5 w-5" />}
        emptyTitle="No department found"
        emptyDescription="Change the filters, or create your first department."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
