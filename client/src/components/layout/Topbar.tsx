import { ChevronRight, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { buildMenuGroups, findActiveGroup } from "./menu";
import type { MenuGroup } from "./menu";
import { useAuth } from "@/context/AuthContext";
import { FEATURES } from "@/lib/features";

// The label of the page we are on, taken from the menu.
//
// It walks every link of every group and keeps the one that matches the
// address best, exactly like findActiveGroup does: the longest match wins, so
// "/organization/employees" beats the shorter "/organization" of the
// dashboard link when we are on the employee page.
function findActiveItemLabel(groups: MenuGroup[], pathname: string) {
  let bestLabel = "";
  let bestLength = -1;

  for (const group of groups) {
    for (const item of group.items) {
      const isMatch = pathname === item.to || pathname.startsWith(item.to + "/");

      if (isMatch && item.to.length > bestLength) {
        bestLabel = item.label;
        bestLength = item.to.length;
      }
    }
  }

  return bestLabel;
}

// A name for a page that is not in the menu at all, for example the settings
// page. We take the last piece of the address and make it readable:
// "/organization/settings" -> "Settings".
function labelFromPathname(pathname: string) {
  const pieces = pathname.split("/").filter((piece) => piece.length > 0);
  const last = pieces[pieces.length - 1];

  if (!last) {
    return "Dashboard";
  }

  // "leave-types" -> "Leave types"
  const withSpaces = last.replace(/-/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

// The bar across the top of every page after the login.
//
// It carries no navigation links of its own — those all live in the sidebar.
// What it does carry is the two things a person needs on every single screen:
//
// - on the left, WHERE you are: the workspace, the group of the menu you are
//   in and the page itself, written as a breadcrumb trail. On a phone only
//   the page name survives, because that is the piece you actually need.
// - on the right, YOU: the notifications, the theme and the avatar button
//   that opens the account menu (settings, appearance, log out).
//
// "sticky top-*" pins it in place as the page scrolls, keeping the same gap
// from the top of the screen that it has at rest. The numbers follow the
// padding of the column around it (py-3 / sm:py-4 / lg:py-6), so it lines up
// exactly on every screen size.
export function Topbar(props: {
  // Opens the sidebar drawer. Only reachable on a small screen, where the
  // rail is not on the page.
  onOpenMobileNav: () => void;
}) {
  const { user, hasFeature } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // The same menu the sidebar draws, so the trail on the topbar and the
  // highlighted link on the rail can never disagree.
  const menuGroups = buildMenuGroups(user);
  const activeGroup = findActiveGroup(menuGroups, location.pathname);
  const activeItemLabel = findActiveItemLabel(menuGroups, location.pathname);

  // The last crumb: the page from the menu, or a name built from the address
  // for the few pages that are not in the menu.
  const pageLabel = activeItemLabel || labelFromPathname(location.pathname);

  // The first crumb: the company this account works in. A saas owner is not
  // inside a company, it owns the whole platform.
  let workspaceLabel = "Workspace";

  if (user?.role === "saas_owner") {
    workspaceLabel = "Platform";
  }

  if (user?.organizationName) {
    workspaceLabel = user.organizationName;
  }

  // Where the first crumb takes you: the dashboard of this account.
  let homePath = "/employee";

  if (user?.role === "saas_owner") {
    homePath = "/owner";
  }

  if (user?.role === "organization") {
    homePath = "/organization";
  }

  return (
    <header className="sticky top-3 z-20 flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-card/80 px-3 shadow-lg shadow-black/5 backdrop-blur-xl sm:top-4 sm:h-16 sm:gap-4 sm:rounded-3xl sm:px-5 lg:top-6">
      <button
        type="button"
        onClick={props.onOpenMobileNav}
        aria-label="Open menu"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* WHERE YOU ARE.
          Three crumbs on a wide screen, one on a phone. The trail is a real
          breadcrumb element so a screen reader announces it as one. */}
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-1.5"
      >
        {/* The company, and a way back to the dashboard. Hidden on a phone,
            where the sidebar button is right next to it anyway. */}
        <button
          type="button"
          onClick={() => navigate(homePath)}
          className="hidden max-w-40 shrink-0 truncate rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:block"
        >
          {workspaceLabel}
        </button>

        <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 lg:block" />

        {/* The group of the menu, for example "Human Resources". It only
            appears from "md" up: on a small screen it is one crumb too many. */}
        {activeGroup ? (
          <>
            <span className="hidden max-w-40 shrink-0 truncate px-1 text-sm text-muted-foreground md:block">
              {activeGroup.label}
            </span>
            <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted-foreground/40 md:block" />
          </>
        ) : null}

        {/* The page itself. This one is on every screen size, and it is the
            only crumb that is written in the strong colour. */}
        <span
          aria-current="page"
          className="min-w-0 truncate px-1 text-sm font-semibold text-foreground sm:text-[0.95rem]"
        >
          {pageLabel}
        </span>
      </nav>

      {/* YOU.
          The bell and the theme are quiet square buttons, then a hairline
          divider, then the avatar. The divider is what makes the avatar read
          as "the account" instead of "a third button". */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
        {/* The bell sits next to the theme button on every screen size: a
            notification is not a "nice to have" that may hide on a phone. */}
        {hasFeature(FEATURES.NOTIFICATIONS_BELL) ? <NotificationBell /> : null}

        <ModeToggle />

        <span
          aria-hidden="true"
          className="mx-1 hidden h-6 w-px bg-border sm:block"
        />

        {/* The picture of the logged in person, and the whole account menu
            behind it: settings, appearance and log out. */}
        <UserMenu />
      </div>
    </header>
  );
}
