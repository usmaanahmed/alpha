import { Ban, CheckCircle2, Loader2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// The bar that floats at the bottom of the screen while rows are ticked.
// It says how many are ticked and offers what can be done with all of them
// at once. It only shows the buttons the person is allowed to use.
export function EmployeeSelectionDock(props: {
  selectedCount: number
  // Shown only when at least one ticked employee would really change.
  canSetActive: boolean
  canSetInactive: boolean
  canDelete: boolean
  isBusy: boolean
  onSetActive: () => void
  onSetInactive: () => void
  onDelete: () => void
  onClear: () => void
}) {
  if (props.selectedCount === 0) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-3 py-2.5 shadow-lg">
        <div className="flex items-center gap-2 pl-1 pr-2">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {props.selectedCount}
          </span>
          <span className="text-sm font-medium">selected</span>
        </div>

        <div className="hidden h-6 w-px bg-border sm:block" />

        {props.canSetActive ? (
          <Button
            variant="outline"
            size="sm"
            disabled={props.isBusy}
            onClick={props.onSetActive}
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Set active
          </Button>
        ) : null}

        {props.canSetInactive ? (
          <Button
            variant="outline"
            size="sm"
            disabled={props.isBusy}
            onClick={props.onSetInactive}
          >
            <Ban className="h-4 w-4 text-amber-500" />
            Set inactive
          </Button>
        ) : null}

        {props.canDelete ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={props.isBusy}
            onClick={props.onDelete}
          >
            {props.isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Clear selection"
          onClick={props.onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
