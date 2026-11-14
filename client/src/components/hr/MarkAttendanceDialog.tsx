import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonInline } from "@/components/common/PersonInline";
import { markAttendanceSchema } from "@/validators/hr.schema";
import type { MarkAttendanceFormValues } from "@/validators/hr.schema";
import { useMarkAttendance } from "@/hooks/useAttendance";
import { useEmployees } from "@/hooks/useEmployees";
import { toDateInputValue, toTimeInputValue } from "@/lib/date";
import type { Attendance } from "@/types/hr.types";

// The form the HR uses to fix one day by hand.
//
// It is used in two ways:
// - attendance is null  -> we are making a new row, and the user chooses
//                          the employee and the date,
// - attendance is given -> we are changing that row, so the employee and
//                          the date are fixed and cannot be changed.
//
// The server saves both cases with the same route, because there can only
// ever be one row for one employee on one day.
export function MarkAttendanceDialog(props: {
  isOpen: boolean;
  attendance: Attendance | null;
  // The employee already chosen for a new row, used when the dialog is
  // opened from a table line that has no attendance yet. Empty means the
  // user picks the employee in the form.
  employeeId?: string;
  // The day the page is showing, used as the first value for a new row.
  date: string;
  onClose: () => void;
}) {
  const markAttendance = useMarkAttendance();
  const employeesQuery = useEmployees();

  const employees = (employeesQuery.data || []).filter(
    (employee) => employee.status === "active"
  );

  const isEditing = props.attendance !== null;

  const form = useForm<MarkAttendanceFormValues>({
    resolver: zodResolver(markAttendanceSchema),
    defaultValues: {
      employee: "",
      date: props.date,
      status: "present",
      checkIn: "",
      checkOut: "",
      remarks: "",
    },
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.attendance) {
      form.reset({
        employee: props.employeeId || "",
        date: props.date,
        status: "present",
        checkIn: "",
        checkOut: "",
        remarks: "",
      });
      return;
    }

    // On this list the employee is populated, so it is an object.
    const employeeId =
      typeof props.attendance.employee === "string"
        ? props.attendance.employee
        : props.attendance.employee._id;

    form.reset({
      employee: employeeId,
      date: toDateInputValue(props.attendance.date),
      status: props.attendance.status,
      checkIn: toTimeInputValue(props.attendance.checkIn),
      checkOut: toTimeInputValue(props.attendance.checkOut),
      remarks: props.attendance.remarks,
    });
  }, [props.isOpen, props.attendance, props.employeeId, props.date, form]);

  function onSubmit(values: MarkAttendanceFormValues) {
    markAttendance.mutate(values, { onSuccess: () => props.onClose() });
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit attendance" : "Mark attendance"}
          </DialogTitle>
          <DialogDescription>
            Use this when a day was forgotten or when somebody did not come.
            The hours are counted from the two times you write here.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Employee</Label>
            <Select
              value={form.watch("employee")}
              onValueChange={(value) =>
                form.setValue("employee", value, { shouldValidate: true })
              }
              // While editing, the row already belongs to one employee and
              // one day, so changing the person here would make a different
              // row instead of fixing this one.
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee._id} value={employee._id}>
                    <PersonInline
                      name={employee.name}
                      photo={employee.photo}
                      note={employee.designation || undefined}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employee ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.employee.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attendance-date">Date</Label>
            <Input
              id="attendance-date"
              type="date"
              disabled={isEditing}
              {...form.register("date")}
            />
            {form.formState.errors.date ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.date.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) =>
                form.setValue(
                  "status",
                  value as MarkAttendanceFormValues["status"]
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="half_day">Half day</SelectItem>
                <SelectItem value="on_leave">On leave</SelectItem>
                <SelectItem value="holiday">Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="attendance-in">Check in (optional)</Label>
              <Input
                id="attendance-in"
                type="time"
                {...form.register("checkIn")}
              />
              {form.formState.errors.checkIn ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.checkIn.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="attendance-out">Check out (optional)</Label>
              <Input
                id="attendance-out"
                type="time"
                {...form.register("checkOut")}
              />
              {form.formState.errors.checkOut ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.checkOut.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="attendance-remarks">Remarks (optional)</Label>
            <Textarea
              id="attendance-remarks"
              rows={2}
              placeholder="Came late, was sick, ..."
              {...form.register("remarks")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={markAttendance.isPending}>
              {markAttendance.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save attendance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
