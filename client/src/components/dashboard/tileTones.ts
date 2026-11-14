// The colours of the little app-style tiles on the dashboard ("Quick Access"
// and "Create"). A tone is only the pair of Tailwind classes for the rounded
// icon square, so every tile of the same family looks the same in the light
// and in the dark theme.
export type Tone =
  | "indigo"
  | "sky"
  | "violet"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export const toneClasses: Record<Tone, string> = {
  indigo:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  violet:
    "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  emerald:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300",
};

// Which colour a menu group gets. The links of one group share a colour, so
// the grid reads as families instead of as twenty unrelated squares.
export function toneForGroup(groupLabel: string): Tone {
  if (groupLabel === "My Workspace") {
    return "sky";
  }
  if (groupLabel === "Organization") {
    return "indigo";
  }
  if (groupLabel === "Team") {
    return "violet";
  }
  if (groupLabel === "Meetings") {
    return "amber";
  }
  if (groupLabel === "Finance") {
    return "emerald";
  }
  if (groupLabel === "Human Resources" || groupLabel === "HR Admin") {
    return "rose";
  }
  return "slate";
}
