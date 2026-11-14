import * as React from "react"

import { cn } from "@/lib/utils"

// The compact table used everywhere in the app.
//
// "Compact" means three things, and they are all decided here so that no
// single table has to repeat them:
//   - the header line is short (h-9) and written small, in upper case,
//   - a cell has little padding (px-3 py-1.5) and 13px text,
//   - the line between two rows is thin and pale instead of a full border.
//
// The table scrolls sideways on a small screen, so a wide table never pushes
// the page itself out of shape.
// containerClassName goes on the box that scrolls, not on the table itself.
// A table that is allowed to grow tall gives it a max height here, and that
// is also what makes a sticky header work: a header can only stick inside a
// box that really scrolls.
function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        "relative w-full overflow-auto overscroll-x-contain",
        containerClassName
      )}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-[13px]", className)}
        {...props}
      />
    </div>
  )
}

// sticky keeps the header line visible while the rows scroll under it. It is
// used by the tables that can grow long, like the attendance of one day.
function TableHeader({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"thead"> & { sticky?: boolean }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        "[&_tr]:border-b [&_tr]:border-border/70 [&_tr]:bg-muted/50 [&_tr:hover]:bg-muted/50",
        sticky && "sticky top-0 z-10 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border/50 transition-colors hover:bg-muted/40 has-aria-expanded:bg-muted/40 data-[state=selected]:bg-primary/5",
        className
      )}
      {...props}
    />
  )
}

// The little words at the top of a column. They are small, grey and in upper
// case on purpose: the eye then reads the rows first and the titles second,
// which is what keeps a dense table calm to look at.
function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-9 px-3 text-left align-middle text-[11px] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-3 py-1.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
