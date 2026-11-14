import { Loader2 } from "lucide-react";

// A simple spinner shown while we wait for the server.
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
