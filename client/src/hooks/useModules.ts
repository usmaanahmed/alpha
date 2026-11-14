import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getModuleCatalogRequest,
  getOrganizationModulesRequest,
  updateOrganizationModulesRequest,
} from "@/api/organization.api";
import type { UpdateOrganizationModulesValues } from "@/api/organization.api";
import { getErrorMessage } from "@/api/axiosClient";

// The switch board of the whole app: every module with the cards and the
// panels inside it. It never changes while the app is open, so it is read
// once and kept.
export function useModuleCatalog() {
  return useQuery({
    queryKey: ["module-catalog"],
    queryFn: getModuleCatalogRequest,
  });
}

// What is switched off for ONE organization.
//
// organizationId is null while the dialog is closed, and then the query
// simply does not run: there is nothing to read yet.
export function useOrganizationModules(organizationId: string | null) {
  return useQuery({
    queryKey: ["organization-modules", organizationId],
    queryFn: () => getOrganizationModulesRequest(organizationId as string),
    enabled: organizationId !== null,
  });
}

// Save the switch board of one organization.
export function useUpdateOrganizationModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      id: string;
      values: UpdateOrganizationModulesValues;
    }) => updateOrganizationModulesRequest(input.id, input.values),
    // The second argument is what we sent, and we need it for the id of the
    // organization whose answer has to be read again.
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({
        queryKey: ["organization-modules", input.id],
      });
      // The table shows how many modules an organization has, so it has to
      // be read again as well.
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast.success("Modules updated");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
