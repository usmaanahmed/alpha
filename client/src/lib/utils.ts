import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Small helper used by the shadcn ui components to join css classes together.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
