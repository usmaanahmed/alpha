import type { Response } from "express";
import { env } from "../config/env.js";

// The name of the cookie that keeps the login token.
export const AUTH_COOKIE_NAME = "token";

// Save the token inside an httpOnly cookie.
// httpOnly means JavaScript in the browser cannot read it, which is safer.
export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
}

// Remove the cookie when the user logs out.
export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
  });
}
