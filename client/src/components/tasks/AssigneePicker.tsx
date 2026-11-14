import { useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/common/Avatar";
import { PersonInline } from "@/components/common/PersonInline";
import { cn } from "@/lib/utils";
import type { AssignableEmployee } from "@/types/task.types";

// One department with the people of that department inside it.
interface DepartmentGroup {
  departmentId: string;
  departmentName: string;
  // True when this department is not mine: the task then goes to the
  // manager of that department (inter-department task).
  isOtherDepartment: boolean;
  people: AssignableEmployee[];
}

// Put the employees in one box per department.
//
// The dropdown of the task form used to have three groups (my team, my
// department, other departments). Now we show the real department names,
// so here we build one group per department and only keep the "other
// department" flag, because those rows still mean "the task goes to their
// manager".
//
// The order is: my own departments first, then the other ones, both sorted
// by name. Inside a group the people of the teams I lead come first, then
// everybody else by name.
function groupByDepartment(employees: AssignableEmployee[]): DepartmentGroup[] {
  const groups: DepartmentGroup[] = [];

  for (const employee of employees) {
    let group = groups.find(
      (item) => item.departmentId === employee.department._id
    );

    if (!group) {
      group = {
        departmentId: employee.department._id,
        departmentName: employee.department.name,
        isOtherDepartment: employee.isOtherDepartment === true,
        people: [],
      };
      groups.push(group);
    }

    group.people.push(employee);
  }

  for (const group of groups) {
    group.people.sort((a, b) => {
      // The people of the teams I lead first.
      if (a.isMyTeamMember !== b.isMyTeamMember) {
        return a.isMyTeamMember ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  groups.sort((a, b) => {
    if (a.isOtherDepartment !== b.isOtherDepartment) {
      return a.isOtherDepartment ? 1 : -1;
    }
    return a.departmentName.localeCompare(b.departmentName);
  });

  return groups;
}

// The "Assign to" field of the task form: a box that opens a small panel
// with a search line on top and the employees written under the name of
// their department.
//
// It is not the normal Select of the UI kit, because that one cannot hold
// a text field inside it. It is the same idea as the AttendeePicker of the
// meeting module, only here exactly one person is chosen.
export function AssigneePicker(props: {
  employees: AssignableEmployee[];
  // The id of the chosen employee, empty string when nobody is chosen.
  value: string;
  onChange: (employeeId: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // The search box gets the cursor when the panel opens, so the user can
  // start typing the name right away.
  const searchInputRef = useRef<HTMLInputElement>(null);

  // The box the user clicks to open the panel.
  const triggerRef = useRef<HTMLButtonElement>(null);

  // The dialog this field lives in, or null when it is used on a plain
  // page. The panel is drawn inside that dialog, and a dialog cuts off
  // everything that grows past its own edges, so the panel has to be told
  // to stay inside it: it then opens upwards, or becomes shorter, when
  // there is not enough room under the field.
  const [dialog, setDialog] = useState<HTMLElement | null>(null);

  // Radix calls this when the panel opens and when it closes. We throw the
  // typed text away both times, so the list is never already filtered when
  // the user opens the field again.
  function onOpenChange(nextIsOpen: boolean) {
    setIsOpen(nextIsOpen);
    setSearch("");

    if (nextIsOpen) {
      setDialog(
        triggerRef.current?.closest<HTMLElement>("[data-slot=dialog-content]") ||
          null
      );
    }
  }

  const chosenEmployee = props.employees.find(
    (employee) => employee._id === props.value
  );

  // Keep only the people the typed text matches. We look at the name, the
  // email, the role and the department, so "sales" finds the whole sales
  // department and "manager" finds every manager.
  const text = search.trim().toLowerCase();
  const visible = props.employees.filter((employee) => {
    if (text === "") {
      return true;
    }
    const haystack =
      employee.name +
      " " +
      employee.email +
      " " +
      employee.role.name +
      " " +
      employee.department.name;
    return haystack.toLowerCase().includes(text);
  });

  // Building the groups is a bit of work, so we redo it only when the
  // people we show really changed.
  const groups = useMemo(() => groupByDepartment(visible), [visible]);

  function choose(employeeId: string) {
    props.onChange(employeeId);
    setIsOpen(false);
  }

  // Enter picks the first person of the list, which is what you expect
  // after typing a name that leaves only one line on the screen.
  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }
    // The picker lives inside the task form, so Enter must not send it.
    event.preventDefault();

    const firstGroup = groups[0];
    if (firstGroup && firstGroup.people.length > 0) {
      choose(firstGroup.people[0]._id);
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          disabled={props.disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50"
          )}
        >
          {chosenEmployee ? (
            <PersonInline
              name={chosenEmployee.name}
              photo={chosenEmployee.photo}
              note={"(" + chosenEmployee.department.name + ")"}
            />
          ) : (
            <span className="text-muted-foreground">Choose an employee</span>
          )}

          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        // Drawn inside the dialog, not at the end of the page, so the
        // mouse wheel and a finger on a phone can scroll the list. A
        // dialog freezes the scrolling of everything outside itself.
        withPortal={false}
        // ... and because it is inside the dialog, it must also stay
        // inside it: Radix flips it above the field, or makes it shorter,
        // when the room under the field is not enough.
        collisionBoundary={dialog ? [dialog] : []}
        collisionPadding={8}
        className="flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) flex-col p-0"
        // The panel opens with the cursor already in the search box.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
      >
        <div className="shrink-0 border-b p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Search name, role or department..."
              className="h-8 pl-8"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={onSearchKeyDown}
            />
          </div>
        </div>

        <div className="max-h-64 min-h-0 flex-1 overflow-y-auto p-1">
          {props.isLoading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Loading employees...
            </p>
          ) : groups.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              {props.employees.length === 0
                ? "There is nobody you can give a task to right now."
                : "No employee matches this search."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.departmentId} className="pb-1">
                {/* The name of the department, written once above its
                    people. */}
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {group.departmentName}
                  {group.isOtherDepartment ? " (goes to their manager)" : ""}
                </p>

                {group.people.map((employee) => {
                  const isChosen = employee._id === props.value;

                  return (
                    <button
                      key={employee._id}
                      type="button"
                      onClick={() => choose(employee._id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent",
                        isChosen && "bg-accent"
                      )}
                    >
                      <Avatar
                        name={employee.name}
                        photo={employee.photo}
                        size="sm"
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{employee.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {employee.role.name}
                          {employee.isMyTeamMember ? " - my team" : ""}
                        </span>
                      </span>

                      {/* The tick marks the person who gets the task. */}
                      {isChosen ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
