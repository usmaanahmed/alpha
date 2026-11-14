import { useState, useEffect } from "react";
import { ChevronRight, Loader2, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeaturePreview } from "@/components/organizations/FeaturePreview";
import { cn } from "@/lib/utils";
import {
  useModuleCatalog,
  useOrganizationModules,
  useUpdateOrganizationModules,
} from "@/hooks/useModules";
import type { Organization } from "@/types/organization.types";
import type { ModuleDefinition, ModuleFeature } from "@/types/module.types";

// The switch board of the SaaS owner for ONE organization.
//
// Two panes. On the left the list: one line per module with a switch, and
// every line folds open into the cards, the panels and the extra pages that
// live inside it, each with its own switch. On the right a preview of
// whatever line is chosen: a little drawing of the real thing, and what
// happens to it when the switch goes off.
//
// The preview is the point of this screen. "Reminders" is a word; the drawing
// is what the SaaS owner actually takes away, and it fades out in front of
// them the moment they flip the switch.
//
// The dialog works on the OFF lists, exactly like the database does: a key
// inside the list means "switched off". Nothing is saved while switches are
// flipped, the Save button sends the whole board in one go.
export function ModuleSwitchesDialog(props: {
  organization: Organization | null;
  onClose: () => void;
}) {
  const organizationId = props.organization ? props.organization._id : null;

  const catalogQuery = useModuleCatalog();
  const savedQuery = useOrganizationModules(organizationId);
  const updateModules = useUpdateOrganizationModules();

  // What is switched off right now, while the dialog is open. It starts as
  // the copy of what the server saved, and Save writes it back.
  const [offModules, setOffModules] = useState<string[]>([]);
  const [offFeatures, setOffFeatures] = useState<string[]>([]);

  // Which module lines are folded open. Nothing is open on the first paint:
  // fourteen modules with all their sections would be a wall of switches.
  const [openModules, setOpenModules] = useState<string[]>([]);

  // The line the preview pane is showing. We keep the two keys and not the
  // objects themselves, so the pane always reads the freshest catalog.
  const [chosenModule, setChosenModule] = useState<string | null>(null);
  const [chosenFeature, setChosenFeature] = useState<string | null>(null);

  // Copy the saved answer into the states as soon as it arrives, and again
  // every time the dialog is opened on another organization.
  useEffect(() => {
    if (savedQuery.data) {
      setOffModules(savedQuery.data.disabledModules);
      setOffFeatures(savedQuery.data.disabledFeatures);
      setOpenModules([]);
      setChosenModule(null);
      setChosenFeature(null);
    }
  }, [savedQuery.data]);

  const catalog = catalogQuery.data || [];

  function isModuleOn(moduleKey: string) {
    return !offModules.includes(moduleKey);
  }

  function isFeatureOn(featureKey: string) {
    return !offFeatures.includes(featureKey);
  }

  // Switch a whole module on or off.
  //
  // The sections inside it are NOT touched: the SaaS owner switches the
  // module back on a month later and finds their choices exactly as they left
  // them. While the module is off they are drawn greyed out, so it is clear
  // they say nothing at the moment.
  function toggleModule(moduleKey: string) {
    if (isModuleOn(moduleKey)) {
      setOffModules([...offModules, moduleKey]);
    } else {
      setOffModules(offModules.filter((key) => key !== moduleKey));
    }
  }

  function toggleFeature(featureKey: string) {
    if (isFeatureOn(featureKey)) {
      setOffFeatures([...offFeatures, featureKey]);
    } else {
      setOffFeatures(offFeatures.filter((key) => key !== featureKey));
    }
  }

  function toggleOpen(moduleKey: string) {
    if (openModules.includes(moduleKey)) {
      setOpenModules(openModules.filter((key) => key !== moduleKey));
    } else {
      setOpenModules([...openModules, moduleKey]);
    }
  }

  // Show a module in the preview pane. Flipping its switch calls this too,
  // so the drawing on the right fades out under the hand that switched it.
  function showModuleInPreview(moduleKey: string) {
    setChosenModule(moduleKey);
    setChosenFeature(null);
  }

  // Pressing the NAME of a module previews it and folds it open as well, so
  // its sections are one more click away instead of two. The switch does not
  // do this second part: flipping something should not also move the list
  // under the pointer.
  function chooseModule(moduleKey: string) {
    showModuleInPreview(moduleKey);

    if (!openModules.includes(moduleKey)) {
      setOpenModules([...openModules, moduleKey]);
    }
  }

  function chooseFeature(moduleKey: string, featureKey: string) {
    setChosenModule(moduleKey);
    setChosenFeature(featureKey);
  }

  // "Everything on" and "everything off", because a new organization gets the
  // whole app and a trial account often gets three modules out of fourteen.
  // Clearing by hand would be fourteen clicks.
  function switchEverythingOn() {
    setOffModules([]);
    setOffFeatures([]);
  }

  function switchEverythingOff() {
    setOffModules(catalog.map((module) => module.key));
    setOffFeatures([]);
  }

  // How many sections of this module are switched off, for the small grey
  // number on the folded line.
  function countOffFeatures(module: ModuleDefinition) {
    return module.features.filter((feature) =>
      offFeatures.includes(feature.key)
    ).length;
  }

  function onSave() {
    if (!organizationId) {
      return;
    }

    updateModules.mutate(
      {
        id: organizationId,
        values: {
          disabledModules: offModules,
          disabledFeatures: offFeatures,
        },
      },
      {
        onSuccess: () => props.onClose(),
      }
    );
  }

  // What the preview pane is showing right now.
  const previewModule =
    catalog.find((module) => module.key === chosenModule) || null;

  let previewFeature: ModuleFeature | null = null;

  if (previewModule && chosenFeature) {
    previewFeature =
      previewModule.features.find((one) => one.key === chosenFeature) || null;
  }

  const onCount = catalog.filter((module) => isModuleOn(module.key)).length;
  const isLoading = catalogQuery.isLoading || savedQuery.isLoading;

  return (
    <Dialog open={props.organization !== null} onOpenChange={props.onClose}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Modules of {props.organization?.name}</DialogTitle>
          <DialogDescription>
            Pick a line to see what it looks like inside the app. A module that
            is off is gone for the whole workspace: the pages, the menu links
            and the api answers, for the organization account as well.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="rounded-md border p-10 text-center text-sm text-muted-foreground">
            Loading the modules...
          </p>
        ) : (
          <>
            {/* --- The bar over the two panes --- */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {onCount} of {catalog.length} modules on
                </span>

                {/* One little square per module, so the whole plan of this
                    organization is readable in one glance. */}
                <div className="flex gap-0.5">
                  {catalog.map((module) => (
                    <span
                      key={module.key}
                      title={module.label}
                      className={cn(
                        "h-2.5 w-2.5 rounded-[3px] transition-colors",
                        isModuleOn(module.key) ? "bg-primary/70" : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={switchEverythingOn}
                >
                  Everything on
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={switchEverythingOff}
                >
                  Everything off
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_20rem]">
              {/* ----------------------------------------------------------
                  The list of switches
                  ---------------------------------------------------------- */}
              <div className="flex max-h-[24rem] flex-col gap-2 overflow-y-auto rounded-md border p-2">
                {catalog.map((module) => {
                  const moduleOn = isModuleOn(module.key);
                  const isOpen = openModules.includes(module.key);
                  const offCount = countOffFeatures(module);
                  const isChosen =
                    chosenModule === module.key && chosenFeature === null;

                  return (
                    <div
                      key={module.key}
                      className={cn(
                        "rounded-md border transition-colors",
                        !moduleOn && "bg-muted/40",
                        isChosen && "border-primary/50 ring-1 ring-primary/20"
                      )}
                    >
                      {/* --- The module line itself --- */}
                      <div className="flex items-center gap-1 p-2">
                        {/* The arrow that folds the sections open. A module
                            without any section has nothing to fold. */}
                        {module.features.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleOpen(module.key)}
                            className="rounded p-1 text-muted-foreground hover:bg-accent"
                            title={
                              isOpen ? "Hide the sections" : "Show the sections"
                            }
                          >
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 transition-transform",
                                isOpen && "rotate-90"
                              )}
                            />
                          </button>
                        ) : (
                          <span className="h-6 w-6" />
                        )}

                        {/* The whole label is the button that previews it. */}
                        <button
                          type="button"
                          onClick={() => chooseModule(module.key)}
                          className="flex flex-1 flex-col items-start gap-0.5 rounded px-1 py-0.5 text-left hover:bg-accent/50"
                        >
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                !moduleOn && "text-muted-foreground"
                              )}
                            >
                              {module.label}
                            </span>

                            {!moduleOn ? (
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Off
                              </span>
                            ) : offCount > 0 ? (
                              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                                {offCount} section
                                {offCount === 1 ? "" : "s"} off
                              </span>
                            ) : null}
                          </span>

                          <span className="text-xs text-muted-foreground">
                            {module.pages.join(" · ")}
                          </span>
                        </button>

                        <Switch
                          checked={moduleOn}
                          onCheckedChange={() => {
                            toggleModule(module.key);
                            showModuleInPreview(module.key);
                          }}
                          aria-label={"Switch the " + module.label + " module"}
                        />
                      </div>

                      {/* --- The sections inside it --- */}
                      {isOpen && module.features.length > 0 ? (
                        <div className="flex flex-col gap-0.5 border-t p-1.5 pl-8">
                          {module.features.map((feature) => {
                            // A section of a module that is off says nothing
                            // at the moment, so its switch is dead and grey.
                            const featureOn =
                              moduleOn && isFeatureOn(feature.key);
                            const isFeatureChosen =
                              chosenFeature === feature.key;

                            return (
                              <div
                                key={feature.key}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-1 py-1 transition-colors",
                                  !moduleOn && "opacity-50",
                                  isFeatureChosen && "bg-primary/[0.07]"
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    chooseFeature(module.key, feature.key)
                                  }
                                  className="flex flex-1 flex-col items-start rounded px-1 py-0.5 text-left hover:bg-accent/50"
                                >
                                  <span className="text-sm font-medium">
                                    {feature.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {feature.page}
                                  </span>
                                </button>

                                <Switch
                                  checked={featureOn}
                                  disabled={!moduleOn}
                                  onCheckedChange={() => {
                                    toggleFeature(feature.key);
                                    chooseFeature(module.key, feature.key);
                                  }}
                                  aria-label={"Switch " + feature.label}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* ----------------------------------------------------------
                  The preview of the chosen line
                  ---------------------------------------------------------- */}
              <div className="max-h-[24rem] overflow-y-auto rounded-md border bg-muted/20 p-3">
                {previewModule ? (
                  <FeaturePreview
                    module={previewModule}
                    feature={previewFeature}
                    isOn={
                      previewFeature
                        ? isModuleOn(previewModule.key) &&
                          isFeatureOn(previewFeature.key)
                        : isModuleOn(previewModule.key)
                    }
                    isModuleOff={!isModuleOn(previewModule.key)}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
                    <MousePointerClick className="h-7 w-7 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Nothing chosen yet</p>
                    <p className="text-xs text-muted-foreground">
                      Press a module or one of its sections to see what it
                      looks like, and what this organization loses when it is
                      switched off.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={isLoading || updateModules.isPending}
          >
            {updateModules.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Save modules
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
