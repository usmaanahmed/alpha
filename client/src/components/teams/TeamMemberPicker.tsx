import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PersonInline } from "@/components/common/PersonInline";
import { cn } from "@/lib/utils";

// One person the picker can show. Both the team form (which reads the
// whole employee list) and the "manage members" dialog (which reads the
// candidates of one team) send this same small shape.
export interface PickerPerson {
  _id: string;
  name: string;
  photo: string;
  designation: string;
}

// The list used to choose who is in the team. Every person is one
// clickable row: clicking it adds or removes them. A small search box on
// top helps when the department has many people.
//
// This is the same idea as the AttendeePicker of the meeting module, only
// the people here come from one department instead of the whole company.
export function TeamMemberPicker(props: {
  people: PickerPerson[];
  selected: string[];
  onChange: (next: string[]) => void;
  isLoading: boolean;
  // What to write when there is nobody to choose from.
  emptyText?: string;
}) {
  const [search, setSearch] = useState("");

  // Add the person if they are not chosen yet, remove them if they are.
  function toggle(personId: string) {
    if (props.selected.includes(personId)) {
      props.onChange(props.selected.filter((id) => id !== personId));
    } else {
      props.onChange([...props.selected, personId]);
    }
  }

  const text = search.trim().toLowerCase();
  const visible = props.people.filter((person) => {
    if (text === "") {
      return true;
    }
    return (person.name + " " + person.designation)
      .toLowerCase()
      .includes(text);
  });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search people..."
          className="pl-8"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-md border">
        {props.isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Loading people...
          </p>
        ) : visible.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {props.emptyText || "Nobody to choose here."}
          </p>
        ) : (
          visible.map((person) => {
            const isChosen = props.selected.includes(person._id);

            return (
              <button
                key={person._id}
                type="button"
                onClick={() => toggle(person._id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-accent",
                  isChosen && "bg-accent/50"
                )}
              >
                <PersonInline
                  name={person.name}
                  photo={person.photo}
                  note={person.designation}
                />

                {/* The tick shows this person is in the team. */}
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
        {props.selected.length} member(s) chosen
      </p>
    </div>
  );
}
