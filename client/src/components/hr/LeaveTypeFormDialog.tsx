import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarCog } from "lucide-react";
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
import { leaveTypeSchema } from "@/validators/hr.schema";
import type { LeaveTypeFormValues } from "@/validators/hr.schema";
import { useCreateLeaveType, useUpdateLeaveType } from "@/hooks/useLeaves";
import {
  ALL_LEAVE_FILE_KINDS,
  LEAVE_FILE_KINDS,
  MAX_LEAVE_FILE_SIZE_MB,
  MAX_LEAVE_FILE_COUNT,
} from "@/lib/leaveDocuments";
import type { LeaveType } from "@/types/hr.types";

const emptyForm: LeaveTypeFormValues = {
  name: "",
  daysPerYear: "",
  isPaid: true,
  // Most leave types give the public holidays back, so that is the answer a
  // new type starts with.
  excludeHolidays: true,
  // Most leave types ask for no paper at all, so the whole document block
  // starts closed. The three settings under it are only the friendly answers
  // waiting there for the day somebody turns the switch on.
  allowDocuments: false,
  documentRequirement: "optional",
  allowedFileKinds: ["image", "pdf"],
  maxFileSizeMb: "5",
  maxFiles: "3",
  description: "",
  status: "active",
};

// One dialog for both jobs:
// - leaveType is null  -> we are adding a new leave type
// - leaveType is given -> we are editing that leave type
export function LeaveTypeFormDialog(props: {
  isOpen: boolean;
  leaveType: LeaveType | null;
  onClose: () => void;
}) {
  const createLeaveType = useCreateLeaveType();
  const updateLeaveType = useUpdateLeaveType();

  const form = useForm<LeaveTypeFormValues>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.leaveType) {
      form.reset(emptyForm);
      return;
    }

    form.reset({
      name: props.leaveType.name,
      // The input wants a text, and the server sends a number.
      daysPerYear: String(props.leaveType.daysPerYear),
      isPaid: props.leaveType.isPaid,
      excludeHolidays: props.leaveType.excludeHolidays,
      allowDocuments: props.leaveType.allowDocuments,
      documentRequirement: props.leaveType.documentRequirement,
      allowedFileKinds: props.leaveType.allowedFileKinds,
      // The inputs want text, and the server sends numbers.
      maxFileSizeMb: String(props.leaveType.maxFileSizeMb),
      maxFiles: String(props.leaveType.maxFiles),
      description: props.leaveType.description,
      status: props.leaveType.status,
    });
  }, [props.isOpen, props.leaveType, form]);

  // What the document block shows right now.
  const allowDocuments = form.watch("allowDocuments");
  const chosenKinds = form.watch("allowedFileKinds");

  // Tick or untick one kind of file.
  function toggleKind(kind: string) {
    form.setValue(
      "allowedFileKinds",
      chosenKinds.includes(kind)
        ? chosenKinds.filter((item) => item !== kind)
        : chosenKinds.concat(kind),
      { shouldValidate: true }
    );
  }

  function onSubmit(values: LeaveTypeFormValues) {
    // The form gives us the text "12", the server wants the number 12.
    const valuesToSend = {
      ...values,
      daysPerYear: Number(values.daysPerYear),
      maxFileSizeMb: Number(values.maxFileSizeMb),
      maxFiles: Number(values.maxFiles),
    };

    if (props.leaveType) {
      updateLeaveType.mutate(
        { id: props.leaveType._id, values: valuesToSend },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createLeaveType.mutate(valuesToSend, { onSuccess: () => props.onClose() });
    }
  }

  const isSaving = createLeaveType.isPending || updateLeaveType.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarCog className="h-5 w-5" />
          </div>

          <DialogTitle className="mt-2">
            {props.leaveType ? "Edit leave type" : "Add leave type"}
          </DialogTitle>
          <DialogDescription>
            Every employee gets these days for one year. Changing the number
            later does not take days away from somebody who is already using
            them, it only counts for the years that come after.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="leave-type-name">Name</Label>
            <Input
              id="leave-type-name"
              placeholder="Casual Leave"
              {...form.register("name")}
            />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="leave-type-days">Days per year</Label>
            <Input
              id="leave-type-days"
              type="number"
              min={0}
              {...form.register("daysPerYear")}
            />
            {form.formState.errors.daysPerYear ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.daysPerYear.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="leave-type-paid"
              type="checkbox"
              className="mt-1 h-4 w-4"
              {...form.register("isPaid")}
            />
            <div>
              <Label htmlFor="leave-type-paid">Paid leave</Label>
              <p className="text-xs text-muted-foreground">
                A paid leave does not cut the salary of the employee.
              </p>
            </div>
          </div>

          {/* The switch that decides how a public holiday inside a leave of
              this type is counted. The sentence under it changes with the
              answer, so the organization reads what it is really choosing
              instead of having to work it out from the title. */}
          <div className="flex items-start gap-2">
            <input
              id="leave-type-exclude-holidays"
              type="checkbox"
              className="mt-1 h-4 w-4"
              {...form.register("excludeHolidays")}
            />
            <div>
              <Label htmlFor="leave-type-exclude-holidays">
                Exclude holidays
              </Label>
              <p className="text-xs text-muted-foreground">
                {form.watch("excludeHolidays")
                  ? "A public holiday inside the leave is given back: it is not counted as a leave day."
                  : "A public holiday inside the leave is counted as a normal leave day."}
              </p>
            </div>
          </div>

          {/* The supporting papers. The switch is always there, and the four
              settings under it only appear once it is on, so a leave type
              that asks for nothing stays a short form. */}
          <div className="flex flex-col gap-3 rounded-xl border p-4">
            <div className="flex items-start gap-2">
              <input
                id="leave-type-allow-documents"
                type="checkbox"
                className="mt-1 h-4 w-4"
                {...form.register("allowDocuments")}
              />
              <div>
                <Label htmlFor="leave-type-allow-documents">
                  Allow document attachment
                </Label>
                <p className="text-xs text-muted-foreground">
                  {allowDocuments
                    ? "The employee sees an upload field in the apply form for this leave type."
                    : "No upload field is shown, and no document can be sent for this leave type."}
                </p>
              </div>
            </div>

            {allowDocuments ? (
              <div className="flex flex-col gap-4 border-t pt-3">
                <div className="flex flex-col gap-2">
                  <Label>Is a document needed?</Label>
                  <Select
                    value={form.watch("documentRequirement")}
                    onValueChange={(value) =>
                      form.setValue(
                        "documentRequirement",
                        value as "optional" | "required"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="optional">Optional</SelectItem>
                      <SelectItem value="required">Required</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {form.watch("documentRequirement") === "required"
                      ? "The employee cannot send the request without at least one document."
                      : "The employee may send the request with or without a document."}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Which files are accepted</Label>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {ALL_LEAVE_FILE_KINDS.map((kind) => (
                      <label
                        key={kind}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={chosenKinds.includes(kind)}
                          onChange={() => toggleKind(kind)}
                        />
                        {LEAVE_FILE_KINDS[kind].label}
                      </label>
                    ))}
                  </div>

                  {form.formState.errors.allowedFileKinds ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.allowedFileKinds.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="leave-type-max-size">
                      Biggest file (MB)
                    </Label>
                    <Input
                      id="leave-type-max-size"
                      type="number"
                      min={1}
                      max={MAX_LEAVE_FILE_SIZE_MB}
                      {...form.register("maxFileSizeMb")}
                    />
                    {form.formState.errors.maxFileSizeMb ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.maxFileSizeMb.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="leave-type-max-files">
                      How many documents
                    </Label>
                    <Input
                      id="leave-type-max-files"
                      type="number"
                      min={1}
                      max={MAX_LEAVE_FILE_COUNT}
                      {...form.register("maxFiles")}
                    />
                    {form.formState.errors.maxFiles ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.maxFiles.message}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="leave-type-description">
              Description (optional)
            </Label>
            <Textarea
              id="leave-type-description"
              rows={2}
              {...form.register("description")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              value={form.watch("status")}
              onValueChange={(value) =>
                form.setValue("status", value as "active" | "inactive")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              An inactive leave type is hidden from the apply form.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.leaveType ? "Save changes" : "Add leave type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
