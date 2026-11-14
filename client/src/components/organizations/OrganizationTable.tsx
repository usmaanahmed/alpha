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
import { Building } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { isOneOf, countValues } from "@/components/table/facets";
import { ActiveStatusPill } from "@/components/common/ActiveStatusPill";
import type { Organization } from "@/types/organization.types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// The page gives us the data and tells us what to do
// when the user clicks one of the row actions.
interface OrganizationTableProps {
  data: Organization[];
  isLoading: boolean;
  isFetching?: boolean;
  onEdit: (organization: Organization) => void;
  onChangePassword: (organization: Organization) => void;
  onEditModules: (organization: Organization) => void;
  onDelete: (organization: Organization) => void;
}

export function OrganizationTable(props: OrganizationTableProps) {
  // Which column is sorted right now.
  const [sorting, setSorting] = useState<SortingState>([]);
  // Which boxes are ticked in the filter dropdowns.
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  // Which columns are hidden through the "Columns" menu.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  // What the user typed in the search box.
  const [searchText, setSearchText] = useState("");

  // Here we describe every column of the table.
  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Organization" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Login email" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">
          {row.original.phone || "-"}
        </span>
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
      id: "modules",
      header: "Modules",
      enableSorting: false,
      size: 120,
      // What the SaaS owner sold to this organization. The document keeps
      // the switched OFF ones, so an empty list is the full app.
      cell: ({ row }) => {
        const offCount = (row.original.disabledModules || []).length;

        if (offCount === 0) {
          return <Badge variant="secondary">Full app</Badge>;
        }

        return <Badge variant="outline">{offCount} off</Badge>;
      },
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
      cell: ({ row }) => (
        <DataTableRowActions>
          <DropdownMenuItem onClick={() => props.onEdit(row.original)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => props.onChangePassword(row.original)}
          >
            Change password
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => props.onEditModules(row.original)}>
            Modules
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => props.onDelete(row.original)}
          >
            Delete
          </DropdownMenuItem>
        </DataTableRowActions>
      ),
    },
  ];

  // This is the tanstack table instance.
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
      pagination: {
        pageSize: 25,
      },
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
        searchPlaceholder="Search name, email, phone..."
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
            counts: countValues(
              props.data,
              (organization) => organization.status
            ),
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
        emptyIcon={<Building className="h-5 w-5" />}
        emptyTitle="No organization found"
        emptyDescription="Change the filters, or create your first organization."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
