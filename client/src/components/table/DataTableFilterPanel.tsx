import { useState } from "react";
import { Check, ChevronDown, ListFilter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { FilterGroup } from "./facets";

// The "Filter" button of a table, and the panel it opens.
//
// Before this, every filter of a table sat in the toolbar as its own little
// dropdown, so a table with four filters ate the whole line. Now there is one
// button, and the panel behind it holds the filters of that table only: the
// employees see Department / Role / Status, the holidays see Month / Type.
//
// Every filter is a multiple choice on purpose: a person answering leave
// requests wants "pending AND approved" in one go. Nothing ticked in a
// section means "show everything" for that section.
export function DataTableFilterPanel(props: { groups: FilterGroup[] }) {
  // The sections a person has folded away. We remember the closed ones and
  // not the open ones, so a section is open by default and a table that grows
  // a new filter shows it straight away.
  const [closedIds, setClosedIds] = useState<string[]>([]);

  // The little search box of a long section, kept per section id, for example
  // { department: "sal" }.
  const [searchByGroup, setSearchByGroup] = useState<Record<string, string>>(
    {}
  );

  // How many boxes are ticked in the whole panel. It is the number on the
  // button, so a person sees there is a filter on without opening anything.
  let tickedCount = 0;

  for (const group of props.groups) {
    tickedCount = tickedCount + group.selected.length;
  }

  function toggleSection(id: string) {
    if (closedIds.includes(id)) {
      setClosedIds(closedIds.filter((one) => one !== id));
    } else {
      setClosedIds([...closedIds, id]);
    }
  }

  // Ticking a box that is already ticked removes it again.
  function toggleValue(group: FilterGroup, value: string) {
    if (group.selected.includes(value)) {
      group.onChange(group.selected.filter((one) => one !== value));
    } else {
      group.onChange([...group.selected, value]);
    }
  }

  function clearEverything() {
    for (const group of props.groups) {
      if (group.selected.length > 0) {
        group.onChange([]);
      }
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8",
            // Once something is ticked the button stops being a suggestion
            // and starts being a filter, so it takes the main colour.
            tickedCount > 0 &&
              "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
          )}
        >
          <ListFilter className="h-3.5 w-3.5" />
          Filter
          {tickedCount > 0 ? (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
              {tickedCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 overflow-hidden p-0" align="start">
        {/* The head of the panel: what it is, and the way out of everything. */}
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">Filters</p>

          {tickedCount > 0 ? (
            <button
              type="button"
              onClick={clearEverything}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          ) : null}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {props.groups.map((group) => {
            const isOpen = !closedIds.includes(group.id);

            // The search box only appears when the list is long enough to
            // need it, so a "Status" section with three lines stays as
            // simple as it looks.
            const isSearchable = group.options.length > 8;

            const searchText = (searchByGroup[group.id] || "")
              .trim()
              .toLowerCase();

            const visibleOptions = group.options.filter((option) =>
              searchText === ""
                ? true
                : option.label.toLowerCase().includes(searchText)
            );

            return (
              <div key={group.id} className="border-b last:border-b-0">
                {/* The title line of the section, which folds it away. */}
                <button
                  type="button"
                  onClick={() => toggleSection(group.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent/50"
                >
                  <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {group.title}
                  </span>

                  <span className="flex items-center gap-1.5">
                    {group.selected.length > 0 ? (
                      <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-medium tabular-nums text-primary">
                        {group.selected.length}
                      </span>
                    ) : null}

                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </span>
                </button>

                {isOpen ? (
                  <div className="pb-1">
                    {isSearchable ? (
                      <div className="mx-2 mb-1 flex items-center gap-2 rounded-md border px-2">
                        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <input
                          value={searchByGroup[group.id] || ""}
                          onChange={(event) =>
                            setSearchByGroup({
                              ...searchByGroup,
                              [group.id]: event.target.value,
                            })
                          }
                          placeholder={
                            "Search " + group.title.toLowerCase() + "..."
                          }
                          className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    ) : null}

                    <div className="max-h-52 overflow-y-auto px-1">
                      {visibleOptions.length === 0 ? (
                        <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Nothing found.
                        </p>
                      ) : (
                        visibleOptions.map((option) => {
                          const isTicked = group.selected.includes(
                            option.value
                          );

                          const count = group.counts
                            ? group.counts[option.value]
                            : null;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleValue(group, option.value)}
                              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            >
                              {/* A hand made tick box: a small square that
                                  fills up with the main colour when it is
                                  ticked. */}
                              <span
                                className={cn(
                                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                                  isTicked
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-input"
                                )}
                              >
                                {isTicked ? (
                                  <Check className="h-3 w-3" />
                                ) : null}
                              </span>

                              <span className="flex-1 truncate text-left">
                                {option.label}
                              </span>

                              {count !== null && count !== undefined ? (
                                <span className="text-xs tabular-nums text-muted-foreground">
                                  {count}
                                </span>
                              ) : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// The ticked values written next to the "Filter" button, one small pill each.
//
// The filters live inside a panel now, so without these a person would have
// to open the panel to remember why the table is showing so few rows. Each
// pill also takes its own value back off when the cross is pressed.
export function DataTableActiveFilters(props: { groups: FilterGroup[] }) {
  // Every ticked value of every section, flattened into one list of pills.
  const pills: {
    key: string;
    title: string;
    label: string;
    remove: () => void;
  }[] = [];

  for (const group of props.groups) {
    for (const value of group.selected) {
      const option = group.options.find((one) => one.value === value);

      pills.push({
        key: group.id + ":" + value,
        title: group.title,
        label: option ? option.label : value,
        remove: () =>
          group.onChange(group.selected.filter((one) => one !== value)),
      });
    }
  }

  if (pills.length === 0) {
    return null;
  }

  // Three pills is about as much as the line can hold next to the search box
  // and the buttons. The rest is only counted, and the panel shows them all.
  const shownPills = pills.slice(0, 3);
  const hiddenCount = pills.length - shownPills.length;

  return (
    <>
      {shownPills.map((pill) => (
        <span
          key={pill.key}
          className="flex h-8 max-w-52 items-center gap-1 rounded-md border border-dashed bg-accent/30 pr-1 pl-2 text-xs"
        >
          <span className="text-muted-foreground">{pill.title}</span>
          <span className="truncate font-medium">{pill.label}</span>

          <button
            type="button"
            onClick={pill.remove}
            aria-label={"Remove the filter " + pill.title + " " + pill.label}
            className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {hiddenCount > 0 ? (
        <span className="text-xs text-muted-foreground">
          {"+" + hiddenCount + " more"}
        </span>
      ) : null}
    </>
  );
}
