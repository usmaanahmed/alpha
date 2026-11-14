import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FileClock,
  Network,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { getModuleBase } from "@/types/auth.types";
import { PERMISSIONS } from "@/lib/permissions";
import { toneClasses } from "./tileTones";
import type { Tone } from "./tileTones";

// One "add something" tile.
//
// "needs" holds every permission the tile asks for, and the person has to
// carry them ALL. There are two of them on most tiles, because opening the
// form takes two rights: the one that lets you walk onto the page, and the
// one that lets you create there. Asking for both is what keeps a tile from
// sending somebody to a page the route guard would bounce them off.
interface CreateItem {
  label: string;
  path: string;
  icon: LucideIcon;
  tone: Tone;
  needs: string[];
}

// The address carries "?new=1". Every page that can create something reads
// that with useOpenCreateFromUrl and opens its own form the moment it
// appears, so one tap here really does end on an empty form.
function buildCreateItems(base: string): CreateItem[] {
  return [
    {
      label: "New Task",
      path: base + "/tasks?new=1",
      icon: ClipboardList,
      tone: "indigo",
      needs: [PERMISSIONS.TASKS_VIEW_ALL, PERMISSIONS.TASKS_ASSIGN],
    },
    {
      label: "New Employee",
      path: base + "/employees?new=1",
      icon: UserPlus,
      tone: "indigo",
      needs: [PERMISSIONS.EMPLOYEES_VIEW, PERMISSIONS.EMPLOYEES_CREATE],
    },
    {
      label: "New Department",
      path: base + "/departments?new=1",
      icon: Network,
      tone: "indigo",
      needs: [PERMISSIONS.DEPARTMENTS_VIEW, PERMISSIONS.DEPARTMENTS_CREATE],
    },
    {
      label: "New Team",
      path: base + "/teams?new=1",
      icon: UsersRound,
      tone: "violet",
      needs: [PERMISSIONS.TEAMS_VIEW, PERMISSIONS.TEAMS_CREATE],
    },
    {
      label: "New Role",
      path: base + "/roles?new=1",
      icon: ShieldCheck,
      tone: "violet",
      needs: [PERMISSIONS.ROLES_VIEW, PERMISSIONS.ROLES_CREATE],
    },
    {
      label: "Schedule Meeting",
      path: base + "/meetings?new=1",
      icon: CalendarPlus,
      tone: "amber",
      // The meeting route opens for anybody who may schedule, so the create
      // permission on its own is enough here.
      needs: [PERMISSIONS.MEETINGS_CREATE],
    },
    {
      label: "New Cheque",
      path: base + "/cheques?new=1",
      icon: ReceiptText,
      tone: "emerald",
      needs: [PERMISSIONS.CHEQUES_VIEW, PERMISSIONS.CHEQUES_CREATE],
    },
    {
      label: "Mark Attendance",
      path: base + "/attendance?new=1",
      icon: CalendarCheck,
      tone: "rose",
      needs: [PERMISSIONS.ATTENDANCE_VIEW_ALL, PERMISSIONS.ATTENDANCE_EDIT],
    },
    {
      label: "New Leave Type",
      path: base + "/leave-types?new=1",
      icon: FileClock,
      tone: "rose",
      needs: [PERMISSIONS.LEAVE_TYPES_VIEW, PERMISSIONS.LEAVE_TYPES_CREATE],
    },
    {
      label: "New Holiday",
      path: base + "/holidays?new=1",
      icon: CalendarDays,
      tone: "rose",
      needs: [PERMISSIONS.HOLIDAYS_VIEW, PERMISSIONS.HOLIDAYS_CREATE],
    },
  ];
}

// Everything this person is allowed to create, as one grid of app icons.
export function CreateShortcuts() {
  const { user, can } = useAuth();

  const base = getModuleBase(user?.role);

  const items = buildCreateItems(base).filter((item) =>
    item.needs.every((permission) => can(permission))
  );

  if (items.length === 0) {
    return null;
  }

  return (
    // Like Quick Access, this row is for the phone only: on a bigger screen
    // the "New ..." button already sits at the top of every module page.
    <section className="flex flex-col gap-3 sm:hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Create</h2>
        <p className="text-sm text-muted-foreground">
          Start something new without hunting for the page first.
        </p>
      </div>

      {/* One row of app icons you drag sideways with a finger. */}
      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            title={item.label}
            className="flex w-20 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border border-dashed bg-card/60 p-2.5 text-center transition-transform duration-200 active:scale-95"
          >
            <span
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-2xl",
                toneClasses[item.tone]
              )}
            >
              <item.icon className="h-5 w-5" />

              {/* The little plus in the corner, so a create tile is never
                  mistaken for the plain link to the same module. */}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-card">
                <Plus className="h-2.5 w-2.5" />
              </span>
            </span>

            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
