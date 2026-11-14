import { Link } from "react-router-dom";
import { ListChecks, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";
import { formatDay } from "@/lib/date";
import type { Employee } from "@/types/employee.types";

// How many recent joiners we show. Four fits the two by two grid of the
// design without pushing the card too tall.
const MAX_PEOPLE = 4;

// How many days count as "recently joined". Someone who started in the last
// two months is still being onboarded.
const RECENT_DAYS = 60;

const DAY_MS = 24 * 60 * 60 * 1000;

// The ten profile fields we treat as an onboarding checklist. When a field
// is filled the step is done, so "7 / 10" means seven of these are set.
//
// This is a real number read from the person's own record, not a guess: it
// tells the organization how far each new hire is from a complete profile.
function completedSteps(employee: Employee) {
  const filled = [
    employee.photo,
    employee.phone,
    employee.designation,
    employee.address,
    employee.gender,
    employee.dateOfBirth,
    employee.joiningDate,
    employee.employmentType,
    employee.department?.name,
  ].filter((value) => value !== "" && value !== null && value !== undefined);

  return filled.length;
}

// Keeps the people who joined recently, newest first.
function recentJoiners(employees: Employee[]) {
  const now = Date.now();

  return employees
    .filter((employee) => {
      if (!employee.joiningDate) {
        return false;
      }

      const joined = new Date(employee.joiningDate).getTime();
      const daysSince = (now - joined) / DAY_MS;

      // Skip anyone who joined in the future (a typo) or long ago.
      return daysSince >= 0 && daysSince <= RECENT_DAYS;
    })
    .sort((a, b) => (b.joiningDate || "").localeCompare(a.joiningDate || ""))
    .slice(0, MAX_PEOPLE);
}

// The people who joined in the last two months, shown as onboarding cards
// with a small progress bar for how complete their profile is.
export function OnboardingList(props: {
  employees: Employee[];
  isLoading: boolean;
}) {
  const people = recentJoiners(props.employees);

  return (
    <Card className="gap-4 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Onboarding</h2>

        <Link
          to="/organization/employees"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {props.isLoading ? (
        <LoadingCards />
      ) : people.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No new joiners in the last two months.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {people.map((employee) => (
            <PersonCard key={employee._id} employee={employee} />
          ))}
        </div>
      )}
    </Card>
  );
}

// One new joiner: their picture, name, role and a progress bar.
function PersonCard(props: { employee: Employee }) {
  // The profile page is a section the SaaS owner can switch off, and then
  // the card is still drawn but it does not lead anywhere: a link that
  // bounces you back to your dashboard is worse than a card that sits still.
  const { hasFeature } = useAuth();
  const canOpenProfile = hasFeature(FEATURES.EMPLOYEES_PROFILE);

  const done = completedSteps(props.employee);
  const total = 9;
  const percent = (done / total) * 100;

  return (
    <Link
      to={
        canOpenProfile
          ? "/organization/employees/" + props.employee._id
          : "/organization/employees"
      }
      className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors hover:bg-accent/50"
    >
      <Avatar
        name={props.employee.name}
        photo={props.employee.photo}
        size="lg"
      />

      <div className="min-w-0">
        <p className="truncate font-semibold">{props.employee.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {props.employee.designation || props.employee.department.name}
        </p>
      </div>

      {/* The progress bar of how complete the profile is. */}
      <div className="mt-1 w-full">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: percent + "%" }}
          />
        </div>

        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          {done + " / " + total + " profile done"}
        </span>
      </div>

      {props.employee.joiningDate ? (
        <span className="text-[11px] text-muted-foreground">
          Joined {formatDay(props.employee.joiningDate)}
        </span>
      ) : null}
    </Link>
  );
}

// The grey placeholder cards shown while the employees are loading.
function LoadingCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-xl bg-muted/50" />
      ))}
    </div>
  );
}
