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
import {
  createEmployeeSchema,
  updateEmployeeSchema,
} from "@/validators/employee.schema";
import type { EmployeeFormValues } from "@/validators/employee.schema";
import { useCreateEmployee, useUpdateEmployee } from "@/hooks/useEmployees";
import { useActiveDepartments } from "@/hooks/useDepartments";
import { useActiveRoles } from "@/hooks/useRoles";
import { EmployeePhotoInput } from "./EmployeePhotoInput";
import { toDateInputValue } from "@/lib/date";
import type { Employee } from "@/types/employee.types";

// The empty form we start from when we add a new employee.
const emptyForm: EmployeeFormValues = {
  name: "",
  email: "",
  password: "",
  phone: "",
  departmentId: "",
  roleId: "",
  status: "active",
  designation: "",
  employmentType: "full_time",
  joiningDate: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  exitDate: "",
  exitReason: "",
  photo: null,
};

// One dialog for both jobs:
// - employee is null  -> we are adding a new employee
// - employee is given -> we are editing that employee
//
// When we add an employee we also ask a login password, because every
// employee gets a login account. When we edit, the password is not
// asked here, it has its own small dialog.
export function EmployeeFormDialog(props: {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
}) {
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();

  // The dropdowns are filled from the database: the departments of my
  // organization and the roles the SaaS owner made active.
  const departmentsQuery = useActiveDepartments();
  const rolesQuery = useActiveRoles();

  const departments = departmentsQuery.data || [];
  const roles = rolesQuery.data || [];

  const isEditing = props.employee !== null;

  const form = useForm<EmployeeFormValues>({
    // While editing we use the rules without the password.
    resolver: zodResolver(isEditing ? updateEmployeeSchema : createEmployeeSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    if (!props.employee) {
      // Adding a new employee, so start with an empty form.
      form.reset(emptyForm);
      return;
    }

    // Editing. The old department or the old role may be inactive now.
    // In that case we leave the dropdown empty so the user picks a new one.
    const oldDepartmentIsStillActive = departments.some(
      (department) => department._id === props.employee?.department._id
    );
    const oldRoleIsStillActive = roles.some(
      (role) => role._id === props.employee?.role._id
    );

    form.reset({
      name: props.employee.name,
      email: props.employee.email,
      password: "",
      phone: props.employee.phone,
      departmentId: oldDepartmentIsStillActive
        ? props.employee.department._id
        : "",
      roleId: oldRoleIsStillActive ? props.employee.role._id : "",
      status: props.employee.status,
      designation: props.employee.designation,
      employmentType: props.employee.employmentType,
      joiningDate: toDateInputValue(props.employee.joiningDate),
      dateOfBirth: toDateInputValue(props.employee.dateOfBirth),
      gender: props.employee.gender,
      address: props.employee.address,
      exitDate: toDateInputValue(props.employee.exitDate),
      exitReason: props.employee.exitReason,
      // The picture already on the server is not a File, so this stays null
      // and the old picture is only replaced when a new one is chosen.
      photo: null,
    });
  }, [props.isOpen, props.employee, departments, roles, form]);

  function onSubmit(values: EmployeeFormValues) {
    const shared = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      departmentId: values.departmentId,
      roleId: values.roleId,
      status: values.status,
      designation: values.designation,
      employmentType: values.employmentType,
      joiningDate: values.joiningDate,
      dateOfBirth: values.dateOfBirth,
      gender: values.gender,
      address: values.address,
      exitDate: values.exitDate,
      exitReason: values.exitReason,
      photo: values.photo,
    };

    if (props.employee) {
      // The password is not part of the edit request.
      updateEmployee.mutate(
        { id: props.employee._id, values: shared },
        { onSuccess: () => props.onClose() }
      );
    } else {
      createEmployee.mutate(
        { ...shared, password: values.password },
        { onSuccess: () => props.onClose() }
      );
    }
  }

  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      {/* The form is long now, so the dialog gets its own scrollbar. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {props.employee ? "Edit employee" : "Add employee"}
          </DialogTitle>
          <DialogDescription>
            Choose one department of your organization and one role. An
            employee with the role "Manager" can also give tasks to the other
            employees of the same department, and an employee with the role
            "HR" can manage the holidays, the leaves and the attendance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <EmployeePhotoInput
            currentPhoto={props.employee?.photo || ""}
            file={form.watch("photo") || null}
            onChange={(file) => form.setValue("photo", file)}
          />

          {/* --- Login and contact --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-name">Full name</Label>
              <Input
                id="employee-name"
                placeholder="John Doe"
                {...form.register("name")}
              />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                placeholder="john@company.com"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            {/* The password is asked only one time, when we add the employee. */}
            {!isEditing ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="employee-password">Login password</Label>
                <Input
                  id="employee-password"
                  type="text"
                  placeholder="At least 6 characters"
                  {...form.register("password")}
                />
                {form.formState.errors.password ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-phone">Phone (optional)</Label>
              <Input
                id="employee-phone"
                placeholder="01700000000"
                {...form.register("phone")}
              />
            </div>
          </div>

          {/* --- Where the employee works --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Department</Label>
              <Select
                value={form.watch("departmentId")}
                onValueChange={(value) =>
                  form.setValue("departmentId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department._id} value={department._id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departments.length === 0 && !departmentsQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  You have no active department yet. Create one first.
                </p>
              ) : null}
              {form.formState.errors.departmentId ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.departmentId.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Role</Label>
              <Select
                value={form.watch("roleId")}
                onValueChange={(value) =>
                  form.setValue("roleId", value, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role._id} value={role._id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {roles.length === 0 && !rolesQuery.isLoading ? (
                <p className="text-xs text-muted-foreground">
                  No role is available. The SaaS owner must add an active role.
                </p>
              ) : null}
              {form.formState.errors.roleId ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.roleId.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-designation">
                Designation (optional)
              </Label>
              <Input
                id="employee-designation"
                placeholder="Senior Developer"
                {...form.register("designation")}
              />
              <p className="text-xs text-muted-foreground">
                The job title. The role above decides what the person may do
                in the app, this is only text.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Employment type</Label>
              <Select
                value={form.watch("employmentType")}
                onValueChange={(value) =>
                  form.setValue(
                    "employmentType",
                    value as EmployeeFormValues["employmentType"]
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose the type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-joining">Joining date (optional)</Label>
              <Input
                id="employee-joining"
                type="date"
                {...form.register("joiningDate")}
              />
            </div>
          </div>

          {/* --- Personal --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="employee-birth">Date of birth (optional)</Label>
              <Input
                id="employee-birth"
                type="date"
                {...form.register("dateOfBirth")}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Gender (optional)</Label>
              <Select
                value={form.watch("gender") || "not_set"}
                onValueChange={(value) =>
                  form.setValue(
                    "gender",
                    value === "not_set"
                      ? ""
                      : (value as EmployeeFormValues["gender"])
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_set">Not set</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="employee-address">Address (optional)</Label>
            <Textarea
              id="employee-address"
              rows={2}
              placeholder="Street, city, country"
              {...form.register("address")}
            />
          </div>

          {/* --- Status and exit --- */}
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
          </div>

          {/* The exit fields only make sense once the person has left, so
              they appear only when the status is inactive. */}
          {form.watch("status") === "inactive" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="employee-exit-date">Exit date (optional)</Label>
                <Input
                  id="employee-exit-date"
                  type="date"
                  {...form.register("exitDate")}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="employee-exit-reason">
                  Exit reason (optional)
                </Label>
                <Input
                  id="employee-exit-reason"
                  placeholder="Resigned"
                  {...form.register("exitReason")}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={props.onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {props.employee ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
