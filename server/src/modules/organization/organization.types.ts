import type mongoose from "mongoose";

export interface CreateOrganizationInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface UpdateOrganizationInput {
  name: string;
  status: "active" | "inactive";
  phone?: string;
  address?: string;
}

export interface ChangeOrganizationPasswordInput {
  password: string;
}

export interface OrganizationModulesInput {
  disabledModules: string[];
  disabledFeatures: string[];
}

export interface OrganizationIds {
  id: string;
}

// This is the shape of one organization document in MongoDB.
export interface OrganizationDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  address: string;
  status: "active" | "inactive";
  // What the SaaS owner switched OFF for this organization.
  //
  // We keep the switched off ones and not the switched on ones on purpose:
  // an empty array then means "everything is on", so an organization that
  // was created before this feature existed keeps working, and a module we
  // add to the app next month is on for everybody without touching a single
  // document in the database.
  //
  // The texts inside are the keys of config/modules.ts, for example
  // "cheques" and "cheques.reminders".
  disabledModules: string[];
  disabledFeatures: string[];
  createdAt: Date;
  updatedAt: Date;
}
