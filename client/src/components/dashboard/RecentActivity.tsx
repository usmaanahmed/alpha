import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/common/Avatar";
import { cn } from "@/lib/utils";
import { ACTIVITY_FILTERS, timeAgo, dayLabel, isJustNow } from "./activityFeed";
import type { ActivityItem } from "./activityFeed";

// The last things that happened in the workspace, drawn as one vertical
// timeline: a line down the left, a round picture on the line for every
// event, and the sentence of that event next to it.
//
// The rows are grouped under a small "Today" / "Yesterday" / date chip, and
// the chips over the list keep only one family of events (people, tasks,
// meetings, HR, finance) so a long list stays readable.
export function RecentActivity(props: {
  items: ActivityItem[];
  isLoading: boolean;
}) {
  // Which chip is pressed. "all" is the one we start on.
  const [filter, setFilter] = useState("all");

  // The moment the labels are measured against. "2m ago" has to become
  // "3m ago" on its own, even when nothing new arrives, so we put the clock
  // itself into a state and move it every ten seconds.
  //
  // It has to be a real value that travels down to the rows, and not only a
  // counter we throw away: a row is only drawn again when something it was
  // given has changed. With a counter nobody reads, React (and the compiler
  // that memoises these rows) sees the very same row as a second ago and
  // keeps the old picture, which is why the labels stood still.
  //
  // Ten seconds and not a minute, because this same moment is what stops the
  // blinking of a fresh row: with a slower beat a row could still be blinking
  // half a minute after it stopped being new.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  const visibleItems =
    filter === "all"
      ? props.items
      : props.items.filter((item) => item.group === filter);

  // How many events each chip would show, written inside the chip itself so
  // nobody has to press an empty one to find out it is empty.
  function countFor(value: string) {
    if (value === "all") {
      return props.items.length;
    }
    return props.items.filter((item) => item.group === value).length;
  }

  return (
    <Card className="relative gap-5 overflow-hidden">
      {/* Two soft colour clouds behind the panel, for depth. They are only
          decoration, so they never catch a click. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl"
      />

      {/* --- The header --- */}
      <div className="relative flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <Activity className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Recent Activity
            </h2>
            {/* While the lists are still coming the count would read "0",
                which is not true yet, so it stays a plain sentence. */}
            <p className="text-sm text-muted-foreground">
              {props.isLoading
                ? "Reading what happened lately…"
                : "The latest " +
                  props.items.length +
                  " things that happened here."}
            </p>
          </div>
        </div>

        {/* The small "live" pill. The dot behind it pulses, which is what
            makes the panel feel alive without any extra request. */}
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {/* --- The filter chips ---
          On a phone they slide sideways in one row instead of wrapping into
          three lines that would push the timeline off the screen. */}
      <div className="relative -mb-1 flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-6">
        {ACTIVITY_FILTERS.map((chip) => {
          const isActive = chip.value === filter;
          const count = countFor(chip.value);

          return (
            <button
              key={chip.value}
              type="button"
              onClick={() => setFilter(chip.value)}
              aria-pressed={isActive}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "border-transparent bg-foreground text-background shadow-md"
                  : "border-border/70 bg-card text-muted-foreground hover:border-foreground/20 hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                  isActive ? "bg-background/20" : "bg-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* --- The timeline --- */}
      <div className="relative px-2 sm:px-4">
        {props.isLoading ? (
          <LoadingRows />
        ) : visibleItems.length === 0 ? (
          <EmptyState hasAnything={props.items.length > 0} />
        ) : (
          <div className="relative">
            {/* The list scrolls inside the card, so twenty events never make
                the dashboard itself twice as long. */}
            <div className="max-h-140 overflow-y-auto pr-1">
              {/* This inner box is as tall as ALL the rows together, and the
                  line is measured against it. Hanging the line on the box
                  that scrolls instead would only make it as long as the part
                  we can see, and it would stay behind when we scroll. */}
              <div className="relative">
                {/* The line of the timeline. It sits behind the rows and
                    fades out at the bottom, so it never ends in a hard
                    stub. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 left-8 top-2 w-px bg-gradient-to-b from-border via-border to-transparent"
                />

                {visibleItems.map((item, index) => {
                  // A new day starts here when this event does not fall on
                  // the same day as the one above it. The very first row
                  // always opens a group.
                  const label = dayLabel(item.at);
                  const previousLabel =
                    index === 0 ? "" : dayLabel(visibleItems[index - 1].at);
                  const startsNewDay = label !== previousLabel;

                  return (
                    <div key={item.id}>
                      {startsNewDay ? <DayDivider label={label} /> : null}
                      {/* The moment goes down with the row, so every ten
                          seconds the row is really drawn again. */}
                      <ActivityRow item={item} index={index} now={now} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* A soft fade over the last row, so it is clear the list goes on
                under the edge of the card. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent"
            />
          </div>
        )}
      </div>
    </Card>
  );
}

// The small chip that opens a new day. Its own background covers the line of
// the timeline, so the line looks cut on purpose at every new day.
function DayDivider(props: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-2">
      <span className="rounded-full border border-border/70 bg-card px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        {props.label}
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

// One event: the picture of the person who did it with a small coloured badge
// of what they did, the sentence, and how long ago it was.
//
// The whole row is a link into the module the event came from.
function ActivityRow(props: {
  item: ActivityItem;
  index: number;
  // The moment the panel is showing, moved every ten seconds. See the state
  // at the top of this file.
  now: number;
}) {
  const item = props.item;
  const Icon = item.icon;

  // An event less than a minute old. It gets the same blinking as the "Live"
  // pill of the header, so the thing that just happened is impossible to
  // miss. The moment above moves on by itself, so the blinking stops by
  // itself too once the minute is over.
  const isFresh = isJustNow(item.at, props.now);

  return (
    <Link
      to={item.to}
      className="group relative flex animate-in items-center gap-3.5 rounded-2xl p-2.5 fade-in slide-in-from-bottom-2"
      style={{
        // The rows come in one after the other instead of all at once. The
        // delay grows with the position, and stops growing after the tenth
        // row so a long list is not still arriving a second later.
        animationDelay: Math.min(props.index, 10) * 40 + "ms",
        animationFillMode: "backwards",
      }}
    >
      {/* The colour of the event, washed over the row on hover only. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(90deg, " + item.color + "1f, transparent 70%)",
        }}
      />

      {/* The node on the line. The thick ring in the card colour is what
          makes the line look like it passes behind the picture. */}
      <span className="relative z-10 shrink-0">
        <Avatar
          name={item.actorName}
          photo={item.actorPhoto}
          size="md"
          className="h-11 w-11 text-sm ring-4 ring-card transition-transform duration-200 group-hover:scale-105"
        />

        {/* The blink of a fresh event: the same circle as the badge, in the
            same colour, growing and fading behind it for ever. It is only
            decoration, so it is drawn under the badge and ignores clicks. */}
        {isFresh ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-0.5 -right-0.5 h-5 w-5 animate-ping rounded-full opacity-75"
            style={{ backgroundColor: item.color }}
          />
        ) : null}

        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-sm ring-2 ring-card"
          style={{ backgroundColor: item.color }}
        >
          <Icon className="h-3 w-3" />
        </span>
      </span>

      {/* The sentence. The two names are bold and the verb between them is
          grey, so the eye reads "who" and "what" first. */}
      <div className="relative z-10 min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <span className="font-semibold">{item.actorName}</span>{" "}
          <span className="text-muted-foreground">{item.action}</span>{" "}
          <span className="font-semibold">{item.subject}</span>
        </p>

        {item.detail ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {item.detail}
          </p>
        ) : null}
      </div>

      {/* How long ago, on the right edge. A fresh event says it in the same
          green pill with the same pulsing dot as the "Live" pill above, so
          the two read as one idea. */}
      {isFresh ? (
        <span className="relative z-10 flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          just now
        </span>
      ) : (
        <span className="relative z-10 shrink-0 self-start pt-1 text-[11px] tabular-nums text-muted-foreground">
          {timeAgo(item.at, props.now)}
        </span>
      )}
    </Link>
  );
}

// Nothing to show. It says something different when the whole workspace is
// still empty and when it is only this one chip that has no events.
function EmptyState(props: { hasAnything: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox className="h-5 w-5" />
      </span>
      <p className="text-sm text-muted-foreground">
        {props.hasAnything
          ? "Nothing of this kind happened lately."
          : "Nothing has happened here yet."}
      </p>
    </div>
  );
}

// The grey rows shown while the lists are still on their way, in the same
// shape as the real ones so the card does not jump when they arrive.
function LoadingRows() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3.5">
          <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted/60" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-muted/60" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted/40" />
          </div>
          <div className="h-3 w-10 shrink-0 animate-pulse rounded-full bg-muted/40" />
        </div>
      ))}
    </div>
  );
}
