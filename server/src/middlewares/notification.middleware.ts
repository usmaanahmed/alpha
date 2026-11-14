import type { Request, Response, NextFunction } from "express";
import { notifyCreated, notifyChanged } from "../utils/notification.util.js";
import {
  NOTIFICATION_MODULES,
  WRITTEN_BY_HAND,
} from "../config/notificationModules.js";

// This middleware is the one place that turns "somebody added, changed or
// removed something" into a notification, for EVERY module of the app at
// once.
//
// It is the twin of activity.middleware.ts, and it works the same way: it
// sits in front of the routes and waits for the answer to leave. The
// difference is who listens. The activity message moves the lists of every
// open screen; this one writes a real line in somebody's bell.
//
// Doing it here instead of inside the controllers is on purpose: a new module
// gets its three lines (added, changed, removed) the day it is added to the
// table in config/notificationModules.ts, and nobody has to remember
// anything.
//
// What it can NOT do is say more than "a cheque was updated". Everything
// that needs a real sentence — who received the task, who was taken out of
// the team, who accepted the invitation — is written by hand in its own
// controller, and those modules are listed in WRITTEN_BY_HAND.

// Does this piece of the address look like the id of a record?
//
// This is what keeps "PUT /api/leaves/policy" from being read as "the leave
// request called policy was updated". Mongo writes an id as 24 letters and
// digits, and no route of this app has a fixed word that looks like that.
function looksLikeAnId(piece: string) {
  return /^[0-9a-f]{24}$/i.test(piece);
}

// Is this request "the creation of one new thing"?
//
// It is, when the address is exactly /api/<module> and nothing more. That one
// rule keeps every real create ("POST /api/cheques") and quietly leaves out
// everything else that is also a POST but is not a new record:
//   POST /api/attendance/check-in     -> arriving at work
//   POST /api/tasks/:id/comments      -> a comment inside a task
//   POST /api/cheques/:id/scan        -> a picture added to a cheque
//   POST /api/auth/login              -> not a module at all
function moduleOfRequest(method: string, url: string) {
  // "/api/cheques?year=2026" -> "/api/cheques"
  const path = url.split("?")[0];

  // -> ["api", "cheques"]. The filter throws away the empty pieces the
  // slashes leave behind.
  const pieces = path.split("/").filter((piece) => piece !== "");

  // Everything is mounted under "/api", but we do not rely on it.
  const withoutApi = pieces[0] === "api" ? pieces.slice(1) : pieces;

  // A create is exactly /api/<module>: one piece, no id behind it.
  const isCreate = method === "POST" && withoutApi.length === 1;

  // An edit and a delete are exactly /api/<module>/<id>: two pieces, and the
  // second one really is an id.
  const isChange =
    (method === "PUT" || method === "DELETE") &&
    withoutApi.length === 2 &&
    looksLikeAnId(withoutApi[1]);

  if (!isCreate && !isChange) {
    return "";
  }

  const name = withoutApi[0];

  if (!NOTIFICATION_MODULES[name]) {
    return "";
  }

  // Tasks and meetings write their own, better sentence inside their
  // controller, so this middleware stays out of their way.
  if (WRITTEN_BY_HAND.includes(name)) {
    return "";
  }

  return name;
}

export function notifyOnChange(req: Request, res: Response, next: NextFunction) {
  // Only these three change a record. A GET and a PATCH leave at once: a GET
  // changes nothing, and every PATCH of this app is a small special action
  // (a status, a scan, an answer) that writes its own sentence.
  const changes =
    req.method === "POST" || req.method === "PUT" || req.method === "DELETE";

  if (!changes) {
    return next();
  }

  const moduleName = moduleOfRequest(req.method, req.originalUrl);

  if (!moduleName) {
    return next();
  }

  // "finish" happens once the answer has left the server. We wait for it on
  // purpose, because only then do we know three things:
  // - the status code, so a request that failed tells nobody anything,
  // - req.user, which the login middleware writes while the route is being
  //   handled, that is, after this line but before the answer is sent,
  // - req.body. A form with a picture in it does not arrive as JSON but as a
  //   multipart form, and multer only puts its fields on req.body once the
  //   route runs. Reading the form here instead of above is what lets the
  //   employee lines quote a name at all.
  res.on("finish", () => {
    const body = req.body;

    const worked = res.statusCode >= 200 && res.statusCode < 300;

    if (!worked) {
      return;
    }

    const organizationId = req.user?.organizationId;
    const actorUserId = req.user?.userId;

    // No workspace and no person means there is nobody to tell: this is the
    // saas owner, or a request that was refused before the login middleware
    // even ran.
    if (!organizationId || !actorUserId) {
      return;
    }

    // The answer is already on its way to the browser, so the writing below
    // happens after it and cannot slow it down or break it. That also means
    // nobody is left to catch an error here, so we catch it ourselves: a
    // notification that fails must never take the whole server with it.
    const writing =
      req.method === "POST"
        ? notifyCreated({
            organizationId: String(organizationId),
            module: moduleName,
            actorUserId: String(actorUserId),
            body: body,
          })
        : notifyChanged({
            organizationId: String(organizationId),
            module: moduleName,
            actorUserId: String(actorUserId),
            body: body,
            wasDeleted: req.method === "DELETE",
          });

    writing.catch((error) => {
      console.log("Could not write the notification:", error);
    });
  });

  next();
}
