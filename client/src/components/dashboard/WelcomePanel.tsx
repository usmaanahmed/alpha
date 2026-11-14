import { Link } from "react-router-dom";
import { UserPlus, Users, FileText, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

// The quick links shown as buttons. Each one is a real page of the app, so
// this card is a fast way into the jobs an organization does most.
interface QuickAction {
  label: string;
  to: string;
  icon: LucideIcon;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: "Add employee", to: "/organization/employees", icon: UserPlus },
  { label: "Manage users", to: "/organization/employees", icon: Users },
  { label: "Departments", to: "/organization/departments", icon: Network },
  { label: "View tasks", to: "/organization/tasks", icon: FileText },
];

// The welcome card on the right of the dashboard. It greets the person by
// the name of their organization and gives them four quick ways to start.
export function WelcomePanel(props: { name: string }) {
  return (
    <Card className="items-center gap-5 overflow-hidden p-6 text-center">
      {/* The soft glowing orb from the design, drawn with plain css circles
          so it needs no image. */}
      <div className="relative mt-2 flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-sky-400/30 blur-xl" />
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary to-sky-400 shadow-lg" />
        <div className="absolute left-6 top-5 h-4 w-4 rounded-full bg-white/70 blur-[2px]" />
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Welcome, {props.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What would you like to do today?
        </p>
      </div>

      {/* The four quick links, two by two. */}
      <div className="grid w-full grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.label}
            to={action.to}
            className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <action.icon className="h-4 w-4" />
            </span>
            <span className="truncate">{action.label}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
