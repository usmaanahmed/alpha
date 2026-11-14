import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// How many rows a page can hold. 25 is the one we start with in a compact
// table: the rows are short enough that a whole screen is filled without
// scrolling twice.
const PAGE_SIZES = [10, 25, 50, 100];

// The line under every table: how many rows there are, how big a page is,
// and the four buttons that walk through the pages.
//
// TRow is one line of this table. We only hand it back to tanstack.
export function DataTablePagination<TRow>(props: {
  table: TanstackTable<TRow>;
}) {
  const state = props.table.getState().pagination;

  // How many rows the filters kept. It is what the pages are counted from,
  // so it is also the honest number to show.
  const rowCount = props.table.getFilteredRowModel().rows.length;

  // A table that fits on one page needs no controls at all, so it gets a
  // single quiet line instead.
  if (rowCount <= state.pageSize && state.pageIndex === 0) {
    return (
      <p className="px-1 text-xs text-muted-foreground">
        {rowCount + (rowCount === 1 ? " row" : " rows")}
      </p>
    );
  }

  // The numbers of the first and of the last row of the page we are on, so
  // the line can say "1-25 of 132".
  const firstRow = state.pageIndex * state.pageSize + 1;
  const lastRow = Math.min(firstRow + state.pageSize - 1, rowCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs tabular-nums text-muted-foreground">
        {firstRow + "-" + lastRow + " of " + rowCount}
      </p>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-xs text-muted-foreground">Rows per page</span>

          <Select
            value={String(state.pageSize)}
            onValueChange={(value) => props.table.setPageSize(Number(value))}
          >
            <SelectTrigger size="sm" className="h-8 w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <span className="text-xs tabular-nums text-muted-foreground">
          {"Page " +
            (state.pageIndex + 1) +
            " of " +
            (props.table.getPageCount() || 1)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="First page"
            onClick={() => props.table.setPageIndex(0)}
            disabled={!props.table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            onClick={() => props.table.previousPage()}
            disabled={!props.table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            onClick={() => props.table.nextPage()}
            disabled={!props.table.getCanNextPage()}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Last page"
            onClick={() =>
              props.table.setPageIndex(props.table.getPageCount() - 1)
            }
            disabled={!props.table.getCanNextPage()}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
