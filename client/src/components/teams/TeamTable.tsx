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
import { UsersRound } from "lucide-react";
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
import { Avatar } from "@/components/common/Avatar";
import { PersonInline } from "@/components/common/PersonInline";
import { ActiveStatusPill } from "@/components/common/ActiveStatusPill";
import type { Team, TeamPerson } from "@/types/team.types";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// The pictures of the first members, one next to the other, and a small
// "+3" when the team has more. It says "how big is this team" in one look,
// without making the row tall.
//
// The pictures overlap a little (-space-x-1.5), which is what keeps the
// group narrow in a compact table.
function MemberAvatars(props: { members: TeamPerson[] }) {
  if (props.members.length === 0) {
    return <span className="text-xs text-muted-foreground">No member yet</span>;
  }

  const firstFour = props.members.slice(0, 4);
  const rest = props.members.length - firstFour.length;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        {firstFour.map((member) => (
          <Avatar
            key={member._id}
            name={member.name}
            photo={member.photo}
            size="xs"
            className="ring-2 ring-card"
          />
        ))}
      </div>

      {rest > 0 ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {"+" + rest}
        </span>
      ) : null}
    </div>
  );
}

// canEdit and canDelete come from the permissions of the logged in person.
// Changing who is in a team is part of editing it, so "Manage members"
// follows canEdit. The server checks the same permissions again.
interface TeamTableProps {
  data: Team[];
  isLoading: boolean;
  isFetching?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (team: Team) => void;
  onManageMembers: (team: Team) => void;
  onDelete: (team: Team) => void;
}

export function TeamTable(props: TeamTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [searchText, setSearchText] = useState("");

  const columns: ColumnDef<Team>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team" />
      ),
      cell: ({ row }) => (
        <div className="max-w-64">
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
      id: "department",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department" />
      ),
      // The search box reads this text too, so a team can be found by
      // typing the name of its department.
      accessorFn: (team) => team.department?.name || "",
      filterFn: isOneOf,
      cell: ({ row }) => row.original.department?.name || "-",
    },
    {
      id: "teamLead",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Team lead" />
      ),
      accessorFn: (team) => team.teamLead?.name || "",
      cell: ({ row }) =>
        row.original.teamLead ? (
          <PersonInline
            name={row.original.teamLead.name}
            photo={row.original.teamLead.photo}
            note={row.original.teamLead.designation}
          />
        ) : (
          "-"
        ),
    },
    {
      id: "members",
      // The number of members is what a person sorts on, and it is also what
      // the search box would never find, so the column reads the count.
      accessorFn: (team) => (team.members || []).length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Members" />
      ),
      size: 130,
      cell: ({ row }) => <MemberAvatars members={row.original.members || []} />,
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
      cell: ({ row }) =>
        props.canEdit || props.canDelete ? (
          <DataTableRowActions>
            {props.canEdit ? (
              <DropdownMenuItem onClick={() => props.onEdit(row.original)}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {props.canEdit ? (
              <DropdownMenuItem
                onClick={() => props.onManageMembers(row.original)}
              >
                Manage members
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
        searchPlaceholder="Search team, department, lead..."
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
              (team) => team.department?.name || ""
            ),
            counts: countValues(
              props.data,
              (team) => team.department?.name || ""
            ),
            selected: ticked("department"),
            onChange: (next) => setTicked("department", next),
          },
          {
            id: "status",
            title: "Status",
            options: STATUS_OPTIONS,
            counts: countValues(props.data, (team) => team.status),
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
        emptyIcon={<UsersRound className="h-5 w-5" />}
        emptyTitle="No team found"
        emptyDescription="Change the filters, or build your first team."
      />

      <DataTablePagination table={table} />
    </div>
  );
}
