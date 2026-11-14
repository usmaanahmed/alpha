import { axiosClient } from "./axiosClient";
import type { AuthUser } from "@/types/auth.types";

export interface LoginValues {
  email: string;
  password: string;
}

// Send the email and password to the server.
export async function loginRequest(values: LoginValues) {
  const response = await axiosClient.post("/auth/login", values);
  return response.data.data as AuthUser;
}

// Ask the server who is logged in right now.
export async function getMyProfileRequest() {
  const response = await axiosClient.get("/auth/me");
  return response.data.data as AuthUser;
}

// Tell the server to delete the login cookie.
export async function logoutRequest() {
  const response = await axiosClient.post("/auth/logout");
  return response.data;
}
