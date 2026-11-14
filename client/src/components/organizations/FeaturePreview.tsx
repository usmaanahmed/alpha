import { Bell, Check, Paperclip, Plus, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ModuleDefinition, ModuleFeature } from "@/types/module.types";

// The drawings of the switch board.
//
// A switch that only says "Reminders" does not tell the SaaS owner what they
// are about to take away. So next to every switch we draw a tiny wireframe of
// the real thing: the reminders card really is a list of lines with a warning
// dot, the Kanban view really is three columns of cards. Nobody has to open
// the app of that organization to remember what a name means.
//
// The drawings are made of plain boxes, never of real data: they are a sketch
// of a shape, not a screenshot. That is why they cost nothing to draw and can
// never go stale.

// ---------------------------------------------------------------------------
// The pieces every sketch is built from
// ---------------------------------------------------------------------------

// A grey line, the way a wireframe stands for a piece of text.
function Line(props: { w?: string; strong?: boolean }) {
  return (
    <div
      className={cn(
        "h-1.5 rounded-full",
        props.w || "w-full",
        props.strong ? "bg-foreground/25" : "bg-foreground/12"
      )}
    />
  );
}

// A box with a border, the way a wireframe stands for a card.
function Box(props: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-md border border-foreground/15 bg-foreground/[0.03] p-2",
        props.className
      )}
    >
      {props.children}
    </div>
  );
}

// A round grey dot, the way a wireframe stands for a photo of somebody.
function Dot(props: { className?: string }) {
  return (
    <div className={cn("shrink-0 rounded-full bg-foreground/15", props.className)} />
  );
}

// ---------------------------------------------------------------------------
// The sketches themselves, one per "preview" key of config/modules.ts
// ---------------------------------------------------------------------------

function StatCardsSketch() {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {[0, 1, 2, 3].map((one) => (
        <Box key={one} className="flex flex-col gap-1.5">
          <Line w="w-2/3" />
          <div className="h-3 w-1/2 rounded bg-primary/35" />
        </Box>
      ))}
    </div>
  );
}

function IconGridSketch() {
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((one) => (
        <div key={one} className="flex flex-col items-center gap-1">
          <div className="h-6 w-6 rounded-lg bg-primary/25" />
          <Line w="w-4/5" />
        </div>
      ))}
    </div>
  );
}

function ButtonsSketch() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {[0, 1, 2, 3, 4].map((one) => (
        <div
          key={one}
          className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1.5"
        >
          <Plus className="h-2.5 w-2.5 text-primary/70" />
          <div className="h-1.5 w-8 rounded-full bg-primary/40" />
        </div>
      ))}
    </div>
  );
}

function BentoSketch() {
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-1.5">
      <Box className="col-span-2 flex items-end gap-1">
        {[6, 10, 4, 12, 8, 14].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-sm bg-primary/30"
            style={{ height: height * 2 }}
          />
        ))}
      </Box>
      <Box className="flex items-center justify-center">
        <div className="h-9 w-9 rounded-full border-[5px] border-primary/35 border-t-primary/70" />
      </Box>
      <Box className="flex items-center justify-center">
        <div className="h-9 w-9 rounded-full border-[5px] border-primary/25 border-r-primary/60" />
      </Box>
      <Box className="col-span-2 flex flex-col justify-center gap-1.5">
        <Line w="w-3/4" strong />
        <Line w="w-1/2" />
        <Line w="w-2/3" />
      </Box>
    </div>
  );
}

function ChartsSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        <Box className="flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-[6px] border-primary/30 border-t-primary/70 border-r-primary/70" />
        </Box>
        <Box className="col-span-2 flex items-end gap-1">
          {[8, 14, 6, 16, 10, 18, 12].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-sm bg-primary/35"
              style={{ height: height * 2 }}
            />
          ))}
        </Box>
      </div>
    </div>
  );
}

function ListSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1, 2, 3].map((one) => (
        <Box key={one} className="flex items-center gap-2">
          <Dot className="h-5 w-5" />
          <div className="flex flex-1 flex-col gap-1">
            <Line w="w-1/3" strong />
            <Line w="w-1/4" />
          </div>
          <div className="h-2 w-8 rounded-full bg-primary/35" />
        </Box>
      ))}
    </div>
  );
}

function TimelineSketch() {
  return (
    <div className="flex flex-col gap-2 pl-1">
      {[0, 1, 2, 3].map((one) => (
        <div key={one} className="flex gap-2">
          <div className="flex flex-col items-center">
            <div className="h-2 w-2 rounded-full bg-primary/50" />
            {one < 3 ? <div className="w-px flex-1 bg-foreground/15" /> : null}
          </div>
          <div className="flex flex-1 flex-col gap-1 pb-1">
            <Line w="w-2/3" strong />
            <Line w="w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreeCardsSketch() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[0, 1, 2].map((one) => (
        <Box key={one} className="flex flex-col gap-1.5">
          <Line w="w-1/2" strong />
          <Line />
          <Line w="w-3/4" />
          <Line w="w-2/3" />
        </Box>
      ))}
    </div>
  );
}

