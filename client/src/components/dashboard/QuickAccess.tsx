import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { buildMenuGroups } from "@/components/layout/menu";
import { getModuleBase } from "@/types/auth.types";
import { toneClasses, toneForGroup } from "./tileTones";
import type { Tone } from "./tileTones";

// One square on the grid: the icon of the page and its title underneath,
// exactly like the home screen of a phone.
interface Tile {
  label: string;
  to: string;
  icon: ReactNode;
  tone: Tone;
}

// Every page this person is allowed to open, as one grid of app icons.
//
// The list is NOT written by hand here. It is the very same menu the sidebar
// and the topbar are built from, so a link only shows up when the role of the
// person carries the permission that opens that page. A new module added to
// the menu appears here on its own.
export function QuickAccess() {
  const { user } = useAuth();

  const base = getModuleBase(user?.role);
  const groups = buildMenuGroups(user);

  const tiles: Tile[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      // The dashboard itself is dropped: we are already standing on it.
      if (item.to === base) {
        continue;
      }

      tiles.push({
        label: item.label,
        to: item.to,
        icon: item.icon,
        tone: toneForGroup(group.label),
      });
    }
  }

  if (tiles.length === 0) {
    return null;
  }

  return (
    // "sm:hidden": this row belongs to the phone only. On a bigger screen the
    // sidebar and the topbar are already on the page, so the same links twice
    // would only be noise.
    <section className="flex flex-col gap-3 sm:hidden">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Quick Access</h2>
        <p className="text-sm text-muted-foreground">
          Every page your role can open, one tap away.
        </p>
      </div>

      {/* One row of app icons you drag sideways with a finger. */}
      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {tiles.map((tile) => (
          <Link
            key={tile.to}
            to={tile.to}
            title={tile.label}
            className="flex w-20 shrink-0 snap-start flex-col items-center gap-2 rounded-2xl border bg-card p-2.5 text-center shadow-sm transition-transform duration-200 active:scale-95"
          >
            {/* The menu draws its icons at h-4 w-4, which is right for a link
                on the topbar but too small for a tile, so the svg inside is
                grown to h-5 w-5 here. */}
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl [&_svg]:h-5 [&_svg]:w-5",
                toneClasses[tile.tone]
              )}
            >
              {tile.icon}
            </span>

            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted-foreground">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
