import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Users, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTableToolbar } from "@/components/table/DataTableToolbar";
import { DataTableViewOptions } from "@/components/table/DataTableViewOptions";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import {
  isOneOf,
  countValues,
  buildFacetOptions,
} from "@/components/table/facets";
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { ActiveStatusPill } from "@/components/common/ActiveStatusPill";
import { EmployeeActivityPanel } from "@/components/employees/EmployeeActivityPanel";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { getModuleBase } from "@/types/auth.types";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/employee.types";

// The two choices of the status filter. They never change, so they are
// written here instead of being read out of the rows.
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Every row of this table opens like an accordion, and what comes out under
// it is EmployeeActivityPanel: what that person is busy with today. So the
// table is two things at once - the list of who works here, and a quick look
// at any one of them without leaving the page.
//
// canEdit and canDelete come from the permissions of the logged in person.
// Giving somebody a new login password is part of editing them, so it follows
// canEdit. The server checks the same permissions again on every request.
interface EmployeeTableProps {
  data: Employee[];
  isLoading: boolean;
  // True while react query refreshes rows that are already on the screen.
  isFetching?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (employee: Employee) => void;
  onChangePassword: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export function EmployeeTable(props: EmployeeTableProps) {
  const navigate = useNavigate();
  const { user, hasFeature } = useAuth();

  // Does a row open into the activity panel at all? When the SaaS owner
  // switched that section off, the arrow, the click and the panel all go.
  const canOpenRows = hasFeature(FEATURES.EMPLOYEES_ACTIVITY);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  // The id of the row that is open right now, or null when they are all
  // closed. One id and not a list, because this is an accordion: opening
  // somebody closes whoever was open before, so the table never turns into a
  // wall of panels nobody reads.
  const [openEmployeeId, setOpenEmployeeId] = useState<string | null>(null);

  function toggleRow(employee: Employee) {
    setOpenEmployeeId(
      openEmployeeId === employee._id ? null : employee._id
    );
  }

  // This table is shown to the organization account and to an employee whose
  // role carries "employees.view", and the two live under a different address,
  // so the link to the detail page is built instead of written by hand.
  const employeesBase = getModuleBase(user?.role) + "/employees";

  const columns: ColumnDef<Employee>[] = [
    {
      // The arrow that says "there is more under this line". It turns a
      // quarter when the row is open, so the state of the row is readable
      // without opening anything else.
      id: "expander",
      header: "",
      enableHiding: false,
      enableSorting: false,
      size: 32,
      cell: ({ row }) =>
        canOpenRows ? (
          <ChevronRight
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              openEmployeeId === row.original._id && "rotate-90 text-foreground"
            )}
          />
        ) : null,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Employee" />
      ),
      cell: ({ row }) => (
        <EmployeeAvatar
          name={row.original.name}
          photo={row.original.photo}
          subtitle={row.original.designation}
          size="sm"
        />
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
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
      // The department name is inside an object, so we read it with a function.
      id: "department",
      accessorFn: (employee) => employee.department?.name || "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department" />
      ),
      filterFn: isOneOf,
      cell: ({ row }) => row.original.department?.name || "-",
    },
    {
      id: "role",
      accessorFn: (employee) => employee.role?.name || "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      filterFn: isOneOf,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span>{row.original.role?.name || "-"}</span>
          {/* The organization may have turned this role off after we saved it. */}
          {row.original.role?.status === "inactive" ? (
            <Badge variant="outline" className="text-[10px]">
              inactive role
            </Badge>
          ) : null}
        </div>
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
      id: "actions",
      header: "",
      enableHiding: false,
      size: 48,
      // The click on this cell must not open the row: it belongs to the menu.
      // DataTableRowActions keeps the click there for us.
      cell: ({ row }) => (
        <DataTableRowActions>
          {/* Pressing the row opens the quick look. The whole profile is one
              step further, and this is the way there — unless the SaaS owner
              switched the profile page off, and then there is nowhere to go. */}
          {hasFeature(FEATURES.EMPLOYEES_PROFILE) ? (
            <DropdownMenuItem
              onClick={() => navigate(employeesBase + "/" + row.original._id)}
            >
              Open profile
            </DropdownMenuItem>
          ) : null}

          {props.canEdit ? (
            <DropdownMenuItem onClick={() => props.onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
          ) : null}

          {props.canEdit ? (
            <DropdownMenuItem
              onClick={() => props.onChangePassword(row.original)}
            >
              Change password
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

  // Reading one filter. tanstack keeps the ticked boxes of a column as an
  // array of strings, and no filter at all as undefined.
  function ticked(columnId: string) {
    return (table.getColumn(columnId)?.getFilterValue() as string[]) || [];
  }

  // Writing one filter. An empty list means "nothing ticked", and that is
  // the same as having no filter, so we remove it instead of keeping it.
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
            id: "department",
            title: "Department",
            options: buildFacetOptions(
              props.data,
              (employee) => employee.department?.name || ""
            ),
            counts: countValues(
              props.data,
              (employee) => employee.department?.name || ""
            ),
            selected: ticked("department"),
            onChange: (next) => setTicked("department", next),
          },
          {
            id: "role",
            title: "Role",
            options: buildFacetOptions(
              props.data,
              (employee) => employee.role?.name || ""
            ),
            counts: countValues(
              props.data,
              (employee) => employee.role?.name || ""
            ),
            selected: ticked("role"),
            onChange: (next) => setTicked("role", next),
          },
          {
            id: "status",
            title: "Status",
            options: STATUS_OPTIONS,
            counts: countValues(props.data, (employee) => employee.status),
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
        emptyIcon={<Users className="h-5 w-5" />}
        emptyTitle="No employee found"
        emptyDescription="Change the filters, or add your first employee."
        // Clicking anywhere on the row opens the quick look under it, and
        // clicking it again closes it. The whole profile is one step further,
        // from the button inside the panel or from the row menu.
        //
        // The actions cell keeps its own clicks, so the menu still works.
        onRowClick={canOpenRows ? toggleRow : undefined}
        isRowExpanded={(employee) => employee._id === openEmployeeId}
        renderExpanded={(employee) => (
          <EmployeeActivityPanel
            employeeId={employee._id}
            employeeName={employee.name}
            profilePath={employeesBase + "/" + employee._id}
            isOpen={employee._id === openEmployeeId}
          />
        )}
      />

      <DataTablePagination table={table} />
    </div>
  );
}
