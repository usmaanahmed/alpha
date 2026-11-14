import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDatabase } from "../config/database.js";
import { User } from "../modules/user/user.model.js";
import { hashPassword } from "../utils/password.util.js";

// Run this file with "npm run seed".
// It creates the very first SaaS owner account so you can login.
async function createSaasOwner() {
  await connectDatabase();

  const email = env.SAAS_OWNER_EMAIL.toLowerCase();

  // If the owner already exists we do nothing.
  const existingOwner = await User.findOne({ email: email });

  if (existingOwner) {
    console.log("SaaS owner already exists:", email);
    await mongoose.disconnect();
    return;
  }

  const hashedPassword = await hashPassword(env.SAAS_OWNER_PASSWORD);

  await User.create({
    name: env.SAAS_OWNER_NAME,
    email: email,
    password: hashedPassword,
    role: "saas_owner",
    organization: null,
    isActive: true,
  });

  console.log("SaaS owner created");
  console.log("Email:", email);
  console.log("Password:", env.SAAS_OWNER_PASSWORD);

  await mongoose.disconnect();
}

createSaasOwner();
