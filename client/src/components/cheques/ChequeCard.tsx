import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChequeVisual } from "./ChequeVisual";
import { daysUntilDue, isPending } from "@/types/cheque.types";
import type { Cheque } from "@/types/cheque.types";

// One cheque in the card grid: the pretty cheque drawing, plus a small menu
// in the corner and a red "overdue" flag when the due date is gone. The whole
// card is clickable and opens the details.
export function ChequeCard(props: {
  cheque: Cheque;
  // "View details" is always there; the two others follow the permissions of
  // the logged in person.
  canEdit: boolean;
  canDelete: boolean;
  onView: (cheque: Cheque) => void;
  onEdit: (cheque: Cheque) => void;
  onDelete: (cheque: Cheque) => void;
}) {
  const cheque = props.cheque;

  const days = daysUntilDue(cheque);
  const isOverdue = isPending(cheque) && days !== null && days < 0;

  return (
    <div className="group relative transition-transform duration-200 hover:-translate-y-1">
      <button
        type="button"
        onClick={() => props.onView(cheque)}
        className="block w-full rounded-xl text-left outline-none ring-primary/50 transition-shadow hover:shadow-lg focus-visible:ring-2"
      >
        <ChequeVisual cheque={cheque} compact />
      </button>

      {/* The little "..." menu. It sits above the card, so we stop the click
          from also opening the details behind it. */}
      <div
        className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 shadow-sm"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => props.onView(cheque)}>
              View details
            </DropdownMenuItem>
            {props.canEdit ? (
              <DropdownMenuItem onClick={() => props.onEdit(cheque)}>
                Edit
              </DropdownMenuItem>
            ) : null}
            {props.canDelete ? (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => props.onDelete(cheque)}
              >
                Delete
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* The overdue flag, drawn on top of the card. */}
      {isOverdue ? (
        <span className="absolute bottom-3 left-5 rounded-full bg-red-600 px-2 py-0.5 text-[0.65rem] font-semibold text-white shadow">
          Overdue
        </span>
      ) : null}
    </div>
  );
}
