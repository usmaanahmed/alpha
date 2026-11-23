import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileSpreadsheet,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  EmployeeImportResult,
  EmployeeImportRowError,
} from '@/api/employee.api'

// One small number box of the summary at the top.
function SummaryTile(props: {
  icon: React.ReactNode
  label: string
  value: number
  className: string
}) {
  return (
    <div className={'flex items-center gap-3 rounded-lg border p-3 ' + props.className}>
      {props.icon}
      <div>
        <p className="text-xl font-semibold leading-none">{props.value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{props.label}</p>
      </div>
    </div>
  )
}

// Counts how many skipped rows have a problem in each column, for example
// Email: 27, Role: 3. It shows at a glance what to fix first.
function countProblemsByColumn(rowErrors: EmployeeImportRowError[]) {
  const counts: Record<string, number> = {}

  for (const rowError of rowErrors) {
    for (const problem of rowError.problems) {
      counts[problem.column] = (counts[problem.column] || 0) + 1
    }
  }

  // Turn the object into a list, the most common problem first.
  const list = Object.keys(counts).map((column) => ({
    column: column,
    count: counts[column],
  }))
  list.sort((a, b) => b.count - a.count)
  return list
}

// The columns of the sheet, in the same order as the template.
const SHEET_COLUMNS = [
  { header: 'Name', width: 'min-w-40' },
  { header: 'Email', width: 'min-w-48' },
  { header: 'Phone', width: 'min-w-32' },
  { header: 'Department', width: 'min-w-36' },
  { header: 'Role', width: 'min-w-28' },
  { header: 'Designation', width: 'min-w-40' },
  { header: 'Qualification', width: 'min-w-40' },
  { header: 'Employment Type', width: 'min-w-36' },
  { header: 'Joining Date', width: 'min-w-32' },
  { header: 'Date of Birth', width: 'min-w-32' },
  { header: 'Gender', width: 'min-w-24' },
  { header: 'Address', width: 'min-w-56' },
]

// The skipped rows drawn like a small Excel sheet: the row number on the
// left, one cell for every column, and the wrong cells painted red.
// The last column says in words what is wrong in that row.
function RowErrorGrid(props: { rowErrors: EmployeeImportRowError[] }) {
  return (
    <div className="max-h-[22rem] overflow-auto rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="w-12 border-b border-r bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">
              #
            </th>
            {SHEET_COLUMNS.map((column) => (
              <th
                key={column.header}
                className={
                  'border-b border-r bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground ' +
                  column.width
                }
              >
                {column.header}
              </th>
            ))}
            <th className="min-w-80 border-b bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              What is wrong
            </th>
          </tr>
        </thead>
        <tbody>
          {props.rowErrors.map((rowError) => (
            <tr key={rowError.row}>
              {/* The row number, like the grey gutter of Excel */}
              <td className="border-b border-r bg-red-500/10 px-2 py-2 text-center text-xs font-semibold text-red-600 dark:text-red-400">
                {rowError.row}
              </td>

              {SHEET_COLUMNS.map((column) => {
                const problem = rowError.problems.find(
                  (item) => item.column === column.header
                )
                const value = rowError.cells[column.header] || ''

                // A wrong cell is red. Hover it to read the reason.
                if (problem) {
                  return (
                    <td
                      key={column.header}
                      title={problem.message}
                      className="border-b border-r border-red-500/50 bg-red-500/15 px-3 py-2 text-red-600 dark:text-red-400"
                    >
                      {value || <span className="italic opacity-70">empty</span>}
                    </td>
                  )
                }

                return (
                  <td key={column.header} className="border-b border-r px-3 py-2">
                    {value}
                  </td>
                )
              })}

              {/* The reasons, one line for every wrong cell */}
              <td className="border-b px-3 py-2 align-top">
                <ul className="flex flex-col gap-1.5">
                  {rowError.problems.map((problem) => (
                    <li key={problem.column} className="flex gap-2 text-xs">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span>
                        <span className="font-semibold">{problem.column}:</span>{' '}
                        <span className="text-muted-foreground">{problem.message}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Shows what happened after an Excel import: the numbers, what to fix first,
// and for every skipped row which columns are wrong and which are fine.
export function EmployeeImportResultDialog(props: {
  result: EmployeeImportResult | null
  onClose: () => void
}) {
  const result = props.result
  const rowErrors = result ? result.rowErrors : []
  const problemsByColumn = countProblemsByColumn(rowErrors)

  return (
    <Dialog open={result !== null} onOpenChange={props.onClose}>
      {/* Narrow when everything was imported. It only becomes wide when the
          grid of skipped rows needs the room. */}
      <DialogContent className={rowErrors.length > 0 ? 'sm:max-w-6xl' : 'sm:max-w-xl'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            Import result
          </DialogTitle>
          <DialogDescription>
            {rowErrors.length > 0
              ? 'Some rows could not be imported. Fix them in your file and import again.'
              : 'Every row of your file was imported.'}
          </DialogDescription>
        </DialogHeader>

        {/* The numbers */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryTile
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            label="Rows in file"
            value={result ? result.totalRows : 0}
            className=""
          />
          <SummaryTile
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            label="Imported"
            value={result ? result.createdCount : 0}
            className="border-emerald-500/30 bg-emerald-500/5"
          />
          <SummaryTile
            icon={<XCircle className="h-5 w-5 text-red-500" />}
            label="Skipped"
            value={rowErrors.length}
            className={rowErrors.length > 0 ? 'border-red-500/30 bg-red-500/5' : ''}
          />
          <SummaryTile
            icon={<Building2 className="h-5 w-5 text-muted-foreground" />}
            label="New departments"
            value={result ? result.createdDepartmentCount : 0}
            className=""
          />
        </div>

        {rowErrors.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* What to fix first */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 p-3">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Problems by column:</span>
              {problemsByColumn.map((item) => (
                <span
                  key={item.column}
                  className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium ring-1 ring-border"
                >
                  {item.column} <span className="text-red-500">x {item.count}</span>
                </span>
              ))}
            </div>

            {/* The skipped rows, drawn like Excel */}
            <RowErrorGrid rowErrors={rowErrors} />
          </div>
        ) : null}

        <DialogFooter>
          <Button onClick={props.onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
