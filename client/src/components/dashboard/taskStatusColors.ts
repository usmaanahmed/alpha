import type { TaskStatus } from "@/types/task.types";

// The five statuses of the task module, in the order of the workflow, each
// with the words the charts show and its own colour.
//
// These are exactly the five statuses the app has — the same list as
// TASK_STATUS_OPTIONS and as the enum of the task model. A chart shows these
// and nothing else: it never groups two of them together and never invents a
// sixth one.
//
// The list lives here and not inside one chart because three charts of the
// dashboard draw the same five statuses. One status therefore keeps one
// colour everywhere, and changing a colour is one edit and not three.
//
// The colours are not picked by taste: they were run through a colour
// blindness check against the white card AND against the dark one, which is
// why a single list is enough for both themes. "To do" and "In progress"
// stay close for a reader who cannot tell red from green, so a chart that
// puts them side by side leaves a gap between them and names every piece in
// its legend and its tooltip — the colour is never the only clue.
export const TASK_STATUS_COLORS: {
  status: TaskStatus;
  label: string;
  color: string;
}[] = [
  { status: "todo", label: "To do", color: "#8b5cf6" },
  { status: "in_progress", label: "In progress", color: "#0284c7" },
  { status: "in_review", label: "In review", color: "#d97706" },
  { status: "completed", label: "Done", color: "#059669" },
  { status: "cancelled", label: "Cancelled", color: "#dc2626" },
];
