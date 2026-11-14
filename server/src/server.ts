import http from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { startSocketServer } from "./config/socket.js";
import { migrateRolesToOrganizations } from "./seed/migrateRoles.js";

// First connect to MongoDB, then start listening for requests.
async function startServer() {
  await connectDatabase();

  // Roles used to be shared by every organization. This moves the old ones
  // into their organization the first time the new server starts, and does
  // nothing on every start after that.
  await migrateRolesToOrganizations();

  // Until now app.listen() built this http server for us behind our back.
  // We build it ourselves because the socket server needs to sit on the
  // SAME server as the routes: same port, same address, two ways to talk.
  const httpServer = http.createServer(app);

  startSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log("Server is running on http://localhost:" + env.PORT);
  });
}

startServer();
