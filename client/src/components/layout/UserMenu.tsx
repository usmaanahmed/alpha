import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar } from "@/components/common/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useAuthMutations";
import { cn } from "@/lib/utils";

// One line of the "Appearance" sub menu: light, dark or system.
//
// It is written once and used three times, so the tick that marks the theme
// you are on is drawn exactly the same way for all three.
function ThemeItem(props: {
  value: string;
  label: string;
  icon: React.ReactNode;
  currentTheme: string | undefined;
  onPick: (value: string) => void;
}) {
  const isActive = props.currentTheme === props.value;

  return (
    <DropdownMenuItem
      onClick={() => props.onPick(props.value)}
      className="gap-2.5 rounded-lg px-2.5 py-2"
    >
      {props.icon}
      <span className="text-sm">{props.label}</span>
      {isActive ? <Check className="ml-auto h-4 w-4 text-primary" /> : null}
    </DropdownMenuItem>
  );
}

// The avatar button on the right of the topbar, and the menu it opens.
//
// This is the one place a person goes to for "things about me": who am I
// logged in as, my settings, how the app looks, and the way out. Before this
// existed the logout button sat naked on the topbar and the name was only
// text; now the topbar stays quiet and everything personal lives here.
export function UserMenu() {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  // We keep the open state ourselves for one small reason: the little arrow
  // on the button turns upside down while the menu is open.
  const [isOpen, setIsOpen] = useState(false);

  // Show a nice text instead of the raw role value.
  // An employee sees the name of its own role, for example "Manager".
  let roleLabel = "Organization";

  if (user?.role === "saas_owner") {
    roleLabel = "SaaS Owner";
  }

  if (user?.role === "employee") {
    roleLabel = user.roleName || "Employee";
  }

  // Where the settings page of this account lives. The page is the same
  // component for everybody, but it is mounted under the part of the app
  // that belongs to the person who is logged in.
  let settingsPath = "/employee/settings";

  if (user?.role === "saas_owner") {
    settingsPath = "/owner/settings";
  }

  if (user?.role === "organization") {
    settingsPath = "/organization/settings";
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          className={cn(
            // A pill that holds the picture, the name and the arrow. On a
            // phone only the picture is left, so the pill shrinks to a circle
            // around it and the padding on the right goes away.
            "flex shrink-0 items-center gap-2 rounded-full border border-transparent p-1 transition-colors hover:bg-muted sm:pr-2.5",
            isOpen && "border-border/70 bg-muted"
          )}
        >
          {/* The picture, with the little green dot that says "you are
              logged in right now". The ring is the colour of the card
              behind it, so the dot looks cut out of the avatar. */}
          <span className="relative shrink-0">
            <Avatar
              name={user?.name || ""}
              photo={user?.photo || ""}
              className="h-8 w-8"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          </span>

          {/* The name and the role. They are the first thing to go when the
              screen gets narrow: the picture alone still says who you are. */}
          <span className="hidden max-w-36 min-w-0 text-left sm:block">
            <span className="block truncate text-sm font-semibold leading-tight">
              {user?.name}
            </span>
            <span className="block truncate text-[0.7rem] leading-tight text-muted-foreground">
              {roleLabel}
            </span>
          </span>

          <ChevronDown
            className={cn(
              "hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 sm:block",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>

      {/* p-0 because the card at the top goes edge to edge; the list of
          options below it draws its own padding. */}
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-72 overflow-hidden p-0"
      >
        {/* The card at the top: who is logged in, in full. The topbar only
            has room for the name, so the email lives here. */}
        <div className="flex items-center gap-3 bg-muted/50 px-4 py-3.5">
          <Avatar
            name={user?.name || ""}
            photo={user?.photo || ""}
            className="h-11 w-11 text-sm"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">
              {user?.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Small chips under the card: the role, and the company this
            account belongs to. A saas owner has no company, so that chip is
            simply not drawn. */}
        <div className="flex flex-wrap gap-1.5 border-b bg-muted/50 px-4 pb-3">
          <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary">
            {roleLabel}
          </span>

          {user?.organizationName ? (
            <span className="max-w-full truncate rounded-full border border-border bg-card px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
              {user.organizationName}
            </span>
          ) : null}

          {user?.departmentName ? (
            <span className="max-w-full truncate rounded-full border border-border bg-card px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
              {user.departmentName}
            </span>
          ) : null}
        </div>

        <div className="p-1.5">
          <DropdownMenuItem
            onClick={() => navigate(settingsPath)}
            className="gap-2.5 rounded-lg px-2.5 py-2"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm">Settings</span>
          </DropdownMenuItem>

          {/* How the app looks. It opens to the side with the three choices
              of the theme and a tick on the one you are using. */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2.5 rounded-lg px-2.5 py-2">
              <Palette className="h-4 w-4" />
              <span className="text-sm">Appearance</span>
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent className="w-40 p-1.5">
              <ThemeItem
                value="light"
                label="Light"
                icon={<Sun className="h-4 w-4" />}
                currentTheme={theme}
                onPick={setTheme}
              />
              <ThemeItem
                value="dark"
                label="Dark"
                icon={<Moon className="h-4 w-4" />}
                currentTheme={theme}
                onPick={setTheme}
              />
              <ThemeItem
                value="system"
                label="System"
                icon={<Monitor className="h-4 w-4" />}
                currentTheme={theme}
                onPick={setTheme}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="mx-0 my-1.5" />

          {/* The way out. variant="destructive" paints it red, because it is
              the one line here that ends what you are doing. */}
          <DropdownMenuItem
            variant="destructive"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="gap-2.5 rounded-lg px-2.5 py-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">
              {logout.isPending ? "Logging out..." : "Log out"}
            </span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
