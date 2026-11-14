import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getOrganizationsRequest,
  createOrganizationRequest,
  updateOrganizationRequest,
  changeOrganizationPasswordRequest,
  deleteOrganizationRequest,
} from "@/api/organization.api";
import type {
  CreateOrganizationValues,
  UpdateOrganizationValues,
} from "@/api/organization.api";
import { getErrorMessage } from "@/api/axiosClient";

// Read the list of organizations.
export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizationsRequest,
  });
}

// Create one organization.
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: CreateOrganizationValues) => createOrganizationRequest(values),
    onSuccess: () => {
      // Ask react query to load the table again with the new row.
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Update one organization.
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; values: UpdateOrganizationValues }) =>
      updateOrganizationRequest(input.id, input.values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Change the password of one organization.
export function useChangeOrganizationPassword() {
  return useMutation({
    mutationFn: (input: { id: string; password: string }) =>
      changeOrganizationPasswordRequest(input.id, input.password),
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

// Delete one organization.
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteOrganizationRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Organization deleted");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
