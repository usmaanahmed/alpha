import type { TokenPayload } from "../utils/jwt.util.js";
import type { LoggedInEmployee } from "../utils/currentUser.util.js";

// Services receive login details, not an Express request or response.
export interface ServiceActor {
  user: TokenPayload | undefined;
  employee: LoggedInEmployee | null;
}

// Only the upload metadata needed by business rules is passed to a service.
export interface UploadedFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}
