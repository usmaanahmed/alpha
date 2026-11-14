import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarPlus, Info, Send } from "lucide-react";
import { toast } from "sonner";
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
import { leaveApplySchema } from "@/validators/hr.schema";
import type { LeaveApplyFormValues } from "@/validators/hr.schema";
import { LeaveDocumentPicker } from "@/components/hr/LeaveDocumentPicker";
import {
  useActiveLeaveTypes,
  useCreateLeaveRequest,
  useMyLeaveBalance,
} from "@/hooks/useLeaves";
import { checkLeaveDocuments } from "@/lib/leaveDocuments";

const emptyForm: LeaveApplyFormValues = {
  leaveType: "",
  fromDate: "",
  toDate: "",
  reason: "",
};

const THIS_YEAR = new Date().getFullYear();

// The form the employee fills to ask for some days off.
//
// We do not count the working days here. The server counts them, because
// only the server knows the holidays of the organization, and a number
// counted in the browser could be changed by anybody. The small box at the
// bottom only says how many days the person picked on the calendar, and
// says clearly that the real number can be smaller.
export function LeaveApplyDialog(props: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const leaveTypesQuery = useActiveLeaveTypes();
  const balanceQuery = useMyLeaveBalance(THIS_YEAR);
  const createLeaveRequest = useCreateLeaveRequest();

  const leaveTypes = leaveTypesQuery.data;

  // The papers the employee chose. They are files and not something a person
  // types, so they live here and not inside the form.
  const [documents, setDocuments] = useState<File[]>([]);

  const form = useForm<LeaveApplyFormValues>({
    resolver: zodResolver(leaveApplySchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (props.isOpen) {
      form.reset(emptyForm);
      setDocuments([]);
    }
  }, [props.isOpen, form]);

  // What the person has chosen right now, so the box under the dates can
  // answer while they are still filling the form.
  const chosenType = form.watch("leaveType");
  const fromDate = form.watch("fromDate");
  const toDate = form.watch("toDate");

  const chosenBalance = (balanceQuery.data || []).find(
    (balance) => balance.leaveType._id === chosenType
  );

  // The chosen type itself, so the box under the dates can say how the public
  // holidays are counted for it. Every type answers that differently now.
  const chosenLeaveType = leaveTypes.find(
    (leaveType) => leaveType._id === chosenType
  );

  // How many days the two dates cover, both ends counted.
  // 86400000 is the number of milliseconds in one day.
  let pickedDays = 0;

  if (fromDate !== "" && toDate !== "" && toDate >= fromDate) {
    const milliseconds =
      new Date(toDate).getTime() - new Date(fromDate).getTime();
    pickedDays = Math.round(milliseconds / 86400000) + 1;
  }

  function onSubmit(values: LeaveApplyFormValues) {
    // A type that takes no document never sends one, even if something was
    // chosen before the employee changed their mind about the type.
    const filesToSend = chosenLeaveType?.allowDocuments ? documents : [];

    if (chosenLeaveType?.allowDocuments) {
      if (
        chosenLeaveType.documentRequirement === "required" &&
        filesToSend.length === 0
      ) {
        toast.error("This leave type needs at least one supporting document");
        return;
      }

      const documentProblem = checkLeaveDocuments(chosenLeaveType, filesToSend);

      if (documentProblem) {
        toast.error(documentProblem);
        return;
      }
    }

    createLeaveRequest.mutate(
      { ...values, documents: filesToSend },
      { onSuccess: () => props.onClose() }
    );
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarPlus className="h-5 w-5" />
          </div>

          <DialogTitle className="mt-2">Apply for leave</DialogTitle>
          <DialogDescription>
            The weekends are not counted, and most leave types give the
            holidays of your organization back too, so only your real working
            days are taken from your balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Leave type</Label>
            <Select
              value={form.watch("leaveType")}
              onValueChange={(value) =>
                form.setValue("leaveType", value, { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((leaveType) => (
                  <SelectItem key={leaveType._id} value={leaveType._id}>
                    {leaveType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {chosenBalance ? (
              <p className="text-xs text-muted-foreground">
                {"You have " +
                  chosenBalance.remaining +
                  " of " +
                  chosenBalance.allocated +
                  " days left for this type."}
              </p>
            ) : null}

            {leaveTypes.length === 0 && !leaveTypesQuery.isLoading ? (
              <p className="text-xs text-muted-foreground">
                No leave type is available. Your HR must add one first.
              </p>
            ) : null}
            {form.formState.errors.leaveType ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.leaveType.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-from">First day</Label>
              <Input id="leave-from" type="date" {...form.register("fromDate")} />
              {form.formState.errors.fromDate ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.fromDate.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-to">Last day</Label>
              <Input id="leave-to" type="date" {...form.register("toDate")} />
              {form.formState.errors.toDate ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.toDate.message}
                </p>
              ) : null}
            </div>
          </div>

          {pickedDays > 0 ? (
            <div className="flex items-start gap-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <p>
                <span className="font-medium">
                  {pickedDays + (pickedDays === 1 ? " day" : " days")}
                </span>
                {" picked on the calendar. The weekends inside them are removed, "}
                {/* Each leave type answers this differently now, so the box
                    says what THIS type does instead of one rule for all. */}
                {chosenLeaveType && !chosenLeaveType.excludeHolidays
                  ? "and the public holidays are counted as normal leave days."
                  : "and so are the public holidays, so your balance can go down by less."}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="leave-reason">Reason</Label>
            <Textarea
              id="leave-reason"
              rows={3}
              placeholder="Why do you need these days?"
              {...form.register("reason")}
            />
            {form.formState.errors.reason ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.reason.message}
              </p>
            ) : null}
          </div>

          {/* The upload field only exists for a leave type that asks for a
              paper. For every other type it is not hidden, it is simply not
              drawn at all, so the form stays as short as it always was. */}
          {chosenLeaveType?.allowDocuments ? (
            <LeaveDocumentPicker
              leaveType={chosenLeaveType}
              files={documents}
              onChange={setDocuments}
              disabled={createLeaveRequest.isPending}
            />
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLeaveRequest.isPending}>
              {createLeaveRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
