// The switch board of the SaaS owner, as the server sends it.
//
// A MODULE is a whole area of the app ("Cheques"), a FEATURE is one named
// card, panel or extra page inside it ("the reminders card"). The SaaS owner
// switches both per organization, and the shapes below are exactly what
// GET /api/organizations/modules answers with.

// One switch inside a module.
export interface ModuleFeature {
  key: string;
  label: string;
  description: string;
  // Where in the app this section sits, written the way the user reads it on
  // the screen ("Cheque Dashboard"). The switch board says it out loud,
  // because "what does this take away" is really two questions: what does it
  // look like, and where was it.
  page: string;
  // Which drawing the switch board shows for this section. The drawings
  // themselves live in FeaturePreview.tsx.
  preview: string;
}

// One module of the app with everything that can be switched inside it.
export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
  // The permissions this module owns. The dialog shows their number, so the
  // SaaS owner sees how much a switch really takes away.
  permissions: string[];
  // The pages this module owns, named the way they are written in the menu.
  // Switching the module off takes exactly these pages away.
  pages: string[];
  features: ModuleFeature[];
}

// What is switched OFF for one organization.
//
// Off and not on, on purpose: an empty pair means "this organization has
// everything", so a module we add to the app next month is on for everybody
// without touching a single document in the database.
export interface OrganizationModules {
  organizationId: string;
  organizationName: string;
  disabledModules: string[];
  disabledFeatures: string[];
}
