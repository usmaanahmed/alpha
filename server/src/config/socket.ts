import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { corsOptions } from "./cors.js";
import { verifyToken } from "../utils/jwt.util.js";
import { AUTH_COOKIE_NAME } from "../utils/cookie.util.js";

// The socket server.
//
// A normal request is one question and one answer: the browser asks, the
// server answers, and the line is closed. A socket is different, it is a
// line that STAYS open. So when something happens on the server we can
// write on that line and the browser hears it at once, without asking and
// without the user pressing F5.
//
// We keep the server in this variable so any controller can call
// sendToUser() later, from anywhere in the app.
let io: Server | null = null;

// The first part of the name of a workspace room, see the connection handler
// below.
const ORGANIZATION_ROOM_PREFIX = "org:";

// The browser cannot put our login token in a header, because the token
// lives in an httpOnly cookie that JavaScript is not allowed to read. But
// the browser DOES send that cookie by itself when the socket connects, so
// we read it here from the raw cookie line, which looks like:
// "theme=dark; token=eyJhbGci...; other=1"
function readTokenFromCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return "";
  }

  const pieces = cookieHeader.split(";");

  for (const piece of pieces) {
    // "token=eyJhbGci..." -> name "token", value "eyJhbGci..."
    // The value itself can contain "=", so we cut only on the FIRST one.
    const equalsAt = piece.indexOf("=");

    if (equalsAt === -1) {
      continue;
    }

    const name = piece.slice(0, equalsAt).trim();
    const value = piece.slice(equalsAt + 1).trim();

    if (name === AUTH_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }

  return "";
}

// Called once when the server starts, from server.ts.
export function startSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    // The same rules as the cors() of app.ts: only our React app may
    // connect, and it is allowed to send the login cookie with it.
    cors: corsOptions,
  });

  // This runs before a connection is accepted. It is the socket version of
  // the requireLogin middleware: no valid token, no connection.
  io.use((socket, next) => {
    const token = readTokenFromCookies(socket.handshake.headers.cookie);

    if (!token) {
      return next(new Error("You are not logged in"));
    }

    try {
      const decoded = verifyToken(token);
      // socket.data is a small box that travels with this one connection,
      // so below we still know who is on the other end of the line.
      socket.data.userId = decoded.userId;
      // The workspace this person belongs to. The saas owner has none, so
      // this one can be null.
      socket.data.organizationId = decoded.organizationId;
      next();
    } catch (error) {
      next(new Error("Your session is not valid, please login again"));
    }
  });

  io.on("connection", (socket) => {
    // A "room" is just a label on a connection. We label every connection
    // with the id of the user, so sending a message to one person means
    // sending it to their room. The same person can be logged in on their
    // laptop and on their phone: both connections carry the same label, so
    // both screens light up together.
    const userId = String(socket.data.userId);
    socket.join(userId);

    // A second label, this time with the workspace. Some news is not for one
    // person but for everybody in the company ("a task was created", "a
    // leave was approved"), and that is what this room is for.
    //
    // The name starts with "org:" so it can never be mistaken for the room
    // of a user, whose name is a plain id.
    if (socket.data.organizationId) {
      socket.join(ORGANIZATION_ROOM_PREFIX + socket.data.organizationId);
    }
  });

  console.log("Socket server is ready");
}

// Push one message to every open tab of one user.
//
// If the user is not connected right now nothing happens here, and that is
// fine: the notification is already saved in the database, so they will
// see it the next time they open the app.
export function sendToUser(userId: string, event: string, payload: unknown) {
  if (!io) {
    return;
  }

  io.to(String(userId)).emit(event, payload);
}

// Push one message to everybody of one workspace: the organization account
// and every employee of it, on every tab they have open.
//
// This is what makes a screen move when SOMEBODY ELSE changes something. The
// activity timeline of the dashboard listens to it, so a task created by a
// manager appears on the owner's screen while they are looking at it.
export function sendToOrganization(
  organizationId: string,
  event: string,
  payload: unknown
) {
  if (!io) {
    return;
  }

  io.to(ORGANIZATION_ROOM_PREFIX + String(organizationId)).emit(event, payload);
}
