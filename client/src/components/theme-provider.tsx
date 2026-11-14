import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

// A thin wrapper around next-themes, exactly like the shadcn ui docs set it
// up. It reads and writes the user's choice ("light", "dark" or "system")
// to localStorage, and toggles the "dark" class on <html> to match — that
// class is what turns on every ".dark { ... }" colour in index.css.
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
