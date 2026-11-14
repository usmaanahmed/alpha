import { useState, useEffect } from "react";
import { formatTimeAgo } from "@/lib/date";

// "2 min ago" that keeps itself right.
//
// formatTimeAgo() reads the clock once, so a text drawn at 10:00 would still
// say "just now" at 10:05. React redraws a component when its state changes,
// so we keep the text itself in state and write it again every 30 seconds.
//
// Half a minute is on purpose: the text only changes at the full minute, so
// nobody ever sees a value more than 30 seconds late, and we are still doing
// almost nothing.
export function TimeAgo(props: {
  // The moment, as the server sends it: "2026-07-31T09:12:00.000Z".
  value: string;
  className?: string;
}) {
  const [text, setText] = useState(() => formatTimeAgo(props.value));

  useEffect(() => {
    // A new value arrived (a new notification took this place in the list),
    // so write the text once immediately instead of waiting 30 seconds.
    setText(formatTimeAgo(props.value));

    const timer = setInterval(() => {
      setText(formatTimeAgo(props.value));
    }, 30000);

    // React runs this when the component leaves the screen, or before the
    // effect runs again. Without it the old timer would keep ticking
    // forever on something nobody can see.
    return () => clearInterval(timer);
  }, [props.value]);

  // title is what the browser shows when the mouse rests on the text, so
  // the exact date and time is always one hover away.
  return (
    <span
      className={props.className}
      title={new Date(props.value).toLocaleString()}
    >
      {text}
    </span>
  );
}
