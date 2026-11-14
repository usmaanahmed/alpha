import type { Request } from "express";
import { Organization } from "../modules/organization/organization.model.js";
import {
  MODULE_DEFINITIONS,
  ALL_FEATURE_KEYS,
  moduleOfPermission,
  moduleOfFeature,
} from "../config/modules.js";

// Everything about "what is switched on for this organization".
//
// The SaaS owner decides it, the organization only lives with it. It is kept
// as the list of the things that are OFF, so an empty pair means "this
// organization has the whole app", which is what every organization starts
// with.
export interface ModuleSwitches {
  disabledModules: string[];
  disabledFeatures: string[];
}

// The answer for an organization that has everything. It is used for the
// SaaS owner (who is not inside any organization) and whenever an
// organization cannot be read at all: never lock somebody out because of a
// database hiccup, the permission check right after this one is the real
// lock anyway.
export const EVERYTHING_ON: ModuleSwitches = {
  disabledModules: [],
  disabledFeatures: [],
};

// Read the switches of one organization from the database.
export async function readOrganizationSwitches(
  organizationId: string | null | undefined
): Promise<ModuleSwitches> {
  if (!organizationId) {
    return EVERYTHING_ON;
  }

  const organization = await Organization.findById(organizationId).select(
    "disabledModules disabledFeatures"
  );

  if (!organization) {
    return EVERYTHING_ON;
  }

  return {
    disabledModules: organization.disabledModules || [],
    disabledFeatures: organization.disabledFeatures || [],
  };
}

// The same read, but only ONE time per request.
//
// A single request can ask the question more than once (the module guard in
// front of the route, then the permission guard behind it), and both would
// otherwise hit the database. So the first one saves the answer on the
// request object and the second one simply finds it there.
export async function getRequestSwitches(
  req: Request
): Promise<ModuleSwitches> {
  if (req.moduleSwitches) {
    return req.moduleSwitches;
  }

  const switches = await readOrganizationSwitches(req.user?.organizationId);
  req.moduleSwitches = switches;

  return switches;
}

// Is this whole module switched on for that organization?
export function isModuleOn(switches: ModuleSwitches, moduleKey: string) {
  return !switches.disabledModules.includes(moduleKey);
}

// Is this one feature switched on?
//
// Two things can turn a feature off: its own switch, or the switch of the
// module it lives in. A card inside a module that is gone is gone too, even
// when nobody ever touched the card itself.
export function isFeatureOn(switches: ModuleSwitches, featureKey: string) {
  if (switches.disabledFeatures.includes(featureKey)) {
    return false;
  }

  const moduleKey = moduleOfFeature(featureKey);

  if (moduleKey && !isModuleOn(switches, moduleKey)) {
    return false;
  }

  return true;
}

// Take away the permissions of every switched off module.
//
// This is the heart of the whole feature. The menu, the route guard and the
// buttons of the React app are ALL built from the permission array, and the
// server checks that very same array on every request. So when a module is
// switched off we simply drop its permissions here, and the module vanishes
// everywhere at once, for the organization account exactly like for an
// employee, without a single "is this module on?" written into a page.
export function filterPermissionsByModules(
  permissions: string[],
  switches: ModuleSwitches
): string[] {
  if (switches.disabledModules.length === 0) {
    return permissions;
  }

  return permissions.filter((permission) => {
    const moduleKey = moduleOfPermission(permission);

    // A permission that belongs to no module is never taken away.
    if (!moduleKey) {
      return true;
    }

    return isModuleOn(switches, moduleKey);
  });
}

// The modules that are ON for this organization, as a plain array of keys.
//
// The React app needs it for the few links that are not protected by a
// permission at all ("My Tasks", "My Leaves", the bell): they belong to a
// module, but every employee has them, so there is no permission to drop.
export function enabledModuleKeys(switches: ModuleSwitches): string[] {
  return MODULE_DEFINITIONS.map((module) => module.key).filter((moduleKey) =>
    isModuleOn(switches, moduleKey)
  );
}

// The features that are ON, as a plain array of keys. The React app hides a
// card when its key is not in this list.
export function enabledFeatureKeys(switches: ModuleSwitches): string[] {
  return ALL_FEATURE_KEYS.filter((featureKey) =>
    isFeatureOn(switches, featureKey)
  );
}
