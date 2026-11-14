import type { TokenPayload } from "../utils/jwt.util.js";
import type { ModuleSwitches } from "../utils/moduleAccess.util.js";

// We tell TypeScript that our Express request can also have a "user" field.
// The auth middleware puts the logged in user information there.
//
// moduleSwitches is the same idea for the modules the SaaS owner switched on
// and off for this organization: the first guard that needs them reads them
// from the database and leaves them here, so the next guard of the same
// request does not read them a second time.
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      moduleSwitches?: ModuleSwitches;
    }
  }
}

export {};
