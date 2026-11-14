import { TASK_STATUS_COLORS } from "./taskStatusColors";

// The line of five colours with their names, written above a chart.
//
// It is always there and never folded away: five colours inside one bar can
// never be read from the axis alone, and two of the five stay close for a
// reader who cannot tell red from green. The legend is what makes the chart
// readable without the colours.
export function StatusLegend() {
  return (
    <div className="relative mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {TASK_STATUS_COLORS.map((item) => (
        <span key={item.status} className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-4 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
