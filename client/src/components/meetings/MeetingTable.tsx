import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { CalendarClock, Video, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTableShell } from "@/components/table/DataTableShell";
import { DataTablePagination } from "@/components/table/DataTablePagination";
import { DataTableColumnHeader } from "@/components/table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/table/DataTableRowActions";
import { MeetingStatusBadge } from "./MeetingStatusBadge";
import {
  formatMeetingDateTime,
  formatDuration,
  getResponseLabel,
  getResponseVariant,
} from "@/types/meeting.types";
import type { Meeting } from "@/types/meeting.types";

// The plain list of meetings. Clicking a row opens the detail dialog, where
// all the actions live.
//
// This table has no toolbar of its own: the search box and the two filter
// dropdowns live on the page above it, because the very same filters also
// drive the card view next to this one. What is kept here is what only makes
// sense for a table: sorting a column, and walking through the pages.
export function MeetingTable(props: {
  data: Meeting[];
  isLoading: boolean;
  isFetching?: boolean;
  onView: (meeting: Meeting) => void;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meeting: Meeting) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    // The soonest meeting first: it is the one a person is looking for.
    { id: "startAt", desc: false },
  ]);

  const columns: ColumnDef<Meeting>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Meeting" />
      ),
      cell: ({ row }) => (
        <div className="flex max-w-72 items-center gap-2">
          <span className="truncate font-medium">{row.original.title}</span>

          {row.original.myResponse ? (
            <Badge
              variant={getResponseVariant(row.original.myResponse)}
              className="shrink-0 text-[10px]"
            >
              {"You: " + getResponseLabel(row.original.myResponse)}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "startAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="When" />
      ),
      size: 190,
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatMeetingDateTime(row.original.startAt)}
        </span>
      ),
    },
    {
      accessorKey: "durationMinutes",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Duration" />
      ),
      size: 100,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDuration(row.original.durationMinutes)}
        </span>
      ),
    },
    {
      id: "where",
      accessorFn: (meeting) => meeting.location || meeting.meetingType,
      header: "Where",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex max-w-48 items-center gap-1.5">
          {row.original.meetingType === "online" ? (
            <Video className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate">
            {row.original.location ||
              (row.original.meetingType === "online" ? "Online" : "In person")}
          </span>
        </span>
      ),
    },
    {
      id: "people",
      accessorFn: (meeting) => meeting.attendees.length,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="People" />
      ),
      size: 90,
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 tabular-nums">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {row.original.attendees.length}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      enableSorting: false,
      size: 120,
      cell: ({ row }) => <MeetingStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      size: 48,
      cell: ({ row }) => (
        <DataTableRowActions>
          <DropdownMenuItem onClick={() => props.onView(row.original)}>
            View details
          </DropdownMenuItem>
          {row.original.canManage ? (
            <DropdownMenuItem onClick={() => props.onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
          ) : null}
          {row.original.canManage ? (
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
    state: { sorting: sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 25 },
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <DataTableShell
        table={table}
        isLoading={props.isLoading}
        isFetching={props.isFetching}
        emptyIcon={<CalendarClock className="h-5 w-5" />}
        emptyTitle="No meeting to show"
        emptyDescription="Change the filters above, or schedule the first one."
        onRowClick={props.onView}
      />

      <DataTablePagination table={table} />
    </div>
  );
}
