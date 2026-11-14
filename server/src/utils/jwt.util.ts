import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// This is the information we keep inside the token.
// employeeId is filled only when an employee (or a manager) logs in,
// so the server always knows which employee document is talking to it.
export interface TokenPayload {
  userId: string;
  role: "saas_owner" | "organization" | "employee";
  organizationId: string | null;
  employeeId: string | null;
}

// Create a token when a user logs in.
export function createToken(payload: TokenPayload) {
  const options = { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions;
  const token = jwt.sign(payload, env.JWT_SECRET, options);
  return token;
}

// Read a token and get the information back from it.
// If the token is wrong or expired, jwt.verify will throw an error.
export function verifyToken(token: string) {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  return decoded;
}
