import dotenv from "dotenv";

// Read the .env file and put the values inside process.env
dotenv.config();

// We keep all environment values in one place so it is easy to find them.
export const env = {
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/multi_tenant_oms",
  JWT_SECRET: process.env.JWT_SECRET || "please_change_this_secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  // The same thing cut into a list. CLIENT_URL may hold more than one
  // address separated by a comma, for example the laptop and the address a
  // phone on the same wifi uses:
  // CLIENT_URL=http://localhost:5173,http://192.168.1.5:5173
  CLIENT_URLS: (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one.length > 0),

  SAAS_OWNER_NAME: process.env.SAAS_OWNER_NAME || "Super Admin",
  SAAS_OWNER_EMAIL: process.env.SAAS_OWNER_EMAIL || "owner@saas.com",
  SAAS_OWNER_PASSWORD: process.env.SAAS_OWNER_PASSWORD || "Owner@12345",
};
