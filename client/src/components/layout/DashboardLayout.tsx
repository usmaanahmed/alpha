import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useLiveUpdates } from "@/hooks/useLiveUpdates";

// The frame around every page after login.
//
// On a laptop and a desktop the sidebar and the topbar are the same kind of
// object: two floating panels, made of the same translucent card material,
// with the same rounded corners, the same hairline border and the same soft
// shadow. The padding that makes them float lives here, on the one element
// that wraps them both, so the gap above the sidebar and the gap above the
// topbar can never drift apart.
//
// On a tablet and a phone there is no room for a rail next to the page, so
// the sidebar becomes a drawer that slides in over the page. The button that
// opens it lives on the topbar, and this component owns the open/shut state
// because both the topbar (which opens it) and the sidebar (which draws it)
// need to agree on it.
//
// There is no inner div pretending to be the page's scroll area here: the
// page scrolls with the browser's own built-in scrollbar, exactly like any
// normal web page. The sidebar and the topbar simply use "position: sticky"
// to stay pinned in place while that one scrollbar moves the page — so a
// tall or wide section never grows a scrollbar of its own.
export function DashboardLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Every page of the app lives inside this frame, so listening here once is
  // what makes the WHOLE app live: whatever somebody else creates or changes,
  // the lists of the page you are looking at read themselves again. Nobody
  // presses F5 anywhere.
  useLiveUpdates();

  return (
    // The padding grows with the screen: tight on a phone so nothing is
    // wasted, roomy on a desktop. It is the same padding on all four sides of
    // both panels, and "gap" gives the sidebar and the page column between
    // them exactly that same breathing room.
    <div className="flex min-h-screen gap-3 bg-background px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:gap-6 lg:px-8 lg:py-6">
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {/* "min-w-0" is what stops a wide table or a long word from pushing the
          whole column wider than the screen. */}
      <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5">
        <Topbar onOpenMobileNav={() => setIsMobileNavOpen(true)} />

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
