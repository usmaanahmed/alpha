import { User } from "./user.model.js";

// Login needs the password hash to compare credentials.
export async function findUserByEmail(email: string) {
  return User.findOne({ email: email });
}

// Profile responses never need the password hash.
export async function findUserProfile(userId: string | undefined) {
  return User.findById(userId).select("-password");
}
