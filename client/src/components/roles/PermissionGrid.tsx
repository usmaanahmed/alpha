import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PermissionGroup } from "@/types/role.types";

// The checkbox grid of the role form.
//
// One block per module ("Employees", "Tasks", ...) and inside it one clickable
// line per action. Clicking a line adds or removes that permission, and the
// small button on the right of a block ticks or unticks the whole module at
// once, because "give this person everything about the employees" is what an
// organization really wants to say most of the time.
//
// The groups come from the server, so the grid always shows exactly the
// permissions the server knows.
export function PermissionGrid(props: {
  groups: PermissionGroup[];
  selected: string[];
  onChange: (next: string[]) => void;
  isLoading: boolean;
  // The role form of an employee cannot give away more than that employee
  // has itself, so the boxes it may not touch are drawn greyed out. For the
  // organization account this is simply undefined and everything is open.
  allowed?: string[];
}) {
  // Is this permission one I am allowed to tick at all?
  function isAllowed(permission: string) {
    if (!props.allowed) {
      return true;
    }

    return props.allowed.includes(permission);
  }

  // Add the permission if it is not chosen yet, remove it if it is.
  function toggle(permission: string) {
    if (!isAllowed(permission)) {
      return;
    }

    if (props.selected.includes(permission)) {
      props.onChange(props.selected.filter((key) => key !== permission));
    } else {
      props.onChange([...props.selected, permission]);
    }
  }

  // Tick every action of one module, or untick all of them.
  function toggleGroup(group: PermissionGroup) {
    const keys = group.items
      .map((item) => item.key)
      .filter((key) => isAllowed(key));

    const allChosen = keys.every((key) => props.selected.includes(key));

    if (allChosen) {
      props.onChange(props.selected.filter((key) => !keys.includes(key)));
    } else {
      // Never write the same permission two times.
      const next = [...props.selected];
      keys.forEach((key) => {
        if (!next.includes(key)) {
          next.push(key);
        }
      });
      props.onChange(next);
    }
  }

  if (props.isLoading) {
    return (
      <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">
        Loading the permissions...
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Tick everything this role is allowed to do.
        </p>
        <span className="text-sm font-medium">
          {props.selected.length} permission(s) chosen
        </span>
      </div>

      <div className="flex max-h-[22rem] flex-col gap-4 overflow-y-auto rounded-md border p-3">
        {props.groups.map((group) => {
          const openKeys = group.items
            .map((item) => item.key)
            .filter((key) => isAllowed(key));

          const chosenCount = group.items.filter((item) =>
            props.selected.includes(item.key)
          ).length;

          const allChosen =
            openKeys.length > 0 &&
            openKeys.every((key) => props.selected.includes(key));

          return (
            <div key={group.key} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {group.label}
                  {chosenCount > 0 ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {chosenCount} of {group.items.length}
                    </span>
                  ) : null}
                </p>

                {openKeys.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroup(group)}
                  >
                    {allChosen ? "Clear all" : "Select all"}
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((item) => {
                  const isChosen = props.selected.includes(item.key);
                  const isOpen = isAllowed(item.key);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!isOpen}
                      onClick={() => toggle(item.key)}
                      title={
                        isOpen
                          ? item.description
                          : "You cannot give a permission you do not have yourself"
                      }
                      className={cn(
                        "flex items-start gap-2 rounded-md border p-2 text-left hover:bg-accent",
                        isChosen && "border-primary/40 bg-accent/50",
                        !isOpen && "cursor-not-allowed opacity-50 hover:bg-transparent"
                      )}
                    >
                      {/* The little square that shows the answer. */}
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isChosen
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isChosen ? <Check className="h-3 w-3" /> : null}
                      </span>

                      <span className="flex flex-col">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
