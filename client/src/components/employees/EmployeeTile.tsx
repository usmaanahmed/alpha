import { cn } from "@/lib/utils";

// The pieces every tile of the employee dashboard is built from.
//
// It is the same look the department and the meeting dashboards use, written
// once for this page too: a rounded card with a soft shadow, a heading, a row
// of figures, a hand-made legend. Fourteen tiles share it, and a dashboard
// where one card is a shade different from the next one looks broken.

export const TILE =
  "relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-lg shadow-black/5";

// The heading of a tile: what the chart is, one line about how to read it, and
// whatever the tile wants on the right (a picker, a link, a legend).
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

// The soft coloured glow behind a chart, for depth. It is only decoration, so
// a screen reader is told to walk past it.
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

// A grey tile of the same height, so the page does not jump when the lists
// arrive from the server.
export function TileSkeleton(props: { className?: string }) {
  return (
    <div
      className={cn(
        "h-80 animate-pulse rounded-2xl bg-muted/50",
        props.className
      )}
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

// The line a tile writes when part of what it draws could not be placed, for
// example the people whose joining date was never filled in. A chart drawn
// over half the team without saying so would be a lie.
export function TileNote(props: { children: React.ReactNode }) {
  return (
    <p className="relative mt-3 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
      {props.children}
    </p>
  );
}

// One line of a hand-made legend: a colour dot, a name, a count, and how big a
// part of the whole that count is. Every chart on this page writes the number
// next to its colour, so a chart is never read by colour alone — which is the
// whole point of writing our own legend instead of taking the one recharts
// draws.
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

// A flat legend for a chart whose colours mean a status and not a person. It
// sits above the chart, on one line, and wraps on a phone.
export function StatusLegendRow(props: {
  items: { label: string; color: string }[];
}) {
  return (
    <div className="relative mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {props.items.map((item) => (
        <span
          key={item.label}
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

// A thin bar that fills up to a percent, used on the scorecards. The number is
// always written next to it, so the bar is a picture of something the reader
// can also read.
export function Meter(props: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  // A percent that walks outside 0..100 would draw a bar out of its track.
  let width = props.percent;

  if (width < 0) {
    width = 0;
  }
  if (width > 100) {
    width = 100;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-muted-foreground">
          {props.label}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {props.value}
        </span>
      </div>

      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: width + "%", backgroundColor: props.color }}
        />
      </div>
    </div>
  );
}

// One horizontal bar of a distribution drawn without recharts: a name, a
// count, and a track that fills up to its share of the biggest bar.
//
// Recharts is worth its weight when a chart has an axis, a tooltip and several
// series. For "how many people sit in each department" it would only be a
// heavier way of drawing a row of rectangles, so those tiles draw their own.
export function BarRow(props: {
  name: string;
  value: number;
  percent: number;
  // How long the track is drawn, as a percent of the widest bar of the list.
  fill: number;
  color: string;
  hint?: string;
}) {
  let width = props.fill;

  if (width < 0) {
    width = 0;
  }
  if (width > 100) {
    width = 100;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm">
          {props.name}
          {props.hint ? (
            <span className="text-muted-foreground"> — {props.hint}</span>
          ) : null}
        </span>

        <span className="shrink-0 text-sm">
          <span className="font-semibold tabular-nums">{props.value}</span>
          <span className="ml-1.5 text-xs tabular-nums text-muted-foreground">
            {props.percent}%
          </span>
        </span>
      </div>

      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: width + "%", backgroundColor: props.color }}
        />
      </div>
    </div>
  );
}
