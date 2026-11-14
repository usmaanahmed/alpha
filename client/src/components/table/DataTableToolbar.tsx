import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTableSearch } from "./DataTableSearch";
import {
  DataTableFilterPanel,
  DataTableActiveFilters,
} from "./DataTableFilterPanel";
import type { FilterGroup } from "./facets";

// The bar that sits above every table: the search box on the left, the one
// "Filter" button next to it, and whatever the table wants on the right (the
// "Columns" menu, a view switch, ...).
//
// It is one single row that wraps by itself on a small screen. The filters
// themselves live inside the panel the button opens, so a table with four
// filters takes exactly as much room as a table with one.
export function DataTableToolbar(props: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  // The filter sections of this table, written by the table itself. Leave it
  // out and the "Filter" button is not drawn at all.
  filterGroups?: FilterGroup[];
  // True when the search box or one of the filters is doing something. The
  // "Reset" button only exists then, so the toolbar stays quiet until there
  // is really something to undo.
  isFiltered: boolean;
  onReset: () => void;
  // How many rows the filters kept, out of how many there are. It is what
  // makes a filter feel honest: you always see what you are hiding.
  shownCount?: number;
  totalCount?: number;
  right?: ReactNode;
}) {
  const groups = props.filterGroups || [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DataTableSearch
        value={props.searchValue}
        onChange={props.onSearchChange}
        placeholder={props.searchPlaceholder}
        className="w-full sm:w-60"
      />

      {groups.length > 0 ? <DataTableFilterPanel groups={groups} /> : null}

      {/* The ticked values, so the panel does not hide what it is doing. */}
      {groups.length > 0 ? <DataTableActiveFilters groups={groups} /> : null}

      {props.isFiltered ? (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-muted-foreground"
          onClick={props.onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      ) : null}

      {/* ml-auto pushes this half to the far right of the line. */}
      <div className="ml-auto flex items-center gap-2">
        {props.isFiltered &&
        props.shownCount !== undefined &&
        props.totalCount !== undefined ? (
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {props.shownCount + " of " + props.totalCount}
          </span>
        ) : null}

        {props.right}
      </div>
    </div>
  );
}
