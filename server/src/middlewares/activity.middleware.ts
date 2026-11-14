import type { Request, Response, NextFunction } from "express";
import { sendToOrganization } from "../config/socket.js";

// This middleware is the one place that tells the whole workspace "something
// just changed".
//
// It sits in front of every route, so no controller has to remember to send
// anything: a request that CHANGES something (post, patch, put, delete) and
// that really worked is announced on the socket, and every open screen of
// that workspace reads its lists again by itself.
//
// The message is deliberately tiny — only the name of the module that
// changed. The browser already knows how to read that module, so sending the
// record itself would only be a second copy of the truth that could go out
// of date.

// The first piece of the address, and the name we send for it.
// "/api/leave-types/123" -> "leave-types" -> "leaveTypes"
const MODULE_OF_PATH: Record<string, string> = {
  employees: "employees",
  departments: "departments",
  teams: "teams",
  tasks: "tasks",
  meetings: "meetings",
  holidays: "holidays",
  "leave-types": "leaveTypes",
  leaves: "leaves",
  attendance: "attendance",
  cheques: "cheques",
  salaries: "salaries",
  roles: "roles",
};

// Reads the address of the request and answers which module it belongs to,
// or an empty text when it is a module nothing on a screen listens to (the
// login, the notifications, the saas owner pages).
function moduleOfUrl(url: string) {
  // "/api/tasks/64f.../status?view=all" -> "/api/tasks/64f.../status"
  const path = url.split("?")[0];

  // -> ["api", "tasks", "64f...", "status"]. The filter throws away the
  // empty pieces the leading and trailing slashes leave behind.
  const pieces = path.split("/").filter((piece) => piece !== "");

  // Everything is mounted under "/api", but we do not rely on it: if the
  // first piece is "api" the module is the second one, otherwise the first.
  const name = pieces[0] === "api" ? pieces[1] : pieces[0];

  if (!name) {
    return "";
  }

  return MODULE_OF_PATH[name] || "";
}

export function broadcastChanges(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Reading changes nothing, and reading is most of the traffic, so those
  // requests leave here at once.
  if (req.method === "GET") {
    return next();
  }

  const moduleName = moduleOfUrl(req.originalUrl);

  if (!moduleName) {
    return next();
  }

  // "finish" happens once the answer has left the server. We wait for it on
  // purpose, because only then do we know two things:
  // - the status code, so a request that failed announces nothing,
  // - req.user, which the login middleware writes while the route is being
  //   handled, that is, after this line but before the answer is sent.
  res.on("finish", () => {
    const worked = res.statusCode >= 200 && res.statusCode < 300;

    if (!worked) {
      return;
    }

    const organizationId = req.user?.organizationId;

    // No workspace, nobody to tell. This is the saas owner, or a request
    // that was refused before the login middleware ran.
    if (!organizationId) {
      return;
    }

    sendToOrganization(organizationId, "activity", {
      module: moduleName,
      at: new Date().toISOString(),
    });
  });

  next();
}
