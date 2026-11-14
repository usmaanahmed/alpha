import { cn } from "@/lib/utils";

// The look every tile of the meeting dashboard shares: a rounded card with a
// soft shadow. It lives in one place because eleven tiles use it, and a
// dashboard where one card is a shade different from the next looks broken.
export const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The heading of a tile: what the chart is, one line about how to read it,
// and whatever the tile wants on the right (a toggle, a link, a legend).
export function TileHeader(props: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="relative mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight">{props.title}</h2>
        <p className="text-sm text-muted-foreground">{props.subtitle}</p>
      </div>

      {props.right ? <div className="shrink-0">{props.right}</div> : null}
    </div>
  );
}

// The soft coloured glow behind a chart, for depth. It is only decoration,
// so a screen reader is told to walk past it.
export function TileGlow(props: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-primary/15 blur-3xl",
        props.className
      )}
    />
  );
}

// The line a tile shows instead of a chart when it has nothing to draw.
export function TileEmpty(props: { children: React.ReactNode }) {
  return (
    <p className="py-16 text-center text-sm text-muted-foreground">
      {props.children}
    </p>
  );
}

// A grey tile of the same height, so the page does not jump when the meetings
// arrive from the server.
export function TileSkeleton(props: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-muted/50 h-80", props.className)}
    />
  );
}

// One reading of the tile, written under its heading: a big number and the
// words that say what it counts. Several of them sit on one line.
export function TileFigure(props: {
  value: string;
  label: string;
  tone?: "big" | "small";
}) {
  const big = props.tone !== "small";

  return (
    <p className="flex items-baseline gap-2">
      <span
        className={cn(
          "font-bold tabular-nums leading-none",
          big ? "text-3xl" : "text-xl font-semibold"
        )}
      >
        {props.value}
      </span>
      <span className="text-sm text-muted-foreground">{props.label}</span>
    </p>
  );
}

// The row of figures under a tile heading.
export function TileFigures(props: { children: React.ReactNode }) {
  return (
    <div className="relative mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
      {props.children}
    </div>
  );
}

// One line of a hand-made legend: a colour dot, a name, a count, and how big
// a part of the whole that count is. Every chart on this page writes the
// number next to its colour, so a chart is never read by colour alone.
export function LegendRow(props: {
  color: string;
  name: string;
  value: string;
  percent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: props.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {props.name}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {props.value}
      </span>
      {props.percent ? (
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {props.percent}
        </span>
      ) : null}
    </div>
  );
}

// The extra line under a legend, kept apart by a rule because it is not one
// more slice of the ring above it.
export function LegendFootRow(props: {
  icon: React.ReactNode;
  name: string;
  value: string;
  percent?: string;
}) {
  return (
    <div className="mt-1 flex items-center gap-2.5 border-t border-border/60 pt-3">
      <span className="shrink-0 text-muted-foreground">{props.icon}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
        {props.name}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {props.value}
      </span>
      {props.percent ? (
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {props.percent}
        </span>
      ) : null}
    </div>
  );
}
