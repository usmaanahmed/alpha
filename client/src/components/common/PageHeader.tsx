// The title and description shown at the top of a page.
//
// avatar is used by the pages whose title is really a person ("Hello John"):
// the picture of that person is drawn in front of the title.
//
// On a phone the action button drops onto its own line under the title and
// stretches across it, which is both easier to read and easier to press than
// a small button squeezed into the corner. From "sm" up it goes back beside
// the title, on the right.
export function PageHeader(props: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  avatar?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        {props.avatar}

        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {props.title}
          </h1>
          {props.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {props.description}
            </p>
          ) : null}
        </div>
      </div>

      {/* "[&>button]:w-full" makes whatever button the page passed in fill the
          line on a phone; from "sm" up it shrinks back to its own size. */}
      {props.action ? (
        <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
          {props.action}
        </div>
      ) : null}
    </div>
  );
}
