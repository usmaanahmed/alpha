import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PersonInline } from "@/components/common/PersonInline";
import { cn } from "@/lib/utils";
import type { AssignableEmployee } from "@/types/meeting.types";

// The list the organizer uses to pick who is invited. Every employee is one
// clickable row: clicking it adds or removes them from the chosen list. A
// small search box on top helps when there are many employees.
export function AttendeePicker(props: {
  employees: AssignableEmployee[];
  selected: string[];
  onChange: (next: string[]) => void;
  isLoading: boolean;
}) {
  const [search, setSearch] = useState("");

  // Add the employee if they are not chosen yet, remove them if they are.
  function toggle(employeeId: string) {
    if (props.selected.includes(employeeId)) {
      props.onChange(props.selected.filter((id) => id !== employeeId));
    } else {
      props.onChange([...props.selected, employeeId]);
    }
  }

  const text = search.trim().toLowerCase();
  const visible = props.employees.filter((employee) => {
    if (text === "") {
      return true;
    }
    const haystack =
      employee.name + " " + employee.email + " " + (employee.designation || "");
    return haystack.toLowerCase().includes(text);
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees..."
          className="pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border">
        {props.isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Loading employees...
          </p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No employee to show.
          </p>
        ) : (
          visible.map((employee) => {
            const isChosen = props.selected.includes(employee._id);

            return (
              <button
                key={employee._id}
                type="button"
                onClick={() => toggle(employee._id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent",
                  isChosen && "bg-accent/50"
                )}
              >
                <PersonInline
                  name={employee.name}
                  photo={employee.photo}
                  note={employee.designation || employee.department?.name || ""}
                />

                {/* The tick shows this person is invited. */}
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                    isChosen
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                >
                  {isChosen ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {props.selected.length} invited
      </p>
    </div>
  );
}
