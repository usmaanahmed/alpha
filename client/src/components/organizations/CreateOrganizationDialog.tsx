import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createOrganizationSchema } from "@/validators/organization.schema";
import type { CreateOrganizationFormValues } from "@/validators/organization.schema";
import { useCreateOrganization } from "@/hooks/useOrganizations";

// The SaaS owner uses this dialog to create an organization
// together with the password that organization will use to login.
export function CreateOrganizationDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const createOrganization = useCreateOrganization();

  const form = useForm<CreateOrganizationFormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
    },
  });

  function onSubmit(values: CreateOrganizationFormValues) {
    createOrganization.mutate(values, {
      onSuccess: () => {
        // Close the dialog and empty the form.
        setIsOpen(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New Organization
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            The email and password below will be used by the organization to login.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" placeholder="Acme Ltd" {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Login email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@acme.com"
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Login password</Label>
            <Input
              id="password"
              type="text"
              placeholder="At least 6 characters"
              {...form.register("password")}
            />
            {form.formState.errors.password ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" placeholder="01700000000" {...form.register("phone")} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Textarea id="address" placeholder="Dhaka" {...form.register("address")} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createOrganization.isPending}>
              {createOrganization.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