function KanbanSketch() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[0, 1, 2].map((column) => (
        <div key={column} className="flex flex-col gap-1.5 rounded-md bg-foreground/[0.04] p-1.5">
          <Line w="w-2/3" strong />
          {[0, 1].map((card) => (
            <Box key={card} className="flex flex-col gap-1 bg-background">
              <Line w="w-4/5" />
              <div className="flex items-center gap-1">
                <Dot className="h-3 w-3" />
                <Line w="w-1/3" />
              </div>
            </Box>
          ))}
        </div>
      ))}
    </div>
  );
}

function CalendarSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1">
        {[0, 1, 2, 3, 4, 5, 6].map((one) => (
          <Line key={one} />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }).map((_unused, index) => (
          <div
            key={index}
            className={cn(
              "aspect-square rounded-sm border border-foreground/10",
              index === 9 || index === 16 ? "bg-primary/30" : "bg-foreground/[0.03]"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function CommentsSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1].map((one) => (
        <div key={one} className="flex gap-2">
          <Dot className="h-5 w-5" />
          <div className="flex flex-1 flex-col gap-1 rounded-lg rounded-tl-none border border-foreground/15 bg-foreground/[0.03] p-2">
            <Line w="w-1/4" strong />
            <Line />
            <Line w="w-2/3" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-foreground/25 p-2">
        <Line w="w-1/3" />
        <div className="ml-auto h-4 w-10 rounded bg-primary/35" />
      </div>
    </div>
  );
}

function FilesSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1, 2].map((one) => (
        <Box key={one} className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
          <div className="flex flex-1 flex-col gap-1">
            <Line w="w-1/2" strong />
            <Line w="w-1/4" />
          </div>
        </Box>
      ))}
    </div>
  );
}

function UploadSketch() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-foreground/20 py-6">
      <Upload className="h-6 w-6 text-foreground/30" />
      <Line w="w-24" />
      <Line w="w-16" />
    </div>
  );
}

function NotesSketch() {
  return (
    <Box className="flex flex-col gap-1.5 py-3">
      <Line w="w-1/4" strong />
      <Line />
      <Line />
      <Line w="w-5/6" />
      <Line w="w-2/3" />
    </Box>
  );
}

function ButtonSketch() {
  return (
    <div className="flex justify-center py-4">
      <div className="flex items-center gap-2 rounded-md border border-foreground/20 px-4 py-2">
        <div className="h-3.5 w-3.5 rounded-sm bg-primary/40" />
        <div className="h-2 w-16 rounded-full bg-foreground/25" />
      </div>
    </div>
  );
}

function FormRowsSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      {[0, 1].map((one) => (
        <div key={one} className="grid grid-cols-[1fr_auto] gap-1.5">
          <Box className="py-1.5">
            <Line w="w-2/3" />
          </Box>
          <Box className="w-16 py-1.5">
            <Line w="w-2/3" />
          </Box>
        </div>
      ))}
      <div className="flex items-center gap-1.5 rounded-md border border-dashed border-foreground/25 px-2 py-1.5">
        <Plus className="h-3 w-3 text-foreground/40" />
        <Line w="w-20" />
      </div>
    </div>
  );
}

function CheckinSketch() {
  return (
    <Box className="flex items-center gap-3 py-3">
      <div className="h-10 w-10 rounded-full border-[3px] border-primary/40" />
      <div className="flex flex-1 flex-col gap-1.5">
        <Line w="w-1/3" strong />
        <Line w="w-1/4" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-6 w-16 rounded-md bg-primary/35" />
        <div className="h-6 w-16 rounded-md border border-foreground/20" />
      </div>
    </Box>
  );
}

function PanelsSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2">
        <div className="h-3 w-3 shrink-0 rounded-full bg-amber-500/50" />
        <Line w="w-2/3" />
      </div>
      {[0, 1, 2].map((one) => (
        <Box key={one} className="flex items-center gap-2">
          <div className="h-3 w-3 shrink-0 rounded-sm bg-primary/30" />
          <Line w="w-1/3" strong />
          <div className="ml-auto h-2 w-2 rotate-45 border-r border-b border-foreground/30" />
        </Box>
      ))}
    </div>
  );
}

