import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions } from "./config/cors.js";
import routes from "./modules/index.js";
import { UPLOAD_FOLDER } from "./middlewares/upload.middleware.js";
import { broadcastChanges } from "./middlewares/activity.middleware.js";
import { notifyOnChange } from "./middlewares/notification.middleware.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Read JSON body from requests.
app.use(express.json());

// Read cookies from requests.
app.use(cookieParser());

// Allow our React app to call this API and send cookies.
// The list of allowed addresses lives in config/cors.ts
app.use(cors(corsOptions));

// The pictures the employees upload are plain files on the disk.
// This line makes them readable in the browser, for example
// http://localhost:5001/uploads/employees/employee-123.jpg
app.use("/uploads", express.static(UPLOAD_FOLDER));

// A simple route to check if the server is running.
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// Every change that goes through the routes below is announced on the socket
// to the workspace it belongs to. It has to stand BEFORE the routes, because
// it only listens for the end of the answer here and speaks later.
app.use(broadcastChanges);

// And every NEW thing that is created below writes a line in the bell of the
// people who are allowed to see that module. Same idea, same place: one
// middleware instead of a call inside every controller.
app.use(notifyOnChange);

// All the real routes.
app.use("/api", routes);

// These two must stay at the end.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
