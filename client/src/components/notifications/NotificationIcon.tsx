import {
  Bell,
  ListChecks,
  CalendarDays,
  UserPlus,
  Building2,
  Users,
  ShieldCheck,
  Banknote,
  CalendarOff,
  Tags,
  Plane,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// One picture per module, so a bell full of different news can be read
// without reading. The key is the module name the server writes on the
// notification, and anything unknown falls back to the bell itself.
//
// This table lives here, and not inside the bell, because two screens draw
// the very same line now: the little menu of the topbar and the full
// "All notifications" page. One table, one look.
const MODULE_ICONS: Record<string, typeof Bell> = {
  tasks: ListChecks,
  meetings: CalendarDays,
  employees: UserPlus,
  departments: Building2,
  teams: Users,
  roles: ShieldCheck,
  cheques: Banknote,
  holidays: CalendarOff,
  "leave-types": Tags,
  leaves: Plane,
  salaries: Wallet,
};

export function NotificationIcon(props: { module: string; className?: string }) {
  const Icon = MODULE_ICONS[props.module] || Bell;

  return (
    <span
      className={cn(
        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
        props.className
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