function AccordionSketch() {
  return (
    <div className="flex flex-col gap-1">
      <Box className="flex items-center gap-2 py-1.5">
        <Dot className="h-4 w-4" />
        <Line w="w-1/4" />
      </Box>

      {/* The row that is open, with the panel folded out under it. */}
      <Box className="flex items-center gap-2 border-primary/40 bg-primary/[0.06] py-1.5">
        <div className="h-2 w-2 rotate-45 border-r border-b border-primary/60" />
        <Dot className="h-4 w-4" />
        <Line w="w-1/3" strong />
      </Box>
      <div className="ml-4 grid grid-cols-3 gap-1.5 rounded-md border border-primary/25 bg-primary/[0.04] p-2">
        {[0, 1, 2].map((one) => (
          <div key={one} className="flex flex-col gap-1">
            <Line w="w-2/3" strong />
            <Line />
            <Line w="w-3/4" />
          </div>
        ))}
      </div>

      <Box className="flex items-center gap-2 py-1.5">
        <Dot className="h-4 w-4" />
        <Line w="w-1/5" />
      </Box>
    </div>
  );
}

function BellSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      {/* The topbar, with the bell sitting on its right. */}
      <div className="flex items-center gap-2 rounded-md border border-foreground/15 bg-foreground/[0.03] px-2 py-1.5">
        <Line w="w-16" />
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4 w-4 text-foreground/50" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
          </div>
          <Dot className="h-4 w-4" />
        </div>
      </div>

      {/* The little list that drops out of it. */}
      <div className="ml-auto w-3/4 rounded-md border border-foreground/15 bg-background p-1.5 shadow-sm">
        {[0, 1, 2].map((one) => (
          <div key={one} className="flex items-center gap-2 p-1">
            <Dot className="h-4 w-4" />
            <div className="flex flex-1 flex-col gap-1">
              <Line w="w-3/4" strong />
              <Line w="w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// A whole page, for the sections that are not a card but a screen of their own
// (the four analytics dashboards, the employee profile, the My Team page).
function PageSketch() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <Line w="w-1/3" strong />
          <Line w="w-1/2" />
        </div>
        <div className="h-5 w-14 rounded bg-primary/30" />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map((one) => (
          <Box key={one} className="flex flex-col gap-1">
            <Line w="w-2/3" />
            <div className="h-2.5 w-1/2 rounded bg-primary/35" />
          </Box>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Box className="col-span-2 flex items-end gap-1">
          {[7, 12, 5, 14, 9, 16].map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-sm bg-primary/30"
              style={{ height: height * 2 }}
            />
          ))}
        </Box>
        <Box className="flex items-center justify-center">
          <div className="h-10 w-10 rounded-full border-[6px] border-primary/30 border-t-primary/70" />
        </Box>
      </div>
    </div>
  );
}

// The sketch of a whole MODULE: the app itself, with the rail of the sidebar
// on the left and the pages of this module standing out in it. That is what
// switching a module off really does: those links leave the menu.
function ModuleSketch(props: { pages: string[]; isOn: boolean }) {
  return (
    <div className="flex gap-1.5">
      {/* The sidebar rail. */}
      <div className="flex w-24 shrink-0 flex-col gap-1 rounded-md border border-foreground/15 bg-foreground/[0.03] p-1.5">
        <Line w="w-2/3" strong />

        {/* Two links of other modules, then the pages of this one. */}
        <div className="flex items-center gap-1.5 px-0.5 py-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-foreground/15" />
          <Line w="w-10" />
        </div>

        {props.pages.map((page) => (
          <div
            key={page}
            className={cn(
              "flex items-center gap-1.5 rounded px-0.5 py-1 transition-all",
              props.isOn
                ? "bg-primary/15"
                : "opacity-40 grayscale"
            )}
          >
            <div
              className={cn(
                "h-2.5 w-2.5 shrink-0 rounded-sm",
                props.isOn ? "bg-primary/60" : "bg-foreground/20"
              )}
            />
            <span
              className={cn(
                "truncate text-[9px] leading-none",
                props.isOn
                  ? "text-primary"
                  : "text-muted-foreground line-through"
              )}
            >
              {page}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-1.5 px-0.5 py-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-foreground/15" />
          <Line w="w-8" />
        </div>
      </div>

      {/* The page next to it. */}
      <div className="flex-1">
        <PageSketch />
      </div>
    </div>
  );
}

// Pick the drawing by the "preview" key the server sent. A key we do not know
// falls back to a plain page, so a section added to the catalog later still
// shows something sensible instead of an empty hole.
function Sketch(props: { kind: string }) {
  if (props.kind === "stat-cards") return <StatCardsSketch />;
  if (props.kind === "icon-grid") return <IconGridSketch />;
  if (props.kind === "buttons") return <ButtonsSketch />;
  if (props.kind === "bento") return <BentoSketch />;
  if (props.kind === "charts") return <ChartsSketch />;
  if (props.kind === "list") return <ListSketch />;
  if (props.kind === "timeline") return <TimelineSketch />;
  if (props.kind === "cards-3") return <ThreeCardsSketch />;
  if (props.kind === "kanban") return <KanbanSketch />;
  if (props.kind === "calendar") return <CalendarSketch />;
  if (props.kind === "comments") return <CommentsSketch />;
  if (props.kind === "files") return <FilesSketch />;
  if (props.kind === "upload") return <UploadSketch />;
  if (props.kind === "notes") return <NotesSketch />;
  if (props.kind === "button") return <ButtonSketch />;
  if (props.kind === "form-rows") return <FormRowsSketch />;
  if (props.kind === "checkin") return <CheckinSketch />;
  if (props.kind === "panels") return <PanelsSketch />;
  if (props.kind === "accordion") return <AccordionSketch />;
  if (props.kind === "bell") return <BellSketch />;

  return <PageSketch />;
}

// ---------------------------------------------------------------------------
// The preview pane of the dialog
// ---------------------------------------------------------------------------

// The little window frame the sketch is drawn inside, so it reads as "a piece
// of the app" and not as a decoration of the dialog.
function AppFrame(props: { isOn: boolean; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
      {/* The three dots of a window title bar. */}
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-2.5 py-1.5">
        <span className="h-2 w-2 rounded-full bg-foreground/15" />
        <span className="h-2 w-2 rounded-full bg-foreground/15" />
        <span className="h-2 w-2 rounded-full bg-foreground/15" />
      </div>

      {/* When the switch is off the drawing fades away and a dashed frame
          takes its place, so the SaaS owner sees the hole the switch leaves
          instead of only reading about it. */}
      <div className="relative p-3">
        <div
          className={cn(
            "transition-all duration-300",
            props.isOn ? "opacity-100" : "opacity-15 blur-[1px] grayscale"
          )}
        >
          {props.children}
        </div>

        {!props.isOn ? (
          <div className="absolute inset-2 flex items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30">
            <span className="flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <X className="h-3 w-3" />
              Not shown
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// What is being previewed: either a whole module, or one section inside one.
// Only one of the two is ever set.
export function FeaturePreview(props: {
  module: ModuleDefinition;
  feature: ModuleFeature | null;
  isOn: boolean;
  // True when the module around this section is off. The section then says
  // nothing at all, whatever its own switch says, and the pane explains that
  // instead of pretending the switch still means something.
  isModuleOff: boolean;
}) {
  // Read the chosen thing into plain variables once, so the JSX below only
  // has to draw and never has to ask "is this a module or a section?" again.
  const feature = props.feature;

  const title = feature ? feature.label : props.module.label;
  const description = feature ? feature.description : props.module.description;

  return (
    <div className="flex flex-col gap-3">
      {/* --- What am I looking at --- */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>

          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              props.isOn
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}
          >
            {props.isOn ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {props.isOn ? "Shown" : "Hidden"}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{description}</p>

        <p className="text-xs text-muted-foreground">
          {feature ? (
            <>
              Sits on <span className="font-medium">{feature.page}</span>.
            </>
          ) : (
            <>
              {props.module.pages.length === 1 ? "Its page: " : "Its pages: "}
              <span className="font-medium">
                {props.module.pages.join(", ")}
              </span>
              .
            </>
          )}
        </p>
      </div>

      {/* --- What it looks like --- */}
      <AppFrame isOn={props.isOn}>
        {feature ? (
          <Sketch kind={feature.preview} />
        ) : (
          <ModuleSketch pages={props.module.pages} isOn={props.isOn} />
        )}
      </AppFrame>

      {/* --- What really happens --- */}
      <div className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        {feature && props.isModuleOff ? (
          <>
            This section is gone anyway, because the{" "}
            <span className="font-medium">{props.module.label}</span> module
            around it is switched off. Switch the module back on and this one
            answers again.
          </>
        ) : props.isOn ? (
          feature ? (
            <>Everybody of this organization sees this, if their role lets them.</>
          ) : (
            <>
              This organization has the module. Who inside it may open which
              page is then up to the roles the organization writes itself.
            </>
          )
        ) : feature ? (
          <>
            Nobody of this organization sees this, not even the organization
            account. The rest of{" "}
            <span className="font-medium">{props.module.label}</span> keeps
            working, and the server refuses this one on its own.
          </>
        ) : (
          <>
            The pages leave the menu for everybody of this organization, the
            organization account included, and the server answers 403 to
            anybody who types the address by hand.
          </>
        )}
      </div>
    </div>
  );
}
