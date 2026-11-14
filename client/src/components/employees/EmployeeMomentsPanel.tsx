import { useState } from "react";
import { Link } from "react-router-dom";
import { Cake, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TILE, TileGlow, TileHeader, TileEmpty } from "./EmployeeTile";
import { Avatar } from "@/components/common/Avatar";
import {
  buildAnniversaries,
  buildBirthdays,
  buildNewJoiners,
} from "./employeeAnalytics";
import type { EmployeeRow, Moment } from "./employeeAnalytics";

// How many lines each list writes before it stops counting out loud.
const MAX_ITEMS = 8;

type Tab = "birthdays" | "anniversaries" | "joiners";

// The dates that are coming up.
//
// Every other tile on this page is a measurement. This one is the only thing
// on the page a person would actually be glad you looked at: a birthday next
// Tuesday, five years since somebody walked in, a new starter who has been
// here nine days and still does not know where anything is.
//
// It is built from the very same two dates the tenure and age charts are
// drawn from, so a workspace that fills those fields in gets this tile for
// free.
export function EmployeeMomentsPanel(props: {
  rows: EmployeeRow[];
  employeesPath: string;
}) {
  const [tab, setTab] = useState<Tab>("birthdays");

  const birthdays = buildBirthdays(props.rows);
  const anniversaries = buildAnniversaries(props.rows);
  const joiners = buildNewJoiners(props.rows);

  const lists: Record<Tab, Moment[]> = {
    birthdays: birthdays,
    anniversaries: anniversaries,
    joiners: joiners,
  };

  const list = lists[tab];
  const shown = list.slice(0, MAX_ITEMS);

  const emptyText: Record<Tab, string> = {
    birthdays: "No birthday is coming up in the next six weeks.",
    anniversaries: "No work anniversary is coming up in the next six weeks.",
    joiners: "Nobody has joined in the last two months.",
  };

  return (
    <div className={TILE}>
      <TileGlow className="bg-fuchsia-500/15" />

      <TileHeader
        title="Coming up"
        subtitle="The dates worth knowing about the people, not about the work."
        right={
          <div className="flex rounded-lg border border-border/70 p-0.5">
            <TabButton
              label="Birthdays"
              count={birthdays.length}
              active={tab === "birthdays"}
              onClick={() => setTab("birthdays")}
            />
            <TabButton
              label="Years here"
              count={anniversaries.length}
              active={tab === "anniversaries"}
              onClick={() => setTab("anniversaries")}
            />
            <TabButton
              label="New"
              count={joiners.length}
              active={tab === "joiners"}
              onClick={() => setTab("joiners")}
            />
          </div>
        }
      />

      {list.length === 0 ? (
        <TileEmpty>{emptyText[tab]}</TileEmpty>
      ) : (
        <div className="relative flex flex-col gap-2">
          {shown.map((moment) => (
            <Link
              key={moment.key}
              to={props.employeesPath + "/" + moment.employeeId}
              className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-2.5 transition-colors hover:bg-muted/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-500/15 dark:text-fuchsia-400">
                {tab === "birthdays" ? (
                  <Cake className="h-4 w-4" />
                ) : tab === "anniversaries" ? (
                  <PartyPopper className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </span>

              <Avatar name={moment.name} photo={moment.photo} size="sm" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">
                  {moment.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {moment.designation || "No designation"} · {moment.detail}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">
                  {moment.when}
                </p>
                <p className="text-xs text-muted-foreground">
                  {whenText(moment.inDays)}
                </p>
              </div>
            </Link>
          ))}

          {list.length > shown.length ? (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              and {list.length - shown.length} more.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// "today", "in 3 days", "9 days ago". The new joiners are the only list that
// looks backwards, which is why this reads both ways.
function whenText(inDays: number) {
  if (inDays === 0) {
    return "today";
  }
  if (inDays === 1) {
    return "tomorrow";
  }
  if (inDays > 0) {
    return "in " + inDays + " days";
  }
  if (inDays === -1) {
    return "yesterday";
  }
  return -inDays + " days ago";
}

// One of the three little tabs in the corner of the tile. The count is written
// on it, so the reader knows there is nothing under a tab before opening it.
function TabButton(props: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={props.active ? "secondary" : "ghost"}
      className="h-7 px-2.5 text-xs"
      onClick={props.onClick}
    >
      {props.label}
      <span className="ml-1.5 tabular-nums text-muted-foreground">
        {props.count}
      </span>
    </Button>
  );
}
