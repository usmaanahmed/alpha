import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

// The open line to the server.
//
// axios talks to ".../api", but the socket connects to the server ITSELF,
// so we cut the "/api" off the end of the same address. That way changing
// VITE_API_URL keeps both of them pointing at the same place.
//
// VITE_API_URL is normally just "/api", which means "the same address this
// page came from". Cutting "/api" away then leaves nothing, and nothing is
// exactly what socket.io wants to hear: with no address it connects back to
// the page it is running on. That is what also makes it work on a phone.
function getServerUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || "/api";

  if (apiUrl.startsWith("/")) {
    return undefined;
  }

  if (apiUrl.endsWith("/api")) {
    // "http://localhost:5001/api" -> "http://localhost:5001"
    return apiUrl.slice(0, apiUrl.length - 4);
  }

  return apiUrl;
}

// One single socket for the whole app. It lives outside the component, so
// moving from one page to another does not open a second line.
let socket: Socket | null = null;

// Open the line (or give back the one that is already open).
//
// withCredentials: true is the same idea as in axiosClient: it tells the
// browser to send the httpOnly login cookie with the connection, and that
// cookie is how the server knows which user is on the other end.
export function connectSocket() {
  if (!socket) {
    const serverUrl = getServerUrl();

    socket = serverUrl
      ? io(serverUrl, { withCredentials: true })
      : io({ withCredentials: true });
  }

  return socket;
}

// Close the line. We call this on logout, so the next person who logs in
// on this computer opens a fresh connection with their own cookie.
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
