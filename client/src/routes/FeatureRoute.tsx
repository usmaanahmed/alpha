import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHomePath } from "@/types/auth.types";
import { FullPageLoader } from "@/components/common/FullPageLoader";

// This component protects the pages inside it with a FEATURE of the SaaS
// owner instead of with a permission.
//
// It is the twin of PermissionRoute, for the other half of the question:
//
//   PermissionRoute -> "does MY ROLE let me open this?"
//   FeatureRoute    -> "did the SaaS owner sell this to MY ORGANIZATION?"
//
// A module that is switched off needs neither of them: the server already
// took its permissions out of my profile, so the PermissionRoute in front of
// its pages closes them by itself. This guard is only for the pieces INSIDE
// a module that is on, for example the analytics page that sits in front of
// the cheque list while the cheques themselves stay open.
//
// The menu already hides the links, but a link is not a lock: anybody can
// type an address in the bar. The server checks the very same feature a
// third time when the page asks for its data, and only that last one is the
// real protection.
// Two ways to ask, exactly like PermissionRoute has 'permission' and 'anyOf':
//   feature -> one card, one panel, one extra page inside a module
//   module  -> a whole module, for the few pages no permission protects
//              (the notification page is the one that needs it)
export function FeatureRoute(props: { feature?: string; module?: string }) {
  const { user, isLoading, hasFeature, hasModule } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but this organization does not have this piece of the app,
  // so we send them back to their own first page instead of showing an
  // empty screen.
  const isAllowed = props.module
    ? hasModule(props.module)
    : hasFeature(props.feature || "");

  if (!isAllowed) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return <Outlet />;
}
