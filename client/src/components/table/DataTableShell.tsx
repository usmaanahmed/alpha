import { Fragment } from "react";
import type { ReactNode } from "react";
import { flexRender } from "@tanstack/react-table";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { Inbox } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// The box the rows live in: the border, the header line, the grey bars while
// react query is still loading, the empty state, and the rows themselves.
//
// Every table of the app hands its tanstack table to this one component, so
// they all look the same and none of them has to write the same twenty lines
// of header / body / "nothing here" markup again.
//
// TRow is one line of this table (an Employee, a Cheque, ...). We never look
// inside it: we only hand it back to tanstack, and to the two callbacks the
// table gave us.
export function DataTableShell<TRow>(props: {
  table: TanstackTable<TRow>;
  // isLoading is react query's first load: there is nothing on the screen yet,
  // so we draw grey bars in the shape of the table.
  isLoading: boolean;
  // isFetching is react query refreshing rows that are already on the screen
  // (after a save, or when the window is focused again). The rows stay where
  // they are, and a thin line on top says something is on its way.
  isFetching?: boolean;
  emptyIcon?: ReactNode;
  emptyTitle: string;
  emptyDescription?: string;
  // Given when a whole row can be pressed, for example to open a detail page.
  onRowClick?: (row: TRow) => void;
  // Given when some rows must look different from the others, for example a
  // day that belongs to an approved leave.
  rowClassName?: (row: TRow) => string | undefined;
  // These two turn the rows into an accordion, and they always come together.
  //
  // isRowExpanded answers "is this row open right now?", and renderExpanded
  // gives back what to draw under it, in one cell stretched over every
  // column. The table that uses them keeps the open row in its own state, so
  // the shell never has to decide anything: it only asks and draws.
  //
  // A table that passes neither never grows a second line and behaves exactly
  // as it did before.
  isRowExpanded?: (row: TRow) => boolean;
  renderExpanded?: (row: TRow) => ReactNode;
  // How tall the table may grow before it scrolls on its own, for example
  // "max-h-[70vh]". Only then does a sticky header have anything to stick to.
  maxHeightClassName?: string;
  skeletonRows?: number;
}) {
  const rows = props.table.getRowModel().rows;

  // How many columns are on the screen right now. The "loading" bars and the
  // "nothing here" box have to stretch over all of them.
  const columnCount = props.table.getVisibleFlatColumns().length;

  const skeletonRows = props.skeletonRows || 6;

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-xs">
      {/* The refresh line. It sits on top of the header and takes no room of
          its own, so the table never jumps when it appears. */}
      {props.isFetching && !props.isLoading ? (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 animate-pulse bg-primary/60" />
      ) : null}

      <Table containerClassName={props.maxHeightClassName}>
        <TableHeader sticky={props.maxHeightClassName !== undefined}>
          {props.table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                // A column may ask for a fixed width with `size: 120`. The
                // ones that do not simply share whatever is left.
                const width = header.column.columnDef.size;

                return (
                  <TableHead
                    key={header.id}
                    style={width ? { width: width } : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {props.isLoading ? (
            // Grey bars in the shape of the table, so the page does not jump
            // around once the real rows land.
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {Array.from({ length: columnCount }).map((__, cellIndex) => (
                  <TableCell key={cellIndex} className="py-2.5">
                    <div className="h-3.5 animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columnCount} className="py-14">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    {props.emptyIcon || <Inbox className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{props.emptyTitle}</p>
                    {props.emptyDescription ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {props.emptyDescription}
                      </p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              // Only true when this table can open rows AND this row is the
              // one that is open right now.
              const isExpanded =
                props.renderExpanded !== undefined &&
                props.isRowExpanded !== undefined &&
                props.isRowExpanded(row.original);

              // React needs ONE thing back for each row of the list, but an
              // open row is two lines: the row itself and the panel under it.
              // A fragment holds the two together, and it carries the key.
              return (
                <Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      props.onRowClick && "cursor-pointer",
                      props.rowClassName
                        ? props.rowClassName(row.original)
                        : undefined
                    )}
                    // The row of an accordion says out loud whether it is
                    // open, for a screen reader and for the pale background
                    // the open row gets (see has-aria-expanded in table.tsx).
                    aria-expanded={
                      props.isRowExpanded ? isExpanded : undefined
                    }
                    onClick={
                      props.onRowClick
                        ? () => props.onRowClick?.(row.original)
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {/* The open panel. It is one cell stretched over every
                      column, with no padding of its own, so what the table
                      gives us decides how the panel looks inside. */}
                  {isExpanded ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={columnCount}
                        className="whitespace-normal bg-muted/30 p-0"
                      >
                        {props.renderExpanded?.(row.original)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
