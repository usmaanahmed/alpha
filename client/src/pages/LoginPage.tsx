import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate } from "react-router-dom";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loginSchema } from "@/validators/auth.schema";
import type { LoginFormValues } from "@/validators/auth.schema";
import { useLogin } from "@/hooks/useAuthMutations";
import { useAuth } from "@/context/AuthContext";
import { getHomePath } from "@/types/auth.types";
import { FullPageLoader } from "@/components/common/FullPageLoader";

export function LoginPage() {
  const { user, isLoading } = useAuth();
  const login = useLogin();

  // react-hook-form keeps the form values and zod checks them.
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // This runs only when the values are valid.
  function onSubmit(values: LoginFormValues) {
    login.mutate(values);
  }

  if (isLoading) {
    return <FullPageLoader />;
  }

  // If the user is already logged in, do not show the login page again.
  if (user) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Soft brand glow in the background for a modern login feel. */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-128 w-lg -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

      <Card className="relative w-full max-w-sm">
        <CardHeader className="justify-items-center text-center">
          {/* Brand mark above the title. */}
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl tracking-tight">
            Alpha Evolution
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@saas.com"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...form.register("password")}
              />
              {form.formState.errors.password ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.password.message}
                </p>
              ) : null}
            </div>

            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
