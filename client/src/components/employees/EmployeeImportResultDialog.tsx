import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { EmployeeImportResult } from '@/api/employee.api'

// Shows what happened after an Excel import: how many employees were added,
// how many new departments were created, and which rows were skipped and why.
export function EmployeeImportResultDialog(props: {
  result: EmployeeImportResult | null
  onClose: () => void
}) {
  const result = props.result

  return (
    <Dialog open={result !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import finished</DialogTitle>
          <DialogDescription>
            {result ? result.createdCount : 0} employee(s) added
            {result && result.createdDepartmentCount > 0
              ? ', ' + result.createdDepartmentCount + ' new department(s) created'
              : ''}
            .
          </DialogDescription>
        </DialogHeader>

        {result && result.errors.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {result.errors.length} row(s) were skipped:
            </p>
            <ul className="max-h-60 overflow-y-auto rounded-md border p-3 text-sm">
              {result.errors.map((error) => (
                <li key={error.row} className="py-0.5">
                  <span className="font-medium">Row {error.row}:</span>{' '}
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
