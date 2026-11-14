import bcrypt from "bcryptjs";

// Turn a plain password like "12345" into a long hashed string
// so we never save the real password inside the database.
export async function hashPassword(plainPassword: string) {
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(plainPassword, salt);
  return hashed;
}

// Check if the password typed by the user matches the hashed one.
export async function comparePassword(plainPassword: string, hashedPassword: string) {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
}
