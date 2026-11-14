import axios from "axios";

// One axios instance for the whole app.
// withCredentials: true is important, it makes the browser
// send and receive the httpOnly login cookie.
export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

// The server always answers with { success, message, data }.
// This helper reads the error message from the server response.
export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error) && error.response) {
    return error.response.data?.message || "Something went wrong";
  }
  return "Cannot connect to the server";
}
