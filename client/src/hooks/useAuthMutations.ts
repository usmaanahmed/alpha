import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { loginRequest, logoutRequest } from "@/api/auth.api";
import type { LoginValues } from "@/api/auth.api";
import { getErrorMessage } from "@/api/axiosClient";
import { disconnectSocket } from "@/lib/socket";
import type { AuthUser } from "@/types/auth.types";

// Hook used by the login page.
export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (values: LoginValues) => loginRequest(values),
    onSuccess: (user: AuthUser) => {
      // Put the user directly in the cache so we do not call /auth/me again.
      queryClient.setQueryData(["my-profile"], user);
      toast.success("Welcome back, " + user.name);

      // Send the user to the right dashboard.
      if (user.role === "saas_owner") {
        navigate("/owner");
      } else {
        navigate("/organization");
      }
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Hook used by the logout button.
export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      // Set the logged in user to null so the whole app knows we are logged out.
      queryClient.setQueryData(["my-profile"], null);
      // Throw away the data that belonged to the old user.
      queryClient.removeQueries({ queryKey: ["organizations"] });
      queryClient.removeQueries({ queryKey: ["notifications"] });

      // Close the live line too. The cookie is gone now, so the next person
      // who logs in on this computer opens a new one with their own cookie
      // and never hears the notifications of the person before them.
      disconnectSocket();

      toast.success("Logged out");
      navigate("/login");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
