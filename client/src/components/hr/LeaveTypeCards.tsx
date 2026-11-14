import {
  MoreHorizontal,
  CalendarPlus,
  Wallet,
  Gift,
  PartyPopper,
  Paperclip,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cardColorAt } from "@/lib/leaveStatus";
import { describeFileKinds } from "@/lib/leaveDocuments";
import type { LeaveType } from "@/types/hr.types";

// The leave types of the organization, shown as a grid of cards instead of
// a table. A leave type has only a few fields, so a card can show all of
// them at once and reads much better than a wide row.
//
// An inactive type is drawn faded, because it is hidden from the apply form
// and a person should see that at once.
export function LeaveTypeCards(props: {
  data: LeaveType[];
  isLoading: boolean;
  // The two buttons of the card menu follow the permissions of the logged in
  // person, and the server checks them again on every request.
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (leaveType: LeaveType) => void;
  onDelete: (leaveType: LeaveType) => void;
}) {
  if (props.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((box) => (
          <div
            key={box}
            className="h-40 animate-pulse rounded-xl border bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (props.data.length === 0) {
    return (
      <Card className="items-center gap-3 border-dashed py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CalendarPlus className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">No leave type yet</p>
          <p className="text-sm text-muted-foreground">
            Add one so your employees can start applying.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {props.data.map((leaveType, index) => {
        const color = cardColorAt(index);
        const isActive = leaveType.status === "active";

        return (
          <Card
            key={leaveType._id}
            className={
              "relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md " +
              (isActive ? "" : "opacity-60")
            }
          >
            <div
              className={
                "pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-linear-to-br to-transparent blur-2xl " +
                color.glow
              }
            />

            <div className="relative flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">
                    {leaveType.name}
                  </p>

                  <span
                    className={
                      "mt-1 inline-flex items-center gap-1.5 text-xs " +
                      (isActive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground")
                    }
                  >
                    <span
                      className={
                        "h-1.5 w-1.5 rounded-full " +
                        (isActive ? "bg-emerald-500" : "bg-slate-400")
                      }
                    />
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {props.canEdit || props.canDelete ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="-mt-1">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {props.canEdit ? (
                        <DropdownMenuItem onClick={() => props.onEdit(leaveType)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {props.canDelete ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => props.onDelete(leaveType)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>

              <div className="flex items-end gap-3">
                <p className="text-3xl leading-none font-semibold tabular-nums">
                  {leaveType.daysPerYear}
                </p>
                <p className="text-xs text-muted-foreground">days per year</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={
                    "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                    (leaveType.isPaid
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-slate-500/10 text-slate-700 dark:text-slate-400")
                  }
                >
                  {leaveType.isPaid ? (
                    <Wallet className="h-3 w-3" />
                  ) : (
                    <Gift className="h-3 w-3" />
                  )}
                  {leaveType.isPaid ? "Paid leave" : "Unpaid leave"}
                </span>

                {/* How a public holiday inside this leave is counted. It
                    changes the number of days an employee loses, so it
                    belongs on the card next to "paid" and not hidden in the
                    edit form. */}
                <span
                  className={
                    "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                    (leaveType.excludeHolidays
                      ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400")
                  }
                  title={
                    leaveType.excludeHolidays
                      ? "A public holiday inside the leave is not counted as a leave day."
                      : "A public holiday inside the leave is counted as a normal leave day."
                  }
                >
                  <PartyPopper className="h-3 w-3" />
                  {leaveType.excludeHolidays
                    ? "Holidays free"
                    : "Holidays counted"}
                </span>

                {/* Whether this type asks for a paper, and how badly. A type
                    that takes no document says nothing at all here, because
                    that is the normal case and a chip for it would only make
                    the card noisier. */}
                {leaveType.allowDocuments ? (
                  <span
                    className={
                      "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
                      (leaveType.documentRequirement === "required"
                        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        : "bg-slate-500/10 text-slate-700 dark:text-slate-400")
                    }
                    title={
                      "Takes " +
                      describeFileKinds(leaveType.allowedFileKinds) +
                      ", up to " +
                      leaveType.maxFiles +
                      " files of " +
                      leaveType.maxFileSizeMb +
                      " MB each."
                    }
                  >
                    <Paperclip className="h-3 w-3" />
                    {leaveType.documentRequirement === "required"
                      ? "Document required"
                      : "Document optional"}
                  </span>
                ) : null}
              </div>

              <p className="line-clamp-2 border-t pt-3 text-sm text-muted-foreground">
                {leaveType.description || "No description."}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
