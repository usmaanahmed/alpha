import mongoose from "mongoose";
import { env } from "./env.js";

// This function connects our app to MongoDB.
export async function connectDatabase() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB connection failed");
    console.log(error);
    // If we cannot connect to the database, stop the server.
    process.exit(1);
  }
}
