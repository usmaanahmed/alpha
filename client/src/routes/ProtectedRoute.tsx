import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/auth.types";
import { getHomePath } from "@/types/auth.types";
import { FullPageLoader } from "@/components/common/FullPageLoader";

// This component protects the pages inside it.
// allowedRole tells which role can open those pages.
export function ProtectedRoute(props: { allowedRole: UserRole }) {
  const { user, isLoading } = useAuth();

  // We are still asking the server who is logged in.
  if (isLoading) {
    return <FullPageLoader />;
  }

  // Nobody is logged in, go to the login page.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but with the wrong role, so we send this user to its
  // own first page.
  if (user.role !== props.allowedRole) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  // Everything is fine, show the page.
  return <Outlet />;
}
