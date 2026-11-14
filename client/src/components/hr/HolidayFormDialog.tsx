import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { holidaySchema } from "@/validators/hr.schema";
import type { HolidayFormValues } from "@/validators/hr.schema";
import { useCreateHoliday, useUpdateHoliday } from "@/hooks/useHolidays";
import { toDateInputValue } from "@/lib/date";
import type { Holiday } from "@/types/hr.types";

const emptyForm: HolidayFormValues = {
  name: "",
  date: "",
  isOptional: false,
  description: "",
};

// One dialog for both jobs:
// - holiday is null  -> we are adding a new holiday
// - holiday is given -> we are editing that holiday
export function HolidayFormDialog(props: {
  isOpen: boolean;
  holiday: Holiday | null;
  onClose: () => void;
}) {
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();

  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.holiday) {
      form.reset(emptyForm);
      return;
    }

    form.reset({
      name: props.holiday.name,
      date: toDateInputValue(props.holiday.date),
      isOptional: props.holiday.isOptional,
      description: props.holiday.description,
    });
  }, [props.isOpen, props.holiday, form]);

  function onSubmit(values: HolidayFormValues) {
    if (props.holiday) {
      updateHoliday.mutate(
        { id: props.holiday._id, values: values },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createHoliday.mutate(values, { onSuccess: () => props.onClose() });
    }
  }

  const isSaving = createHoliday.isPending || updateHoliday.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {props.holiday ? "Edit holiday" : "Add holiday"}
          </DialogTitle>
          <DialogDescription>
            A holiday inside a leave is not counted as a leave day, so the
            employee does not lose a day of its balance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="holiday-name">Holiday name</Label>
            <Input id="holiday-name" placeholder="Eid" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="holiday-date">Date</Label>
            <Input id="holiday-date" type="date" {...form.register("date")} />
            {form.formState.errors.date ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.date.message}
              </p>
            ) : null}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="holiday-optional"
              type="checkbox"
              className="mt-1 h-4 w-4"
              {...form.register("isOptional")}
            />
            <div>
              <Label htmlFor="holiday-optional">Optional holiday</Label>
              <p className="text-xs text-muted-foreground">
                An optional holiday is a day the employee may take but does
                not have to, so it still counts as a leave day.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="holiday-description">Description (optional)</Label>
            <Textarea
              id="holiday-description"
              rows={2}
              {...form.register("description")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.holiday ? "Save changes" : "Add holiday"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
