import { env } from "./env.js";

// Which browsers are allowed to call this API.
//
// A browser refuses to read an answer that comes from another address than
// the page it is on, unless the server says "this one is fine". That is
// CORS, and this is the list of addresses we say yes to.
//
// When the app is opened through the Vite dev server the browser sees only
// ONE address (Vite passes /api on to us), so there is no other address to
// allow. Requests like that arrive with no "origin" at all, and those we
// simply let through.
//
// We answer "no" by saying false, never by throwing an error: a false only
// means "I do not add the permission header", the request itself still gets
// its normal answer.
export const corsOptions = {
  origin(
    origin: string | undefined,
    callback: (error: Error | null, allowed?: boolean) => void
  ) {
    if (!origin || env.CLIENT_URLS.includes(origin)) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true,
};
