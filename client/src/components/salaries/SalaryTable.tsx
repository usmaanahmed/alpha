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
import { Wallet } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { isOneOf, countValues } from "@/components/table/facets";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import {
  SALARY_TYPE_OPTIONS,
  getSalaryTypeLabel,
  getAllowances,
  getTotalAllowances,
  formatMoney,
  formatSalaryDate,
} from "@/types/salary.types";
import type { Salary } from "@/types/salary.types";

// An amount, always with two decimals and always lined up on the right, so a
// whole column of money can be read at a glance.
function Money(props: { amount: number }) {
  return (
    <span className="block text-right tabular-nums">
      {formatMoney(props.amount)}
    </span>
  );
}

// canEdit and canDelete come from the permissions of the logged in person.
// The server checks the same permissions again.
interface SalaryTableProps {
  data: Salary[];
  isLoading: boolean;
  isFetching?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onView: (salary: Salary) => void;
  onEdit: (salary: Salary) => void;
  onDelete: (salary: Salary) => void;
}

export function SalaryTable(props: SalaryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  const columns: ColumnDef<Salary>[] = [
    {
      id: "employee",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employee" />
      ),
      // The search box and the "sort by employee name" both read this text.
      accessorFn: (salary) => salary.employee?.name || "",
      cell: ({ row }) => (
        <div className="max-w-64">
          <EmployeeAvatar
            name={row.original.employee?.name || "Employee removed"}
            photo={row.original.employee?.photo || ""}
            subtitle={row.original.employee?.designation || ""}
          />
        </div>
      ),
    },
    {
      accessorKey: "salaryType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Type" />
      ),
      filterFn: isOneOf,
      size: 110,
      cell: ({ row }) => getSalaryTypeLabel(row.original.salaryType),
    },
    {
      accessorKey: "basicSalary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Basic" />
      ),
      size: 120,
      cell: ({ row }) => <Money amount={row.original.basicSalary} />,
    },
    {
      accessorKey: "grossSalary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Gross" />
      ),
      size: 120,
      cell: ({ row }) => <Money amount={row.original.grossSalary} />,
    },
    {
      accessorKey: "netSalary",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Net" />
      ),
      size: 120,
      cell: ({ row }) => <Money amount={row.original.netSalary} />,
    },
    {
      id: "totalAllowances",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Allowances" />
      ),
      // Sorting reads the total amount, which is what a person compares.
      accessorFn: (salary) => getTotalAllowances(salary),
      size: 140,
      cell: ({ row }) => {
        const count = getAllowances(row.original).length;

        return (
          <div className="text-right">
            <Money amount={getTotalAllowances(row.original)} />
            <p className="text-xs text-muted-foreground">
              {count === 1 ? "1 allowance" : count + " allowances"}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      size: 120,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatSalaryDate(row.original.createdAt)}
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
          <DropdownMenuItem onClick={() => props.onView(row.original)}>
            View
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
        searchPlaceholder="Search employee name..."
        isFiltered={isFiltered}
        onReset={() => {
          setColumnFilters([]);
          setSearchText("");
        }}
        shownCount={table.getFilteredRowModel().rows.length}
        totalCount={props.data.length}
        filterGroups={[
          {
            id: "salaryType",
            title: "Salary type",
            options: SALARY_TYPE_OPTIONS,
            counts: countValues(props.data, (salary) => salary.salaryType),
            selected: ticked("salaryType"),
            onChange: (next) => setTicked("salaryType", next),
          },
        ]}
        right={<DataTableViewOptions table={table} />}
      />

      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<Wallet className="h-5 w-5" />}
        emptyTitle="No salary structure found"
        emptyDescription="Change the filters, or write the first salary structure."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
