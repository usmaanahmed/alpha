import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The "..." menu at the end of a row.
//
// It stops the click from travelling further on purpose: on the tables whose
// rows can be pressed (an employee, a cheque, a meeting), opening this menu
// must not also open the detail page behind it.
//
// The children are the menu entries, written by each table, because what a
// row offers is the one thing that really changes from table to table.
export function DataTableRowActions(props: { children: ReactNode }) {
  return (
    <div
      className="flex justify-end"
      onClick={(event) => event.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Row actions"
            className="text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-44">
          {props.children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
