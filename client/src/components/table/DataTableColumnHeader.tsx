import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { Column } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// The title of a column that can be sorted.
//
// It is a button, so pressing it turns the sorting on: first from A to Z,
// then from Z to A, then off again. The arrow next to the word says which
// of the three we are in, and it only turns dark once the column is really
// sorting something.
//
// TRow is one line of the table (an Employee, a Cheque, ...) and TValue the
// thing this column reads out of it. We never look at either of them, we
// only hand them back to tanstack.
export function DataTableColumnHeader<TRow, TValue>(props: {
  column: Column<TRow, TValue>;
  title: string;
  className?: string;
}) {
  // A column that cannot be sorted is simply a word, with no button around
  // it, so nobody tries to press something that does nothing.
  if (!props.column.getCanSort()) {
    return <span className={props.className}>{props.title}</span>;
  }

  const sorted = props.column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => props.column.toggleSorting(sorted === "asc")}
      className={cn(
        "-mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold tracking-wider uppercase transition-colors hover:text-foreground",
        sorted ? "text-foreground" : "text-muted-foreground",
        props.className
      )}
    >
      {props.title}

      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}
