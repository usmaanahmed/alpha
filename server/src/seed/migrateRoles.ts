import mongoose from "mongoose";
import { Role } from "../modules/role/role.model.js";
import { Employee } from "../modules/employee/employee.model.js";
import { Organization } from "../modules/organization/organization.model.js";
import { findRoleTemplate } from "../config/roleTemplates.js";
import { createDefaultRolesForOrganization } from "../utils/roleSeed.util.js";

// Before the permission module, a role was made by the SaaS owner and shared
// with every organization, so a role document had no "organization" field at
// all. Now every role belongs to one organization, so the old shared roles
// have to be moved.
//
// This runs once, by itself, when the server starts. It is safe to run it
// again: the second time there is no shared role left, so it stops on the
// first line and does nothing.
//
// What it does, organization by organization:
//   1. copy every old shared role into that organization,
//   2. give the copy the permissions of the template with the same name
//      ("Manager" keeps the rights of a manager, "HR" those of an HR),
//   3. point the employees of that organization to their own copy,
// and only when every organization is done, the old shared roles are deleted.
export async function migrateRolesToOrganizations() {
  // An old shared role is one without the organization field.
  const sharedRoles = await Role.find({
    organization: { $exists: false },
  }).lean();

  const organizations = await Organization.find().select("_id name").lean();

  if (sharedRoles.length === 0) {
    // Nothing to move. An organization created before this module started
    // may still have no role at all, so we give it the default ones.
    for (const organization of organizations) {
      await createDefaultRolesForOrganization(String(organization._id));
    }

    await dropOldRoleNameIndex();
    return;
  }

  console.log(
    "Roles: moving " +
      sharedRoles.length +
      " shared role(s) into " +
      organizations.length +
      " organization(s)..."
  );

  // The old index said "one role name in the whole database". Now two
  // organizations may both have a role called "Manager", so that index has
  // to go before we write the copies.
  await dropOldRoleNameIndex();

  for (const organization of organizations) {
    for (const sharedRole of sharedRoles) {
      // Maybe this organization already has a role with that name.
      let ownRole = await Role.findOne({
        organization: organization._id,
        name: sharedRole.name,
      });

      if (!ownRole) {
        const template = findRoleTemplate(sharedRole.name);

        ownRole = await Role.create({
          organization: organization._id,
          name: sharedRole.name,
          description: template ? template.description : "",
          // A name we know keeps the rights it always had. Any other name
          // starts with nothing, which is exactly what it could do before:
          // a "Developer" was never allowed to manage anything.
          permissions: template ? template.permissions : [],
          status: sharedRole.status,
        });
      }

      // The employees of this organization that used the shared role now
      // point to the copy of their own organization.
      await Employee.updateMany(
        { organization: organization._id, role: sharedRole._id },
        { role: ownRole._id }
      );
    }

    // A role of the template list that never existed as a shared role is
    // added too, so every organization ends up with the full starting set.
    await createDefaultRolesForOrganization(String(organization._id));
  }

  // Every employee points to a role of its own organization now, so the old
  // shared roles are not used by anybody any more.
  await Role.deleteMany({ _id: { $in: sharedRoles.map((role) => role._id) } });

  console.log("Roles: done, every role now belongs to one organization.");
}

// The old model had "unique: true" on the role name, and mongoose built an
// index called "name_1" in MongoDB for it. Mongoose never removes an index
// by itself, so we have to ask for it here, otherwise two organizations
// could not both have a role with the same name.
async function dropOldRoleNameIndex() {
  try {
    const indexes = await mongoose.connection.db
      ?.collection("roles")
      .indexes();

    const oldIndex = indexes?.find((index) => index.name === "name_1");

    if (oldIndex) {
      await mongoose.connection.db?.collection("roles").dropIndex("name_1");
      console.log("Roles: the old 'one name in the whole app' index is gone.");
    }
  } catch (error) {
    // The collection may not exist yet on a brand new database, and that is
    // fine: there is no old index to remove there.
  }
}
