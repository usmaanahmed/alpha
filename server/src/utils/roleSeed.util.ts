import { Role } from "../modules/role/role.model.js";
import { ROLE_TEMPLATES } from "../config/roleTemplates.js";

// Give a fresh organization the roles it starts with.
//
// It is called the moment the SaaS owner creates the organization, so the
// organization can add its first employee right away instead of having to
// invent a role first. A role that already exists with the same name is
// skipped, so calling this twice never creates a double.
export async function createDefaultRolesForOrganization(organizationId: string) {
  const createdRoles = [];

  for (const template of ROLE_TEMPLATES) {
    const existingRole = await Role.findOne({
      organization: organizationId,
      name: template.name,
    });

    if (existingRole) {
      continue;
    }

    const role = await Role.create({
      organization: organizationId,
      name: template.name,
      description: template.description,
      permissions: template.permissions,
      status: "active",
    });

    createdRoles.push(role);
  }

  return createdRoles;
}
