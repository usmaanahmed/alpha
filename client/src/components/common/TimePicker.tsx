import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// A time is passed around as the text "09:30" on a 24 hour clock, because
// that is what the server and the <input type="time"> of the dialog use.
// An empty text means "no time yet".
//
// On the screen we show the same time the way a person says it, so
// "09:30" is read as "09:30 AM" and "18:00" as "06:00 PM".

// The hours of a clock face, starting at 12 like a real clock.
const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

// 0, 1, 2 ... 59
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const MERIDIEMS = ["AM", "PM"];

// "18:05" -> { hour: 6, minute: 5, meridiem: "PM" }
// An empty text gives 09:00 AM, which is the usual start of a day and a
// friendly place for the lists to open on.
function readParts(value: string) {
  if (!value) {
    return { hour: 9, minute: 0, meridiem: "AM" };
  }

  const [hours24, minutes] = value.split(":").map(Number);

  return {
    // 0 o'clock is 12 AM and 13 o'clock is 1 PM, so the two ends need
    // their own answer and everything in between is just hours24 % 12.
    hour: hours24 % 12 === 0 ? 12 : hours24 % 12,
    minute: minutes,
    meridiem: hours24 < 12 ? "AM" : "PM",
  };
}

// { hour: 6, minute: 5, meridiem: "PM" } -> "18:05"
function writeParts(parts: { hour: number; minute: number; meridiem: string }) {
  let hours24 = parts.hour;

  if (parts.meridiem === "AM" && parts.hour === 12) {
    hours24 = 0;
  }

  if (parts.meridiem === "PM" && parts.hour !== 12) {
    hours24 = parts.hour + 12;
  }

  return (
    String(hours24).padStart(2, "0") + ":" + String(parts.minute).padStart(2, "0")
  );
}

// "18:05" -> "06:05 PM". An empty text has nothing to show.
function formatTime12(value: string) {
  if (!value) {
    return "";
  }

  const parts = readParts(value);

  return (
    String(parts.hour).padStart(2, "0") +
    ":" +
    String(parts.minute).padStart(2, "0") +
    " " +
    parts.meridiem
  );
}

// A small button that opens three lists: the hour, the minute and AM / PM.
// Nothing is saved while the lists are open, so the user can change their
// mind; pressing Save gives the new time to the page.
export function TimePicker(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  // Read out by a screen reader, for example "Check in of Asha".
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // What the lists show right now. It starts again from the saved time
  // every time the popover is opened.
  const [draft, setDraft] = useState(() => readParts(props.value));

  function open(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(readParts(props.value));
    }

    setIsOpen(nextOpen);
  }

  function save() {
    props.onChange(writeParts(draft));
    setIsOpen(false);
  }

  function clear() {
    props.onChange("");
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={open}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={props.disabled}
          aria-label={props.label}
          className={cn(
            "h-8 gap-1.5 px-2 font-normal tabular-nums",
            !props.value && "text-muted-foreground"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {props.value ? formatTime12(props.value) : "Set time"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex divide-x">
          <TimeColumn
            values={CLOCK_HOURS.map(String)}
            selected={String(draft.hour)}
            onSelect={(value) => setDraft({ ...draft, hour: Number(value) })}
          />
          <TimeColumn
            values={MINUTES.map((minute) => String(minute).padStart(2, "0"))}
            selected={String(draft.minute).padStart(2, "0")}
            onSelect={(value) => setDraft({ ...draft, minute: Number(value) })}
          />
          <TimeColumn
            values={MERIDIEMS}
            selected={draft.meridiem}
            onSelect={(value) => setDraft({ ...draft, meridiem: value })}
          />
        </div>

        <div className="flex items-center gap-2 border-t p-2">
          <p className="mr-auto pl-1 text-sm tabular-nums">
            {formatTime12(writeParts(draft))}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={clear}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={save}>
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// One of the three lists. Every value is a button, and the chosen one is
// scrolled into sight when the popover opens.
function TimeColumn(props: {
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="h-52 w-16 overflow-y-auto p-1">
      {props.values.map((value) => {
        const isSelected = value === props.selected;

        return (
          <button
            key={value}
            type="button"
            ref={(node) => {
              if (isSelected && node) {
                node.scrollIntoView({ block: "nearest" });
              }
            }}
            onClick={() => props.onSelect(value)}
            className={cn(
              "w-full rounded-md py-1.5 text-center text-sm tabular-nums",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
