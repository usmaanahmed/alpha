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
import { ShieldCheck } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { isOneOf, countValues } from "@/components/table/facets";
import { ActiveStatusPill } from "@/components/common/ActiveStatusPill";
import type { Role } from "@/types/role.types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// The two choices of the "In use" filter. A role nobody carries can be
// deleted, one that somebody carries cannot, so this is the filter an
// organization reaches for when it is cleaning up its roles.
const USE_OPTIONS = [
  { value: "in_use", label: "Given to someone" },
  { value: "unused", label: "Nobody has it" },
];

interface RoleTableProps {
  data: Role[];
  isLoading: boolean;
  isFetching?: boolean;
  // The two buttons of the row menu are only shown when the logged in person
  // is really allowed to use them.
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleTable(props: RoleTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // "usage" is a helper column that only exists so the "In use" filter has
  // something to work on, so it starts hidden and stays hidden.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    usage: false,
  });
  const [searchText, setSearchText] = useState("");

  const showActions = props.canEdit || props.canDelete;

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => (
        <div className="max-w-72">
          <p className="truncate font-medium">{row.original.name}</p>
          {row.original.description ? (
            <p
              className="truncate text-xs text-muted-foreground"
              title={row.original.description}
            >
              {row.original.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "permissions",
      accessorFn: (role) => role.permissions.length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Permissions" />
      ),
      size: 180,
      cell: ({ row }) => {
        const count = row.original.permissions.length;

        // A role with nothing ticked is a normal member of the staff: they
        // still see their own tasks, meetings, attendance and leaves.
        return count === 0 ? (
          <span className="text-xs text-muted-foreground">
            None (own work only)
          </span>
        ) : (
          <span className="tabular-nums">
            {count}
            <span className="ml-1 text-xs text-muted-foreground">
              {count === 1 ? "permission" : "permissions"}
            </span>
          </span>
        );
      },
    },
    {
      id: "employees",
      accessorFn: (role) => role.employeeCount || 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="People" />
      ),
      size: 100,
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.employeeCount || 0}</span>
      ),
    },
    {
      // A hidden helper column: it holds "in_use" or "unused" so the filter
      // above has something to work on. It is never shown as a column of its
      // own, the "People" column already says the same in numbers.
      id: "usage",
      accessorFn: (role) =>
        (role.employeeCount || 0) > 0 ? "in_use" : "unused",
      filterFn: isOneOf,
      header: "",
      cell: () => null,
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
        showActions ? (
          <DataTableRowActions>
            {props.canEdit ? (
              <DropdownMenuItem onClick={() => props.onEdit(row.original)}>
                Edit &amp; permissions
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
        searchPlaceholder="Search roles..."
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
            counts: countValues(props.data, (role) => role.status),
            selected: ticked("status"),
            onChange: (next) => setTicked("status", next),
          },
          {
            id: "usage",
            title: "In use",
            options: USE_OPTIONS,
            counts: countValues(props.data, (role) =>
              (role.employeeCount || 0) > 0 ? "in_use" : "unused"
            ),
            selected: ticked("usage"),
            onChange: (next) => setTicked("usage", next),
          },
        ]}
        right={<DataTableViewOptions table={table} />}
      />

      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<ShieldCheck className="h-5 w-5" />}
        emptyTitle="No role found"
        emptyDescription="Change the filters, or write your first role."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
