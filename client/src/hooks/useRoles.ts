import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPermissionCatalogRequest,
  getRoleTemplatesRequest,
  getRolesRequest,
  getActiveRolesRequest,
  createRoleRequest,
  updateRoleRequest,
  deleteRoleRequest,
} from "@/api/role.api";
import type { RoleValues } from "@/api/role.api";
import { getErrorMessage } from "@/api/axiosClient";

// The permission grid of the role form. It is the same list for the whole
// app and it never changes while the app is open, so we keep it for good
// instead of asking the server again on every dialog.
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ["permission-catalog"],
    queryFn: getPermissionCatalogRequest,
    staleTime: Infinity,
  });
}

// For the SaaS owner page: the roles a new organization starts with.
export function useRoleTemplates() {
  return useQuery({
    queryKey: ["role-templates"],
    queryFn: getRoleTemplatesRequest,
    staleTime: Infinity,
  });
}

// Every role of my organization.
export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: getRolesRequest,
  });
}

// For the employee form: only the active roles.
export function useActiveRoles() {
  return useQuery({
    queryKey: ["active-roles"],
    queryFn: getActiveRolesRequest,
  });
}

// After a role changes, three things on the screen are out of date: the role
// table, the dropdown of the employee form, and "who am I" — because the
// person who is logged in may have just changed their own rights, and the
// menu is built from them.
function refreshAfterRoleChange(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["roles"] });
  queryClient.invalidateQueries({ queryKey: ["active-roles"] });
  queryClient.invalidateQueries({ queryKey: ["my-profile"] });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: RoleValues) => createRoleRequest(values),
    onSuccess: () => {
      refreshAfterRoleChange(queryClient);
      toast.success("Role created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: RoleValues }) =>
      updateRoleRequest(input.id, input.values),
    onSuccess: () => {
      refreshAfterRoleChange(queryClient);
      toast.success("Role updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRoleRequest(id),
    onSuccess: () => {
      refreshAfterRoleChange(queryClient);
      toast.success("Role deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
