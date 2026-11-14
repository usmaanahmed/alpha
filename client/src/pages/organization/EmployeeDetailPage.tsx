import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Cake,
  User,
  Globe,
  AtSign,
  Link as LinkIcon,
  LogOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { EmployeeLeaveDonuts } from "@/components/employees/EmployeeLeaveDonuts";
import { EmployeeAttendanceCalendar } from "@/components/employees/EmployeeAttendanceCalendar";
import {
  EmployeePerformanceCard,
  EmployeeHoursCard,
  EmployeeDocumentsCard,
  EmployeeNotesCard,
  EmployeePayrollCard,
} from "@/components/employees/EmployeeDemoPanels";
import {
  useEmployee,
  useEmployeeAttendance,
  useEmployeeLeaveBalance,
} from "@/hooks/useEmployees";
import { useAuth } from "@/context/AuthContext";
import { getModuleBase } from "@/types/auth.types";
import { getPhotoUrl, getInitials } from "@/lib/photo";
import { formatDay } from "@/lib/date";

// The four employment types written the way a person reads them.
const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "Full-Time",
  part_time: "Part-Time",
  intern: "Intern",
  contract: "Contract",
};

// The detail page of one employee, built to match the dashboard snapshot: a
// profile rail on the left, the rich cards in the middle, and the calendar
// and payroll on the right.
//
// Some cards (performance, hours, documents, payroll, notes) show demo data,
// because the database does not keep those yet — see EmployeeDemoPanels.
export function EmployeeDetailPage() {
  // The id sits in the url, for example /organization/employees/6650f1...
  const params = useParams();
  const employeeId = params.id || "";

  const now = new Date();
  const year = now.getFullYear();

  // The month shown by the attendance calendar. 1 is January.
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(now.getFullYear());

  const employeeQuery = useEmployee(employeeId);
  const balanceQuery = useEmployeeLeaveBalance({ id: employeeId, year: year });
  const attendanceQuery = useEmployeeAttendance({
    id: employeeId,
    year: attendanceYear,
    month: month,
  });

  const attendanceDays = attendanceQuery.data || [];

  // Going back from January must land on December of the year before, and
  // going forward from December on January of the year after.
  function goToPreviousMonth() {
    if (month === 1) {
      setMonth(12);
      setAttendanceYear(attendanceYear - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setMonth(1);
      setAttendanceYear(attendanceYear + 1);
    } else {
      setMonth(month + 1);
    }
  }

  // We cannot see a month that has not happened yet.
  const isThisMonth =
    attendanceYear === now.getFullYear() && month === now.getMonth() + 1;

  // While the employee itself is loading we show the big spinner.
  if (employeeQuery.isLoading) {
    return <FullPageLoader />;
  }

  // The id was wrong, or the employee belongs to another organization.
  if (!employeeQuery.data) {
    return (
      <div>
        <PageTop />
        <Card className="mt-6 items-center gap-2 border-dashed py-16 text-center">
          <p className="font-medium">Employee not found</p>
          <p className="text-sm text-muted-foreground">
            This employee does not exist, or was removed.
          </p>
        </Card>
      </div>
    );
  }

  const employee = employeeQuery.data;

  // A short staff code built from the id, so the profile has one like the
  // snapshot. The real id is long, so we take its last four letters.
  const employeeCode = "EMP-" + employee._id.slice(-4).toUpperCase();

  return (
    <div>
      <PageTop name={employee.name} />

      {/* The page is a 12-column grid on wide screens: 3 for the left rail,
          6 for the middle, 3 for the right rail. Everything stacks on a
          small screen. */}
      <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* --- LEFT RAIL: the profile and the personal info. --- */}
        <div className="flex flex-col gap-5 xl:col-span-3">
          <Card className="items-center gap-0 p-6 text-center">
            <SquareAvatar name={employee.name} photo={employee.photo} />

            <h1 className="mt-4 text-xl font-semibold">{employee.name}</h1>

            <p className="text-sm text-muted-foreground">
              {employee.designation || "—"}
              {employee.department?.name
                ? " · " + employee.department.name
                : ""}
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary">{employeeCode}</Badge>
              <Badge
                variant={employee.status === "active" ? "default" : "secondary"}
              >
                {employee.status}
              </Badge>
            </div>

            {/* The soft box of the main employment facts. */}
            <div className="mt-6 w-full divide-y divide-border rounded-xl bg-muted/40 text-left text-sm">
              <FactRow
                label="Employment Type"
                value={EMPLOYMENT_TYPE_LABEL[employee.employmentType]}
              />
              {/* Work model is not kept in the database yet, so it is a fixed
                  demo value for now. */}
              <FactRow label="Work Model" value="Hybrid" />
              <FactRow
                label="Join Date"
                value={formatDay(employee.joiningDate)}
              />
            </div>

            {/* The social links. They are not stored yet either, so they are
                shown as plain, non-clicking icons to match the snapshot. */}
            <div className="mt-5 flex w-full items-center gap-3">
              <span className="text-xs text-muted-foreground">Social Media:</span>
              <div className="flex gap-2">
                <SocialIcon icon={Globe} />
                <SocialIcon icon={AtSign} />
                <SocialIcon icon={LinkIcon} />
              </div>
            </div>

            {/* An employee who has left keeps a small red note. */}
            {employee.exitDate ? (
              <div className="mt-5 flex w-full items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-left text-sm">
                <LogOut className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    Left on {formatDay(employee.exitDate)}
                  </p>
                  {employee.exitReason ? (
                    <p className="text-xs text-muted-foreground">
                      {employee.exitReason}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </Card>

          {/* The personal info card: one icon row per field. */}
          <Card className="gap-0 p-6">
            <p className="mb-4 font-semibold">Personal info</p>
            <div className="flex flex-col gap-4">
              <IconRow
                icon={User}
                label="Gender"
                value={
                  employee.gender
                    ? employee.gender.charAt(0).toUpperCase() +
                      employee.gender.slice(1)
                    : ""
                }
              />
              <IconRow
                icon={Cake}
                label="Date of Birth"
                value={formatDay(employee.dateOfBirth)}
              />
              <IconRow icon={Mail} label="Email Address" value={employee.email} />
              <IconRow icon={Phone} label="Phone" value={employee.phone} />
              <IconRow icon={MapPin} label="Address" value={employee.address} />
            </div>
          </Card>
        </div>

        {/* --- MIDDLE: the numbers and the charts. --- */}
        <div className="flex flex-col gap-5 xl:col-span-6">
          <EmployeeLeaveDonuts
            data={balanceQuery.data || []}
            isLoading={balanceQuery.isLoading}
          />

          <EmployeePerformanceCard />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <EmployeeHoursCard />
            <EmployeeDocumentsCard />
          </div>

          <EmployeeNotesCard />
        </div>

        {/* --- RIGHT RAIL: the calendar and the payroll. --- */}
        <div className="flex flex-col gap-5 xl:col-span-3">
          <EmployeeAttendanceCalendar
            data={attendanceDays}
            year={attendanceYear}
            month={month}
            isLoading={attendanceQuery.isLoading}
            onPrevious={goToPreviousMonth}
            onNext={goToNextMonth}
            canGoNext={!isThisMonth}
          />

          <EmployeePayrollCard />
        </div>
      </div>
    </div>
  );
}

// The top of the page: the back arrow, the title and a small breadcrumb.
//
// The organization account and an employee with "employees.view" both open
// this page, under a different address, so the two links back to the list are
// built from the account instead of being written by hand.
function PageTop(props: { name?: string }) {
  const { user } = useAuth();
  const employeesPath = getModuleBase(user?.role) + "/employees";

  return (
    <div className="flex items-center gap-3">
      <Link
        to={employeesPath}
        className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
        title="Back to employees"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      <div>
        <h1 className="text-xl font-semibold leading-tight">Employee Details</h1>
        <p className="text-sm text-muted-foreground">
          <Link
            to={employeesPath}
            className="transition-colors hover:text-foreground"
          >
            Employees
          </Link>
          {props.name ? " / " + props.name : ""}
        </p>
      </div>
    </div>
  );
}

// The big rounded-square picture at the top of the profile card. It is its
// own little component (not the round Avatar) because the snapshot uses a
// square, and only this page needs it.
function SquareAvatar(props: { name: string; photo: string }) {
  const photoUrl = getPhotoUrl(props.photo);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={props.name}
        className="h-28 w-28 rounded-2xl border object-cover"
      />
    );
  }

  return (
    <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-semibold text-primary">
      {getInitials(props.name)}
    </span>
  );
}

// One "label / value" line of the facts box. The value sits on the right,
// the way the snapshot lays it out.
function FactRow(props: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="font-medium">{props.value || "-"}</span>
    </div>
  );
}

// One icon row of the personal info card: a small square icon, the label and
// the value under it. An empty value shows a dash so the row keeps its shape.
function IconRow(props: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  const Icon = props.icon;

  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{props.label}</p>
        <p className="mt-0.5 break-words text-sm font-medium">
          {props.value || "-"}
        </p>
      </div>
    </div>
  );
}

// One social media icon, drawn as a soft square. It does not link anywhere
// yet, because the profile does not store social links.
function SocialIcon(props: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  const Icon = props.icon;

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
  );
}
