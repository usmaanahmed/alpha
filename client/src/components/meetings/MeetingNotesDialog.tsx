import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSaveMeetingNotes } from "@/hooks/useMeetings";
import { cn } from "@/lib/utils";
import type { Meeting } from "@/types/meeting.types";

// One action item while it is being edited in this dialog. It is a plain
// { text, done }; the server gives every saved one an _id, but the ones the
// user is still typing do not have one yet, so we do not use ids here.
interface EditableItem {
  text: string;
  done: boolean;
}

// Write the minutes of the meeting and its action items (small to-dos that
// came out of the meeting). Only the owner of the meeting sees this.
export function MeetingNotesDialog(props: {
  meeting: Meeting | null;
  onClose: () => void;
}) {
  const saveNotes = useSaveMeetingNotes();

  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    if (props.meeting) {
      setNotes(props.meeting.notes);
      setItems(
        props.meeting.actionItems.map((item) => ({
          text: item.text,
          done: item.done,
        }))
      );
      setNewItem("");
    }
  }, [props.meeting]);

  function addItem() {
    const text = newItem.trim();
    if (text === "") {
      return;
    }
    setItems([...items, { text: text, done: false }]);
    setNewItem("");
  }

  function toggleItem(index: number) {
    const next = [...items];
    next[index] = { ...next[index], done: !next[index].done };
    setItems(next);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function onSave() {
    if (!props.meeting) {
      return;
    }

    saveNotes.mutate(
      {
        id: props.meeting._id,
        values: { notes: notes, actionItems: items },
      },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.meeting !== null} onOpenChange={props.onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Meeting notes</DialogTitle>
          <DialogDescription>
            Write what was decided in "{props.meeting?.title}" and list the
            things to do afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="meeting-notes">Notes</Label>
            <Textarea
              id="meeting-notes"
              rows={5}
              placeholder="What was discussed and decided"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {/* --- Action items --- */}
          <div className="flex flex-col gap-2">
            <Label>Action items</Label>

            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No action item yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {items.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                  >
                    {/* A tick toggles "done". */}
                    <button
                      type="button"
                      onClick={() => toggleItem(index)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        item.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {item.done ? <Check className="h-3.5 w-3.5" /> : null}
                    </button>

                    <span
                      className={cn(
                        "flex-1 text-sm",
                        item.done && "text-muted-foreground line-through"
                      )}
                    >
                      {item.text}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* The box to add a new item. Enter also adds it. */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add an action item"
                value={newItem}
                onChange={(event) => setNewItem(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addItem();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={saveNotes.isPending}>
            {saveNotes.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
