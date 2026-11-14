import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHomePath } from "@/types/auth.types";
import { FullPageLoader } from "@/components/common/FullPageLoader";

// This component protects the pages inside it with a permission instead of
// with a kind of account.
//
// The menu already hides the links somebody may not use, but a link is not a
// lock: anybody can type an address in the bar. So the pages are guarded here
// as well, and the server checks the very same permission a third time when
// the page asks for its data. Only that last one is the real protection.
//
// anyOf is used for a page that has more than one reason to be open, for
// example the attendance page: reading everybody's days, or fixing one.
//
// allowTeamLead opens the page for the head of a team as well. Being a team
// lead is not a permission and never will be (see the team module), so it
// cannot be written as one more entry in anyOf: it is its own reason.
export function PermissionRoute(props: {
  permission?: string;
  anyOf?: string[];
  allowTeamLead?: boolean;
}) {
  const { user, isLoading, can, canAny } = useAuth();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasPermission = props.anyOf
    ? canAny(props.anyOf)
    : can(props.permission || "");

  const isAllowed =
    hasPermission || (props.allowTeamLead === true && user.isTeamLead === true);

  // Logged in, but this page is not for this person, so we send them back to
  // their own first page instead of showing an empty screen.
  if (!isAllowed) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return <Outlet />;
}
