import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

// The search box of a table toolbar.
//
// It is its own small component because it is used in two places: inside the
// toolbar of a table, and on the pages that keep their filters themselves
// (the cheques and the meetings, where the same filters also drive the card
// view). Both must look exactly the same.
export function DataTableSearch(props: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full sm:w-64", props.className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

      <input
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder || "Search..."}
        className="h-8 w-full rounded-md border border-input bg-transparent pr-8 pl-8 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
      />

      {/* The cross only exists while there is something to clear. */}
      {props.value !== "" ? (
        <button
          type="button"
          onClick={() => props.onChange("")}
          aria-label="Clear the search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
