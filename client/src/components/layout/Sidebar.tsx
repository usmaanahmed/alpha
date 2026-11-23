import { useEffect, useState } from "react";
import { Building2, ChevronDown, ChevronLeft, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { buildMenuGroups, findActiveGroup } from "./menu";

// The navigation rail on the left. It lists every group with its own links
// underneath.
//
// It has two shapes, and the screen size decides which one you see:
//
// - From "md" up (tablet in landscape, laptop, desktop) it is a floating
//   panel, always visible, cut from exactly the same cloth as the topbar next
//   to it: the same translucent card, rounded corners, hairline border, blur
//   and shadow, with the same gap around it on all four sides. It can be
//   collapsed to a slim icon strip with the little round button on its edge.
// - Below "md" (phone, tablet in portrait) there is no room for a rail, so
//   it becomes a drawer: it sits off-screen to the left and slides in over
//   the page when the menu button on the topbar is pressed. A dark backdrop
//   behind it closes it again, and so does picking any link.
//
// Each group heading can be folded open or shut, and its links sit indented
// under it with a soft trunk line, so the hierarchy is easy to read. The
// active link becomes a vibrant gradient pill. All choices are remembered
// between reloads.
//
// Nothing here appears or disappears in one frame. Both the whole rail and
// each group slide, and they do it the same way and over the same 300ms, so
// the panel always feels like one moving thing rather than a few parts that
// happen to change at once. The two tricks that make that possible:
//
// - The labels are never removed from the page when the rail collapses. They
//   stay where they are and simply fade out while the rail narrows around
//   them; "overflow-hidden" on each row wipes them away as the space runs
//   out. Deleting them instead would make the text vanish a frame before the
//   width even starts moving.
// - A folded group is not removed either. Its links live inside a one-row
//   grid whose row is animated from "0fr" (no height at all) to "1fr" (as
//   tall as the links need). This is the one way to slide something open to
//   its own natural height in pure CSS — a plain "height: auto" cannot be
//   animated, and a guessed "max-height" either clips a long group or spends
//   most of the animation on empty space.
export function Sidebar(props: {
  // True while the drawer is open on a small screen. It has no effect from
  // "md" up, where the rail is always on the screen.
  isMobileOpen: boolean;
  onMobileClose: () => void;
}) {
  const { user } = useAuth();

  // Whether the whole rail is collapsed to the slim icon strip.
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true"
  );

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  // The slim icon strip is a desktop idea: the drawer on a phone is always
  // wide enough for the labels, so while it is open we show them.
  const isCollapsed = collapsed && !props.isMobileOpen;

  // While the drawer is open the page behind it must not scroll, otherwise
  // dragging a finger over the backdrop moves the page instead of doing
  // nothing. We put the lock back exactly as we found it when it closes.
  useEffect(() => {
    if (!props.isMobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [props.isMobileOpen]);

  // Which groups are folded shut. We store the *closed* ones, so by default
  // (empty list) every group starts open.
  const [closedGroups, setClosedGroups] = useState<string[]>(() => {
    const saved = localStorage.getItem("sidebar-closed-groups");
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  });

  function toggleGroup(label: string) {
    let next: string[];
    if (closedGroups.includes(label)) {
      // It was closed, so open it (remove it from the closed list).
      next = closedGroups.filter((group) => group !== label);
    } else {
      // It was open, so close it (add it to the closed list).
      next = [...closedGroups, label];
    }
    setClosedGroups(next);
    localStorage.setItem("sidebar-closed-groups", JSON.stringify(next));
  }

  const menuGroups = buildMenuGroups(user);

  // Which group the current page belongs to, so we can light up its heading.
  const location = useLocation();
  const activeGroup = findActiveGroup(menuGroups, location.pathname);

  // A friendly label for the role, shown in the profile card at the bottom.
  let roleLabel = "Organization";

  if (user?.role === "saas_owner") {
    roleLabel = "SaaS Owner";
  }

  if (user?.role === "employee") {
    roleLabel = user.roleName || "Employee";
  }

  return (
    <>
      {/* The dark sheet behind the drawer. It only exists on a small screen
          and only while the drawer is open; pressing it shuts the drawer. */}
      {props.isMobileOpen ? (
        <div
          onClick={props.onMobileClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/50 duration-200 animate-in fade-in-0 md:hidden"
        />
      ) : null}

      <aside
        className={cn(
          // The material, and it is deliberately the SAME line the topbar
          // uses: a translucent card, a hairline border, a soft shadow and a
          // blur behind it. That is what makes the two read as one system.
          "flex w-72 shrink-0 flex-col border border-border/60 bg-card/80 shadow-lg shadow-black/5 backdrop-blur-xl",
          // Small screens: a drawer parked off-screen to the left. It fills
          // the height of the screen, so the corners stay square — a rounded
          // panel only makes sense once there is a gap around it.
          "fixed inset-y-0 left-0 z-50 h-screen transition-[transform,width] duration-300 ease-in-out",
          props.isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full",
          // From "md" up: a floating panel in the page, never translated away,
          // whose width follows the collapsed choice. The rounding matches the
          // topbar's "sm:rounded-3xl", and the height is the screen minus the
          // padding the layout puts above and below it, so the panel ends the
          // same distance from the bottom as it starts from the top.
          "md:sticky md:z-30 md:translate-x-0 md:rounded-3xl md:shadow-lg",
          "md:top-4 md:h-[calc(100vh-2rem)] lg:top-6 lg:h-[calc(100vh-3rem)]",
          collapsed ? "md:w-20" : "md:w-72"
        )}
      >
        {/* Soft ambient glow behind the brand, for a premium feel. It lives in
            its own clipped layer so the glow stays inside the rail while the
            collapse button on the edge is still free to overflow. The layer
            carries the panel's own rounding, or the glow would square off the
            top corners it is sitting in. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden md:rounded-3xl">
          <div className="absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </div>

        {/* Small round button on the rail's edge to collapse or expand. The
            drawer on a phone is already as narrow as it should get, so this
            only appears from "md" up. */}
        <button
          type="button"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-16 z-30 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-all hover:scale-110 hover:border-primary/40 hover:text-primary md:flex"
        >
          {/* One arrow that turns around, rather than two that swap places.
              A swap is a cut; a turn is a movement, and it lasts as long as
              the rail it belongs to. */}
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
              collapsed && "rotate-180"
            )}
          />
        </button>

        {/* Brand block. The logo carries a soft coloured glow. */}
        <div
          className={cn(
            "relative flex h-16 shrink-0 items-center overflow-hidden transition-all duration-300 ease-in-out",
            isCollapsed ? "justify-center gap-0 px-0" : "gap-3 px-5"
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-lg shadow-primary/30">
            <Building2 className="h-5 w-5" />
          </div>
          {/* Still here when collapsed, just faded and squeezed to nothing by
              the shrinking rail. "min-w-0" is what allows the squeeze. */}
          <div
            className={cn(
              "min-w-0 transition-opacity duration-200 ease-in-out",
              isCollapsed ? "opacity-0" : "opacity-100"
            )}
          >
            <p className="truncate text-sm font-bold leading-tight text-foreground">
              Multi Tenant OMS
            </p>
            <p className="truncate text-[0.7rem] text-muted-foreground">
              Workspace
            </p>
          </div>

          {/* Shutting the drawer from inside it, for a thumb that is nowhere
              near the backdrop. Only on small screens. */}
          <button
            type="button"
            onClick={props.onMobileClose}
            aria-label="Close menu"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grouped navigation. */}
        <nav className="relative flex flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3">
          {menuGroups.map((group, groupIndex) => {
            // A group is open unless it is in the "closed" list.
            const isOpen = !closedGroups.includes(group.label);
            // True when the page we are on lives inside this group.
            const isActiveGroup = activeGroup?.label === group.label;

            // A folded group only stays folded while its heading is on the
            // screen to unfold it again. The slim icon strip has no headings,
            // so there every group shows all of its links.
            const showItems = isCollapsed || isOpen;

            return (
              <div key={group.label} className="flex flex-col">
                {/* Group heading. When the rail is expanded it is a clickable
                    fold toggle: an icon chip, the name and a rotating chevron.
                    When collapsed we draw a short divider between groups. */}
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
                  >
                    {/* A small icon chip makes each group easy to recognise; it
                        turns primary-tinted when you are inside that group. */}
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActiveGroup
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/70 text-muted-foreground"
                      )}
                    >
                      {group.icon}
                    </span>
                    <span
                      className={cn(
                        "flex-1 truncate text-left text-sm font-semibold transition-colors",
                        isActiveGroup ? "text-foreground" : "text-foreground/60"
                      )}
                    >
                      {group.label}
                    </span>
                    {/* The chevron turns over exactly as long as the links
                        below it take to slide, so the two read as one move. */}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-300 ease-in-out",
                        !isOpen && "-rotate-90"
                      )}
                    />
                  </button>
                ) : groupIndex > 0 ? (
                  <div className="mx-auto mb-2 h-px w-8 bg-border" />
                ) : null}

                {/* The links. In the slim icon strip they always show; in the
                    expanded rail they show only when the group is open, indented
                    under the heading with a soft trunk line on the left.

                    Three nested divs, and each one has exactly one job:
                    1. the grid, whose single row is what actually animates,
                       from no height at all to the height of the links;
                    2. the clipper, which hides whatever does not fit yet —
                       without it the links would simply overflow a zero-high
                       row and nothing would appear to move;
                    3. the links themselves, carrying the indent, the trunk
                       line and a fade so a group does not slide in fully
                       opaque before it has any height to be seen in. */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-in-out",
                    showItems ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <div
                      className={cn(
                        "flex flex-col gap-1 pt-1 transition-opacity duration-300 ease-in-out",
                        showItems ? "opacity-100" : "opacity-0",
                        !isCollapsed && "ml-5 border-l border-border/70 pl-2.5"
                      )}
                    >
                      {group.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          // "end" makes the link active only on the exact url.
                          end
                          // The label is hidden when collapsed, so show a tooltip.
                          title={isCollapsed ? item.label : undefined}
                          // On a phone the drawer covers the page, so it has to
                          // get out of the way once a page is picked.
                          onClick={props.onMobileClose}
                          className="block"
                        >
                          {({ isActive }) => (
                            <div
                              className={cn(
                                // "overflow-hidden" is what wipes the label away
                                // as the row narrows, and the 300ms is the same
                                // 300ms the rail itself moves in.
                                "group relative flex items-center overflow-hidden rounded-xl transition-all duration-300 ease-in-out",
                                isCollapsed
                                  ? "mx-auto h-11 w-11 justify-center gap-0 px-0"
                                  : "gap-3 px-2.5 py-2",
                                // Expanded active link = a vibrant gradient pill.
                                !isCollapsed &&
                                  isActive &&
                                  "bg-linear-to-r from-primary to-primary/80 shadow-lg shadow-primary/30",
                                // Everything not-active lifts a little on hover.
                                !isActive && "hover:bg-muted hover:translate-x-0.5"
                              )}
                            >
                              {/* The icon chip. On the active pill it is a
                                  translucent white square; when collapsed it
                                  carries the gradient itself. */}
                              <span
                                className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all",
                                  isActive && isCollapsed &&
                                    "bg-linear-to-br from-primary to-primary/70 text-primary-foreground shadow-md shadow-primary/30",
                                  isActive && !isCollapsed &&
                                    "bg-white/20 text-primary-foreground",
                                  !isActive &&
                                    "text-muted-foreground group-hover:text-foreground"
                                )}
                              >
                                {item.icon}
                              </span>

                              {/* Kept on the page even when collapsed: it fades
                                  out while the row shrinks past it. "truncate"
                                  is also what lets it be squeezed — a flex item
                                  that hides its own overflow is allowed to
                                  become narrower than its text. */}
                              <span
                                className={cn(
                                  "truncate text-sm transition-all duration-300 ease-in-out",
                                  isCollapsed ? "opacity-0" : "opacity-100",
                                  isActive
                                    ? "font-semibold text-primary-foreground"
                                    : "font-medium text-muted-foreground group-hover:text-foreground"
                                )}
                              >
                                {item.label}
                              </span>
                            </div>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Profile card pinned to the bottom of the rail.

            One card in both shapes, not two cards that swap: collapsing it
            fades the name away, closes the gap and dissolves the card's own
            border and fill, leaving the avatar alone in the middle. Writing
            it as two separate blocks would swap them in a single frame while
            everything above them was still gliding. */}
        <div
          className={cn(
            "relative shrink-0 pb-4 transition-all duration-300 ease-in-out",
            isCollapsed ? "px-2" : "px-3"
          )}
        >
          <div
            className={cn(
              "flex items-center overflow-hidden rounded-xl border transition-all duration-300 ease-in-out",
              isCollapsed
                ? "justify-center gap-0 border-transparent bg-transparent p-0"
                : "gap-3 border-border/60 bg-muted/40 p-2.5"
            )}
          >
            <Avatar name={user?.name || ""} photo={user?.photo || ""} />
            <div
              className={cn(
                "min-w-0 transition-opacity duration-200 ease-in-out",
                isCollapsed ? "opacity-0" : "opacity-100"
              )}
            >
              <p className="truncate text-sm font-semibold leading-tight">
                {user?.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
