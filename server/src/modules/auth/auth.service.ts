import * as userRepository from "../user/user.repository.js";
import * as authRepository from "./auth.repository.js";
import type { LoginInput } from "./auth.types.js";
import type { UserDocument } from "../user/user.model.js";
import { comparePassword } from "../../utils/password.util.js";
import { createToken } from "../../utils/jwt.util.js";
import { isTeamLeadEmployee, isInAnyTeam } from "../../utils/team.util.js";
import { readRolePermissions } from "../../utils/currentUser.util.js";
import { ALL_PERMISSIONS } from "../../config/permissions.js";
import {
  readOrganizationSwitches,
  filterPermissionsByModules,
  enabledModuleKeys,
  enabledFeatureKeys,
  EVERYTHING_ON,
} from "../../utils/moduleAccess.util.js";

// Both the login route and the "who am I" route send back the same object,
// so we build it in one place.
//
// The important field is "permissions": the array of everything this person
// may do, for example ["tasks.assign", "leaves.approve"]. The React app draws
// its menu and hides its buttons from that array, and the server checks the
// very same array again on every request.
async function buildProfile(user: UserDocument) {
  let organizationName = null;
  if (user.organization) {
    const organization = await authRepository.findOrganization(String(user.organization));
    if (organization) {
      organizationName = organization.name;
    }
  }
  let employeeId = null;
  let departmentName = null;
  let roleName = null;
  // Everything this person may do. An organization account owns its whole
  // tenant, so it gets the full list without asking any role.
  let permissions: string[] = [];
  if (user.role === "organization") {
    permissions = ALL_PERMISSIONS;
  }
  // A team lead is not a role: it is the employee the organization put at
  // the head of a team, so this answer comes from the team list.
  // isInTeam is the softer question "am I in a team at all", and it is what
  // shows the "My Team" link to a normal member too.
  let isTeamLead = false;
  let isInTeam = false;
  // The file name of the profile picture. Only an employee has one, so a
  // saas owner and an organization keep the empty text and the React side
  // draws the letters of their name instead.
  let photo = "";
  if (user.role === "employee" && user.employee) {
    const employee = await authRepository.findEmployeeProfile(String(user.employee));
    if (employee) {
      employeeId = String(employee._id);
      // After populate these two fields are full documents, not ids.
      departmentName = employee.department?.name || null;
      roleName = employee.role?.name || null;
      permissions = readRolePermissions(employee.role);
      photo = employee.photo || "";
      isTeamLead = await isTeamLeadEmployee(String(user.organization), String(employee._id));
      // A lead is of course in a team, so we only have to ask when they
      // are not one.
      isInTeam = true;
      if (!isTeamLead) {
        isInTeam = await isInAnyTeam(String(user.organization), String(employee._id));
      }
    }
  }
  // What the SaaS owner sold to this organization.
  //
  // The SaaS owner is not inside any organization, so nothing was ever
  // switched off for them and they keep the whole app.
  const switches = user.role === "saas_owner"
    ? EVERYTHING_ON
    : await readOrganizationSwitches(user.organization ? String(user.organization) : null);
  // The permissions of a switched off module are dropped right here, at the
  // one door every page walks through. That is what makes a module vanish
  // from the menu, from the routes and from the buttons in one go, without a
  // single "is this module on?" written inside a page.
  const allowedPermissions = filterPermissionsByModules(permissions, switches);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    organizationId: user.organization ? String(user.organization) : null,
    organizationName: organizationName,
    employeeId: employeeId,
    departmentName: departmentName,
    roleName: roleName,
    permissions: allowedPermissions,
    // The modules that are on, for the few links that no permission
    // protects: "My Tasks", "My Leaves", the bell. Every employee has them,
    // so there is no permission to drop and only the module key closes them.
    modules: enabledModuleKeys(switches),
    // The cards, the panels and the extra pages that are on.
    features: enabledFeatureKeys(switches),
    isTeamLead: isTeamLead,
    isInTeam: isInTeam,
    photo: photo,
  };
}

// POST /api/auth/login
// The saas owner, an organization and an employee all login from here.
export async function login(input: LoginInput) {
  const email = input.email;
  const password = input.password;
  // 1. Find the user by email.
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    return {
      status: "unauthorized",
      message: "Invalid email or password",
    };
  }
  // 2. Check if this account was blocked.
  if (user.isActive === false) {
    return {
      status: "forbidden",
      message: "Your account is blocked, please contact your administrator",
    };
  }
  // 3. Compare the typed password with the hashed password.
  const isPasswordCorrect = await comparePassword(password, user.password);
  if (!isPasswordCorrect) {
    return {
      status: "unauthorized",
      message: "Invalid email or password",
    };
  }
  // 4. An organization account and an employee account both belong to
  //    an organization, and that organization must still be active.
  if (user.organization) {
    const organization = await authRepository.findOrganization(String(user.organization));
    if (!organization) {
      return {
        status: "not_found",
        message: "Organization not found",
      };
    }
    if (organization.status === "inactive") {
      return {
        status: "forbidden",
        message: "Your organization is inactive, please contact the SaaS owner",
      };
    }
  }
  // 5. An employee can login only while the employee row is active.
  if (user.role === "employee") {
    const employee = await authRepository.findEmployee(user.employee ? String(user.employee) : null);
    if (!employee) {
      return {
        status: "not_found",
        message: "Employee not found",
      };
    }
    if (employee.status === "inactive") {
      return {
        status: "forbidden",
        message: "Your account is inactive, please contact your organization",
      };
    }
  }
  // 6. Create the token and put it inside an httpOnly cookie.
  const token = createToken({
    userId: String(user._id),
    role: user.role,
    organizationId: user.organization ? String(user.organization) : null,
    employeeId: user.employee ? String(user.employee) : null,
  });
  // 7. Send the user info back (never send the password).
  const profile = await buildProfile(user);
  return {
    status: "success",
    message: "Login successful",
    token: token,
    data: profile,
  };
}

// GET /api/auth/me
// The frontend calls this on page load to know who is logged in.
export async function getMyProfile(userId: string | undefined) {
  const user = await userRepository.findUserProfile(userId);
  if (!user) {
    return {
      status: "not_found",
      message: "User not found",
    };
  }
  const profile = await buildProfile(user);
  return {
    status: "success",
    data: profile,
  };
}
