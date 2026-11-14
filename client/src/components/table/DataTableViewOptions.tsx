import { Check, SlidersHorizontal } from "lucide-react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// "employeeName" -> "Employee name", so the menu shows real words instead of
// the ids the columns were given in the code.
function prettyName(columnId: string) {
  const withSpaces = columnId.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

// The "Columns" menu at the right end of a toolbar: it hides and shows the
// columns of the table.
//
// TRow is whatever one line of this table is (an Employee, a Cheque, ...).
// We never look inside it here, we only hand it back to tanstack, so one
// single component works for every table of the app.
export function DataTableViewOptions<TRow>(props: {
  table: TanstackTable<TRow>;
}) {
  // Only the columns a person can actually see are offered here. A column
  // written with an empty title ("") is one of our own helpers - the actions
  // menu, or a hidden column that only exists so a filter has something to
  // work on - and putting those in the menu would only confuse.
  const columns = props.table
    .getAllColumns()
    .filter((column) => column.getCanHide() && column.columnDef.header !== "");

  if (columns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Columns</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="text-xs">
          Shown columns
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {columns.map((column) => (
          <DropdownMenuItem
            key={column.id}
            // The menu stays open, so several columns can be turned off in
            // one go instead of reopening it every time.
            onSelect={(event) => {
              event.preventDefault();
              column.toggleVisibility(!column.getIsVisible());
            }}
          >
            <Check
              className={
                column.getIsVisible()
                  ? "h-3.5 w-3.5 opacity-100"
                  : "h-3.5 w-3.5 opacity-0"
              }
            />
            {prettyName(column.id)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
