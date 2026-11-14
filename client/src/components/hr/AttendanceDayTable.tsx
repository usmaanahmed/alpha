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
import { Pencil, UserX, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { EmployeeAvatar } from "@/components/common/EmployeeAvatar";
import { TimePicker } from "@/components/common/TimePicker";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { WorkedHoursBar } from "./WorkedHoursBar";
import { toTimeInputValue } from "@/lib/date";
import type { Attendance } from "@/types/hr.types";

// One line of the table: an employee of the organization together with the
// attendance of the day we are looking at. attendance is null when nobody
// marked this person on this day yet.
export interface EmployeeDayRow {
  employeeId: string;
  name: string;
  photo: string;
  designation: string;
  departmentName: string;
  attendance: Attendance | null;
}

// The attendance of the whole organization for one day.
// Every active employee is a line, also the ones nobody marked yet.
// Only the organization and an HR see this page.
//
// The status tiles above this table (on the page) already filter by status,
// so the toolbar here adds the two filters the tiles cannot give: the search
// box and the department.
export function AttendanceDayTable(props: {
  rows: EmployeeDayRow[];
  isLoading: boolean;
  isFetching?: boolean;
  onEdit: (row: EmployeeDayRow) => void;
  // Called when the present / absent switch is pressed.
  onTogglePresent: (row: EmployeeDayRow, isPresent: boolean) => void;
  // Called when one of the two times of a line is changed. The time is the
  // text "09:30" on a 24 hour clock, and "" when it was cleared.
  onChangeTime: (
    row: EmployeeDayRow,
    field: "checkIn" | "checkOut",
    time: string
  ) => void;
  // The employee whose switch is being saved right now, so we can turn
  // only that one switch off while we wait for the server.
  savingEmployeeId: string | null;
  // False for somebody who may read the attendance of everybody but not fix
  // it: they get the same table, with every control switched off.
  canEdit: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  const columns: ColumnDef<EmployeeDayRow>[] = [
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
      accessorKey: "departmentName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department" />
      ),
      filterFn: isOneOf,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.departmentName || "-"}
        </span>
      ),
    },
    {
      id: "present",
      header: "Present",
      enableSorting: false,
      size: 130,
      cell: ({ row }) => {
        const attendance = row.original.attendance;

        // The switch is on only for a present day. A half day, a leave and
        // a holiday are neither, so it stays off and the badge in the status
        // column tells the whole story.
        const isPresent = attendance?.status === "present";

        // This day belongs to an approved leave. The days were already taken
        // from the leave balance, so the line is locked: nobody can flip this
        // person to present by mistake. The pencil still opens the dialog,
        // which is where a real correction is made.
        const isOnLeave = attendance?.status === "on_leave";

        if (isOnLeave) {
          return (
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-400"
              title="This day belongs to an approved leave"
            >
              <Plane className="h-3.5 w-3.5" />
              On leave
            </span>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={isPresent}
              disabled={
                !props.canEdit ||
                props.savingEmployeeId === row.original.employeeId
              }
              onCheckedChange={(checked) =>
                props.onTogglePresent(row.original, checked)
              }
              aria-label={"Mark " + row.original.name + " present"}
            />
            <span className="text-xs text-muted-foreground">
              {isPresent ? "Present" : "Absent"}
            </span>
          </div>
        );
      },
    },
    {
      id: "checkIn",
      header: "Check in",
      enableSorting: false,
      size: 130,
      cell: ({ row }) => (
        <TimePicker
          value={toTimeInputValue(row.original.attendance?.checkIn)}
          disabled={
            !props.canEdit ||
            row.original.attendance?.status === "on_leave" ||
            props.savingEmployeeId === row.original.employeeId
          }
          label={"Check in of " + row.original.name}
          onChange={(time) => props.onChangeTime(row.original, "checkIn", time)}
        />
      ),
    },
    {
      id: "checkOut",
      header: "Check out",
      enableSorting: false,
      size: 130,
      cell: ({ row }) => (
        <TimePicker
          value={toTimeInputValue(row.original.attendance?.checkOut)}
          disabled={
            !props.canEdit ||
            row.original.attendance?.status === "on_leave" ||
            props.savingEmployeeId === row.original.employeeId
          }
          label={"Check out of " + row.original.name}
          onChange={(time) => props.onChangeTime(row.original, "checkOut", time)}
        />
      ),
    },
    {
      id: "hours",
      accessorFn: (row) => row.attendance?.workedHours || 0,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Hours" />
      ),
      size: 170,
      cell: ({ row }) => (
        <WorkedHoursBar hours={row.original.attendance?.workedHours || 0} />
      ),
    },
    {
      id: "status",
      // Somebody nobody marked yet has no attendance at all, so the column
      // reads "not_marked" for them and the filter can find them too.
      accessorFn: (row) => row.attendance?.status || "not_marked",
      header: "Status",
      enableSorting: false,
      size: 120,
      cell: ({ row }) =>
        row.original.attendance ? (
          <AttendanceStatusBadge status={row.original.attendance.status} />
        ) : (
          <span className="text-xs text-muted-foreground">Not marked</span>
        ),
    },
    {
      id: "remarks",
      accessorFn: (row) => row.attendance?.remarks || "",
      header: "Remarks",
      enableSorting: false,
      cell: ({ row }) => (
        <p
          className="max-w-48 truncate text-muted-foreground"
          title={row.original.attendance?.remarks}
        >
          {row.original.attendance?.remarks || "-"}
        </p>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      size: 48,
      cell: ({ row }) =>
        props.canEdit ? (
          <div className="flex justify-end">
            <Button
              size="icon-sm"
              variant="ghost"
              title="Edit this day"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => props.onEdit(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
    },
  ];

  const table = useReactTable({
    data: props.rows,
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
        searchPlaceholder="Search an employee..."
        isFiltered={isFiltered}
        onReset={() => {
          setColumnFilters([]);
          setSearchText("");
        }}
        shownCount={table.getFilteredRowModel().rows.length}
        totalCount={props.rows.length}
        filterGroups={[
          {
            id: "departmentName",
            title: "Department",
            options: buildFacetOptions(
              props.rows,
              (row) => row.departmentName || ""
            ),
            counts: countValues(props.rows, (row) => row.departmentName || ""),
            selected: ticked("departmentName"),
            onChange: (next) => setTicked("departmentName", next),
          },
        ]}
        right={<DataTableViewOptions table={table} />}
      />

      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<UserX className="h-5 w-5" />}
        emptyTitle="No employee to show here"
        emptyDescription="Change the filters, or pick another day above."
        // This table can be long, so it scrolls inside itself and keeps its
        // header line in place while the rows go by.
        maxHeightClassName="max-h-[70vh]"
        // A day that belongs to an approved leave gets a very pale blue row.
        rowClassName={(row) =>
          row.attendance?.status === "on_leave" ? "bg-sky-500/5" : undefined
        }
      />

      <DataTablePagination table={table} />
    </div>
  );
}
