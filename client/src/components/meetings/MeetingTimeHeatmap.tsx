import { cn } from "@/lib/utils";
import { TILE, TileHeader, TileGlow, TileEmpty } from "./MeetingTile";
import {
  buildHeatmap,
  heatmapBlockLabel,
  heatmapBlockRange,
  HEATMAP_BLOCKS,
  percentOf,
} from "./meetingAnalytics";
import type { Meeting } from "@/types/meeting.types";

// The colour of one cell: the same indigo everywhere, and only its strength
// changes with the count. One colour going from pale to deep is read as "a
// little" to "a lot" without a legend; a rainbow of different colours would
// not be.
//
// An empty cell stays the plain muted colour of the page, so the eye finds
// the busy blocks straight away instead of counting the quiet ones.
function cellStyle(count: number, max: number) {
  if (count === 0) {
    return { backgroundColor: "var(--muted)" };
  }

  // The palest cell is still clearly darker than an empty one, so "one
  // meeting" never looks like "no meeting".
  return { backgroundColor: "rgba(99, 102, 241, " + cellStrength(count, max) + ")" };
}

// How strong the indigo of a cell is, from a quarter to full.
function cellStrength(count: number, max: number) {
  return 0.25 + (count / max) * 0.75;
}

// The colour of the number written inside a cell.
//
// A pale cell is nearly the colour of the card behind it — white in the light
// theme, dark in the dark one — so its number has to be the ordinary text
// colour, which is readable on both. Only once the indigo is strong enough to
// carry the cell on its own does the number turn white.
function cellTextClass(count: number, max: number) {
  if (count === 0) {
    return "";
  }
  return cellStrength(count, max) >= 0.6 ? "text-white" : "text-foreground";
}

// When in the week the workspace actually meets.
//
// Seven rows, one per day, and twelve columns, one per two hours of the
// clock. A cell holds the meetings that START in that block, so a long
// meeting is drawn where it begins and is not smeared over three cells.
//
// The cancelled meetings are left out: a meeting that was called off never
// took that slot in anybody's day.
export function MeetingTimeHeatmap(props: { meetings: Meeting[] }) {
  const heatmap = buildHeatmap(props.meetings);

  // The blocks 0..11, so the header row and every day row walk the same list.
  const blocks: number[] = [];
  for (let block = 0; block < HEATMAP_BLOCKS; block++) {
    blocks.push(block);
  }

  // How much of the week's meetings land on a working day. The weekend is
  // the last two rows, because the rows start on Monday.
  let weekendCount = 0;
  heatmap.rows.forEach((row) => {
    if (row.day >= 5) {
      weekendCount += row.total;
    }
  });

  return (
    <div className={TILE}>
      <TileGlow className="bg-indigo-500/15" />

      <TileHeader
        title="When the week is spent in meetings"
        subtitle="Every meeting that was held, by the day and the two hours it starts in."
      />

      {heatmap.total === 0 ? (
        <TileEmpty>No meeting has been held yet.</TileEmpty>
      ) : (
        <div className="relative">
          {/* The map can be wider than a phone, so it scrolls sideways on its
              own instead of stretching the whole page. */}
          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="min-w-140">
              {/* The hours across the top. The first cell is the empty
                  corner above the day names. */}
              <div className="mb-1 flex items-center gap-1">
                <span className="w-10 shrink-0" />
                {blocks.map((block) => (
                  <span
                    key={block}
                    className="min-w-0 flex-1 text-center text-[10px] tabular-nums text-muted-foreground"
                  >
                    {heatmapBlockLabel(block)}
                  </span>
                ))}
                <span className="w-8 shrink-0 text-right text-[10px] text-muted-foreground">
                  All
                </span>
              </div>

              {/* One row per day. */}
              {heatmap.rows.map((row) => (
                <div key={row.day} className="mb-1 flex items-center gap-1">
                  <span className="w-10 shrink-0 text-xs font-medium text-muted-foreground">
                    {row.label}
                  </span>

                  {row.cells.map((cell) => (
                    <span
                      key={cell.block}
                      // The title is the whole story of the cell, so the map
                      // can be read by hovering and never by colour alone.
                      title={
                        row.label +
                        ", " +
                        heatmapBlockRange(cell.block) +
                        " — " +
                        cell.count +
                        (cell.count === 1 ? " meeting" : " meetings")
                      }
                      className={cn(
                        "flex h-8 min-w-0 flex-1 items-center justify-center rounded-md text-[11px] font-semibold tabular-nums transition-transform hover:scale-110",
                        cellTextClass(cell.count, heatmap.max)
                      )}
                      style={cellStyle(cell.count, heatmap.max)}
                    >
                      {/* The count is written in the cell once there is one,
                          so the shade is a hint and never the only clue. */}
                      {cell.count > 0 ? cell.count : ""}
                    </span>
                  ))}

                  <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {row.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* The scale, and the one sentence the map is worth. */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Quiet</span>
              <span className="flex items-center gap-1">
                {[0, 1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className="h-3 w-6 rounded-sm"
                    style={cellStyle(step, 4)}
                  />
                ))}
              </span>
              <span className="text-xs text-muted-foreground">
                Busy ({heatmap.max} in one block)
              </span>
            </div>

            {heatmap.busiest ? (
              <p className="text-sm text-muted-foreground">
                Most meetings start{" "}
                <span className="font-semibold text-foreground">
                  {heatmap.busiest.day}, {heatmap.busiest.range}
                </span>
                . {percentOf(weekendCount, heatmap.total)}% fall on a weekend.
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
