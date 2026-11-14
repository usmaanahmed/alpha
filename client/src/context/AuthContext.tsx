import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyProfileRequest } from "@/api/auth.api";
import type { AuthUser } from "@/types/auth.types";

// What we share with the whole app.
//
// can("employees.create") is the question every page asks before it shows a
// button. It reads the permissions the server put in the profile, so the
// answer is always the same one the server will give when the button is
// really pressed.
// hasModule("cheques") and hasFeature("cheques.reminders") are the second
// question, next to can(): not "may I do this?" but "did the SaaS owner sell
// this to my organization at all?". A page asks it before it draws a card
// the owner switched off.
interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  hasModule: (moduleKey: string) => boolean;
  hasFeature: (featureKey: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  can: () => false,
  canAny: () => false,
  hasModule: () => false,
  hasFeature: () => false,
});

// This provider asks the server "who am I?" one time when the app opens.
// The login token lives in an httpOnly cookie, so this is the only way
// for the React app to know the logged in user.
export function AuthProvider(props: { children: React.ReactNode }) {
  // The value can also be null, that means "nobody is logged in".
  const profileQuery = useQuery<AuthUser | null>({
    queryKey: ["my-profile"],
    queryFn: getMyProfileRequest,
    // Do not retry, because a 401 answer simply means "not logged in".
    retry: false,
  });

  const user = profileQuery.data || null;
  const permissions = user?.permissions || [];
  // What the SaaS owner switched on for this organization. Both lists
  // already hold only the things that are ON, so the question is always
  // simply "is the key in there".
  const modules = user?.modules || [];
  const features = user?.features || [];

  const value = {
    user: user,
    isLoading: profileQuery.isLoading,
    can: (permission: string) => permissions.includes(permission),
    canAny: (wanted: string[]) =>
      wanted.some((permission) => permissions.includes(permission)),
    hasModule: (moduleKey: string) => modules.includes(moduleKey),
    hasFeature: (featureKey: string) => features.includes(featureKey),
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

// Small hook so pages can write: const { user, can } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
