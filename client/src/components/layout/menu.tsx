import {
  BadgeDollarSign,
  Building2,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChartColumnBig,
  ChartNetwork,
  ChartPie,
  ClipboardList,
  FileClock,
  LayoutDashboard,
  ListChecks,
  Network,
  Plane,
  ReceiptText,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound,
  Video,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AuthUser } from "@/types/auth.types";
import { PERMISSIONS } from "@/lib/permissions";
import { MODULES, FEATURES } from "@/lib/features";

// One clickable link. These now live on the topbar, as pill tabs.
export interface MenuItem {
  label: string;
  to: string;
  icon: ReactNode;
}

// A group of related links. The group is shown on the sidebar rail (its
// icon and its label), and when the group is active its items are shown
// as tabs on the topbar.
export interface MenuGroup {
  label: string;
  // The icon drawn in the sidebar rail for this whole group.
  icon: ReactNode;
  items: MenuItem[];
}

// Build the grouped menu for the logged in user. Both the sidebar and the
// topbar call this, so they always agree on the same groups and links.
//
// For an organization account and for an employee the menu is now built the
// SAME way: from the permissions. An organization simply carries every
// permission, so it sees every link, while an employee sees the links its
// role was given. That is why there is only one branch for the two of them,
// with one difference: the address, because the two live under a different
// part of the app (/organization/... and /employee/...).
export function buildMenuGroups(user: AuthUser | null): MenuGroup[] {
  if (user?.role === "saas_owner") {
    return [
      {
        label: "Overview",
        icon: <LayoutDashboard className="h-5 w-5" />,
        items: [
          {
            label: "Dashboard",
            to: "/owner",
            icon: <LayoutDashboard className="h-4 w-4" />,
          },
        ],
      },
      {
        label: "Management",
        icon: <ShieldCheck className="h-5 w-5" />,
        items: [
          {
            label: "Organizations",
            to: "/owner/organizations",
            icon: <Building2 className="h-4 w-4" />,
          },
          {
            label: "Default roles",
            to: "/owner/roles",
            icon: <ShieldCheck className="h-4 w-4" />,
          },
        ],
      },
    ];
  }

  const isOrganizationAccount = user?.role === "organization";

  // Where the pages of this person live. The pages themselves are the very
  // same components on both sides; only the address changes.
  const base = isOrganizationAccount ? "/organization" : "/employee";

  const permissions = user?.permissions || [];

  function can(permission: string) {
    return permissions.includes(permission);
  }

  function canAny(wanted: string[]) {
    return wanted.some((permission) => permissions.includes(permission));
  }

  // The second question, next to the permissions: not "may I?" but "did the
  // SaaS owner sell this to my organization at all?".
  //
  // Most links never have to ask it. The server already took the permissions
  // of a switched off module out of the array above, so can() answers no by
  // itself and the link is gone. These two are for the links no permission
  // protects ("My Tasks", "My Leaves") and for the analytics pages, which
  // are a section INSIDE a module that is otherwise on.
  const modules = user?.modules || [];
  const features = user?.features || [];

  function hasModule(moduleKey: string) {
    return modules.includes(moduleKey);
  }

  function hasFeature(featureKey: string) {
    return features.includes(featureKey);
  }

  const groups: MenuGroup[] = [];

  // ---------------------------------------------------------------------
  // Overview
  // ---------------------------------------------------------------------
  groups.push({
    label: "Overview",
    icon: <LayoutDashboard className="h-5 w-5" />,
    items: [
      {
        label: "Dashboard",
        to: base,
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // My workspace: what belongs to me and needs no permission at all.
  // The organization account is not a person, so it has no own tasks, own
  // attendance or own leaves to show.
  // ---------------------------------------------------------------------
  //
  // These five need no permission, so nothing is dropped from my profile
  // when the SaaS owner switches their module off: the module key is the
  // only thing that can close them, and that is what hasModule asks here.
  if (!isOrganizationAccount) {
    const myItems: MenuItem[] = [];

    if (hasModule(MODULES.TASKS)) {
      myItems.push({
        label: "My Tasks",
        to: "/employee/my-tasks",
        icon: <ListChecks className="h-4 w-4" />,
      });
    }

    if (hasModule(MODULES.MEETINGS)) {
      myItems.push({
        label: "My Meetings",
        to: "/employee/my-meetings",
        icon: <CalendarClock className="h-4 w-4" />,
      });
    }

    if (hasModule(MODULES.ATTENDANCE)) {
      myItems.push({
        label: "My Attendance",
        to: "/employee/my-attendance",
        icon: <CalendarCheck className="h-4 w-4" />,
      });
    }

    if (hasModule(MODULES.LEAVES)) {
      myItems.push({
        label: "My Leaves",
        to: "/employee/my-leaves",
        icon: <Plane className="h-4 w-4" />,
      });
    }

    if (hasModule(MODULES.HOLIDAYS)) {
      myItems.push({
        label: "Holidays",
        to: "/employee/holidays",
        icon: <CalendarDays className="h-4 w-4" />,
      });
    }

    if (myItems.length > 0) {
      groups.push({
        label: "My Workspace",
        icon: <Briefcase className="h-5 w-5" />,
        items: myItems,
      });
    }
  }

  // ---------------------------------------------------------------------
  // Organization: the people and the work of the whole company.
  // ---------------------------------------------------------------------
  const organizationItems: MenuItem[] = [];

  if (can(PERMISSIONS.DEPARTMENTS_VIEW)) {
    // The analytics of the departments come before the departments
    // themselves, the same way the meeting and the finance groups open on
    // their dashboard and not on their list. It is a section of its own, so
    // the SaaS owner can take the charts away and leave the list.
    if (hasFeature(FEATURES.DEPARTMENTS_DASHBOARD)) {
      organizationItems.push({
        label: "Department Dashboard",
        to: base + "/department-dashboard",
        icon: <ChartPie className="h-4 w-4" />,
      });
    }

    organizationItems.push({
      label: "Departments",
      to: base + "/departments",
      icon: <Network className="h-4 w-4" />,
    });
  }

  if (can(PERMISSIONS.EMPLOYEES_VIEW)) {
    // The analytics of the people come before the list itself, exactly like
    // the department dashboard sits in front of the departments.
    if (hasFeature(FEATURES.EMPLOYEES_DASHBOARD)) {
      organizationItems.push({
        label: "Employee Dashboard",
        to: base + "/employee-dashboard",
        icon: <ChartColumnBig className="h-4 w-4" />,
      });
    }

    organizationItems.push({
      label: "Employees",
      to: base + "/employees",
      icon: <Users className="h-4 w-4" />,
    });
  }

  if (can(PERMISSIONS.TEAMS_VIEW)) {
    // The analytics of the teams come before the list itself, exactly like the
    // department and the employee dashboards sit in front of their pages.
    if (hasFeature(FEATURES.TEAMS_DASHBOARD)) {
      organizationItems.push({
        label: "Team Dashboard",
        to: base + "/team-dashboard",
        icon: <ChartNetwork className="h-4 w-4" />,
      });
    }

    organizationItems.push({
      label: "Teams",
      to: base + "/teams",
      icon: <UsersRound className="h-4 w-4" />,
    });
  }

  if (can(PERMISSIONS.TASKS_VIEW_ALL)) {
    organizationItems.push({
      label: "Tasks",
      to: base + "/tasks",
      icon: <ClipboardList className="h-4 w-4" />,
    });
  }

  if (can(PERMISSIONS.ROLES_VIEW)) {
    organizationItems.push({
      label: "Roles",
      to: base + "/roles",
      icon: <ShieldCheck className="h-4 w-4" />,
    });
  }

  if (organizationItems.length > 0) {
    groups.push({
      label: "Organization",
      icon: <Building2 className="h-5 w-5" />,
      items: organizationItems,
    });
  }

  // ---------------------------------------------------------------------
  // Team: the links of somebody who leads other people. A team lead is not
  // a role, so this group is not built from the permissions alone.
  // ---------------------------------------------------------------------
  const teamItems: MenuItem[] = [];

  // Being in a team is enough to see it: a member only reads the card, a
  // lead also gets the buttons on it. It needs no permission, so only the
  // feature of the SaaS owner can close it.
  if (user?.isInTeam && hasFeature(FEATURES.TEAMS_MY_TEAM)) {
    teamItems.push({
      label: "My Team",
      to: "/employee/my-team",
      icon: <UsersRound className="h-4 w-4" />,
    });
  }

  // "The tasks I gave". A team lead gives tasks exactly like somebody with
  // the assign permission does, so they both get this page.
  //
  // hasModule has to be asked as well: a team lead has no permission at all,
  // so there is nothing to drop for them when the tasks module goes off.
  if (
    !isOrganizationAccount &&
    hasModule(MODULES.TASKS) &&
    (can(PERMISSIONS.TASKS_ASSIGN) || user?.isTeamLead)
  ) {
    teamItems.push({
      label: "Team Tasks",
      to: "/employee/team-tasks",
      icon: <ClipboardList className="h-4 w-4" />,
    });
  }

  // Answering leave requests: for my own people, or for the whole company.
  //
  // A team lead gets the link too, exactly like with the team tasks above: a
  // leave request is routed to them for a recommendation, so the page has to
  // be reachable even when their role has no leave permission at all.
  if (
    !isOrganizationAccount &&
    hasModule(MODULES.LEAVES) &&
    (can(PERMISSIONS.LEAVES_APPROVE) || user?.isTeamLead)
  ) {
    teamItems.push({
      label: "Leave Requests",
      to: "/employee/leaves",
      icon: <Plane className="h-4 w-4" />,
    });
  }

  if (teamItems.length > 0) {
    groups.push({
      label: "Team",
      icon: <Users className="h-5 w-5" />,
      items: teamItems,
    });
  }

  // ---------------------------------------------------------------------
  // Meetings
  // ---------------------------------------------------------------------
  if (canAny([PERMISSIONS.MEETINGS_VIEW_ALL, PERMISSIONS.MEETINGS_CREATE])) {
    const meetingItems: MenuItem[] = [];

    if (hasFeature(FEATURES.MEETINGS_DASHBOARD)) {
      meetingItems.push({
        label: "Meeting Dashboard",
        to: base + "/meeting-dashboard",
        icon: <CalendarClock className="h-4 w-4" />,
      });
    }

    meetingItems.push({
      label: "Meetings",
      to: base + "/meetings",
      icon: <CalendarDays className="h-4 w-4" />,
    });

    groups.push({
      label: "Meetings",
      icon: <Video className="h-5 w-5" />,
      items: meetingItems,
    });
  }

  // ---------------------------------------------------------------------
  // Finance
  // ---------------------------------------------------------------------
  if (can(PERMISSIONS.CHEQUES_VIEW)) {
    const financeItems: MenuItem[] = [];

    if (hasFeature(FEATURES.CHEQUES_DASHBOARD)) {
      financeItems.push({
        label: "Cheque Dashboard",
        to: base + "/cheque-dashboard",
        icon: <Wallet className="h-4 w-4" />,
      });
    }

    financeItems.push({
      label: "Cheques",
      to: base + "/cheques",
      icon: <ReceiptText className="h-4 w-4" />,
    });

    groups.push({
      label: "Finance",
      icon: <Wallet className="h-5 w-5" />,
      items: financeItems,
    });
  }

  // ---------------------------------------------------------------------
  // Human resources
  // ---------------------------------------------------------------------
  const hrItems: MenuItem[] = [];

  if (can(PERMISSIONS.ATTENDANCE_VIEW_ALL)) {
    hrItems.push({
      label: "Attendance",
      to: base + "/attendance",
      icon: <CalendarCheck className="h-4 w-4" />,
    });

    // The month view is a section of its own, so the day by day table can
    // stay while the calendar is switched off.
    if (hasFeature(FEATURES.ATTENDANCE_CALENDAR)) {
      hrItems.push({
        label: "Attendance Calendar",
        to: base + "/attendance-calendar",
        icon: <CalendarRange className="h-4 w-4" />,
      });
    }
  }

  // The organization account has no "Team" group, so its own link to the
  // leave requests lives here instead.
  if (isOrganizationAccount && can(PERMISSIONS.LEAVES_VIEW_ALL)) {
    hrItems.push({
      label: "Leave Requests",
      to: base + "/leaves",
      icon: <Plane className="h-4 w-4" />,
    });
  }

  // The salary structures of the staff. It sits with the other people
  // modules and not with the cheques: it is about what an employee earns,
  // not about the money moving in and out of the company.
  if (can(PERMISSIONS.SALARIES_VIEW)) {
    hrItems.push({
      label: "Salaries",
      to: base + "/salaries",
      icon: <BadgeDollarSign className="h-4 w-4" />,
    });
  }

  if (can(PERMISSIONS.LEAVE_TYPES_VIEW)) {
    hrItems.push({
      label: "Leave Types",
      to: base + "/leave-types",
      icon: <FileClock className="h-4 w-4" />,
    });
  }

  if (can(PERMISSIONS.HOLIDAYS_VIEW)) {
    hrItems.push({
      label: "Holidays",
      to: base + "/holidays",
      icon: <CalendarDays className="h-4 w-4" />,
    });
  }

  if (hrItems.length > 0) {
    groups.push({
      label: isOrganizationAccount ? "Human Resources" : "HR Admin",
      icon: isOrganizationAccount ? (
        <Users className="h-5 w-5" />
      ) : (
        <UserCog className="h-5 w-5" />
      ),
      items: hrItems,
    });
  }

  return groups;
}

// Find which group the current page belongs to. We look at every link and
// keep the one whose address best matches the page we are on. The "best"
// match is the longest one, so "/organization/departments" wins over the
// shorter "/organization" of the Overview group.
export function findActiveGroup(
  groups: MenuGroup[],
  pathname: string
): MenuGroup | null {
  let bestGroup: MenuGroup | null = null;
  let bestLength = -1;

  for (const group of groups) {
    for (const item of group.items) {
      // A link matches when we are exactly on it, or on a page below it.
      const isMatch =
        pathname === item.to || pathname.startsWith(item.to + "/");

      if (isMatch && item.to.length > bestLength) {
        bestGroup = group;
        bestLength = item.to.length;
      }
    }
  }

  return bestGroup;
}
