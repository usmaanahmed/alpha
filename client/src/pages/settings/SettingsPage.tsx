import { LogOut, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/common/PageHeader";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { useLogout } from "@/hooks/useAuthMutations";
import { cn } from "@/lib/utils";

// One "name: value" line of the profile card.
function DetailRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-2.5 last:border-b-0">
      <span className="shrink-0 text-sm text-muted-foreground">
        {props.label}
      </span>
      <span className="min-w-0 truncate text-sm font-medium">
        {props.value}
      </span>
    </div>
  );
}

// One of the three theme buttons. The one you are using gets the indigo
// border and a tinted background, so the choice is visible without reading.
function ThemeButton(props: {
  value: string;
  label: string;
  icon: React.ReactNode;
  currentTheme: string | undefined;
  onPick: (value: string) => void;
}) {
  const isActive = props.currentTheme === props.value;

  return (
    <button
      type="button"
      onClick={() => props.onPick(props.value)}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
        isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {props.icon}
      <span className="text-sm font-medium">{props.label}</span>
    </button>
  );
}

// The page behind "Settings" in the avatar menu of the topbar.
//
// It is mounted three times, under /owner, /organization and /employee, so
// whoever is logged in opens their own copy of it. Everything on it is read
// from the account that is already in the app (nothing new is asked from the
// server), plus the one thing this page really owns: the theme.
export function SettingsPage() {
  const { user } = useAuth();
  const logout = useLogout();
  const { theme, setTheme } = useTheme();

  // Show a nice text instead of the raw role value, the same way the topbar
  // and the sidebar do.
  let roleLabel = "Organization";

  if (user?.role === "saas_owner") {
    roleLabel = "SaaS Owner";
  }

  if (user?.role === "employee") {
    roleLabel = user.roleName || "Employee";
  }

  const permissions = user?.permissions || [];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Your account, and how this app looks on this computer."
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* LEFT: who you are. */}
        <Card className="lg:w-1/2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar
                name={user?.name || ""}
                photo={user?.photo || ""}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight">
                  {user?.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
                <span className="mt-2 inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <DetailRow label="Organization" value={user?.organizationName || "—"} />
              <DetailRow label="Department" value={user?.departmentName || "—"} />
              <DetailRow label="Role" value={roleLabel} />
              <DetailRow
                label="Team lead"
                value={user?.isTeamLead ? "Yes" : "No"}
              />
            </div>

            {/* The name, the email and the picture are set by the
                organization on the employee page, so this card only reads
                them. Saying it here saves somebody looking for a button
                that is on purpose not here. */}
            <p className="mt-4 text-xs text-muted-foreground">
              Your name, email and picture are managed by your organization.
            </p>
          </CardContent>
        </Card>

        {/* RIGHT: the theme, what you may do, and the way out. */}
        <div className="flex flex-col gap-4 lg:w-1/2">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                "System" follows the light or dark setting of your computer.
                The choice is kept in this browser only.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <ThemeButton
                  value="light"
                  label="Light"
                  icon={<Sun className="h-5 w-5" />}
                  currentTheme={theme}
                  onPick={setTheme}
                />
                <ThemeButton
                  value="dark"
                  label="Dark"
                  icon={<Moon className="h-5 w-5" />}
                  currentTheme={theme}
                  onPick={setTheme}
                />
                <ThemeButton
                  value="system"
                  label="System"
                  icon={<Monitor className="h-5 w-5" />}
                  currentTheme={theme}
                  onPick={setTheme}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                Your access
              </CardTitle>
            </CardHeader>

            <CardContent>
              {permissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This account is not built on permissions.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    The {permissions.length} things your role lets you do. Only
                    your organization can change this list.
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {permissions.map((permission) => (
                      <span
                        key={permission}
                        className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>

            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Logging out closes the live connection and forgets this
                computer until you sign in again.
              </p>

              <Button
                variant="outline"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                {logout.isPending ? "Logging out..." : "Log out"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
