import type { Row } from "@tanstack/react-table";

// One choice inside a filter dropdown, for example { value: "active",
// label: "Active" }.
export interface FacetOption {
  value: string;
  label: string;
}

// One section inside the "Filter" panel of a table, for example the whole
// "Status" block with its two choices.
//
// Every table writes its own list of these and hands it to the toolbar. The
// panel only draws them: the ticked values stay where they already lived
// (tanstack for a normal table, a piece of state on the page for the cheques
// and the meetings), so a filter keeps working exactly as before.
export interface FilterGroup {
  // Used as the react key, so it only has to be unique inside one table.
  id: string;
  title: string;
  options: FacetOption[];
  // The values that are ticked right now. An empty list means "no filter".
  selected: string[];
  onChange: (next: string[]) => void;
  // How many rows carry each value. Optional, because a filter on something
  // the rows do not hold has no count to show.
  counts?: Record<string, number>;
}

// The filter used by every column that is filtered with a dropdown.
//
// tanstack keeps the ticked boxes as an array of strings, so a row stays on
// the screen when its own value is one of them. When nothing is ticked the
// filter is removed by the dropdown itself, so this never runs with an
// empty list.
export function isOneOf<TRow>(
  row: Row<TRow>,
  columnId: string,
  ticked: string[]
) {
  return ticked.includes(String(row.getValue(columnId)));
}

// How many rows carry each value, for example { active: 12, inactive: 3 }.
// The dropdown writes these numbers next to each choice, so a person sees
// how much a filter is going to hide before pressing it.
export function countValues<TItem>(
  items: TItem[],
  read: (item: TItem) => string
) {
  const counts: Record<string, number> = {};

  for (const item of items) {
    const value = read(item);

    if (value !== "") {
      counts[value] = (counts[value] || 0) + 1;
    }
  }

  return counts;
}

// Build the choices of a dropdown straight from the data.
//
// Some filters have a list we know in advance ("active" / "inactive"), and
// those are written by hand. Others do not: the departments, the roles or
// the banks change while the app is used, so their choices are read from the
// rows that are on the screen. Empty values are skipped and the rest is
// sorted, so the list always looks the same.
export function buildFacetOptions<TItem>(
  items: TItem[],
  read: (item: TItem) => string
): FacetOption[] {
  const seen: string[] = [];

  for (const item of items) {
    const value = read(item);

    if (value !== "" && !seen.includes(value)) {
      seen.push(value);
    }
  }

  seen.sort((left, right) => left.localeCompare(right));

  return seen.map((value) => ({ value: value, label: value }));
}
