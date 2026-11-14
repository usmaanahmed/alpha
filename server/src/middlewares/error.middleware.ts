import type { Request, Response, NextFunction } from "express";

// This runs when no route matched the url.
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: "Route not found: " + req.originalUrl,
  });
}

// This runs when something breaks inside a route.
// Express 5 sends async errors here automatically.
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("Server error:", error);

  res.status(500).json({
    success: false,
    message: "Something went wrong on the server",
  });
}
