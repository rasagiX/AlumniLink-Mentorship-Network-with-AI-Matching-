"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Compass, AlertCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  mentor: "/alumni/dashboard",
  admin: "/admin/dashboard",
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "mentor"], {
    errorMap: () => ({ message: "Choose a role" }),
  }),
});
type RegisterValues = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ErrorBanner({ message }: { message: string }) {
  // Detect the "contact admin" class of messages and render them with a
  // slightly different tone so users understand what to do next.
  const isAdminContact =
    message.toLowerCase().includes("contact") &&
    message.toLowerCase().includes("admin");

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-2 rounded-sm border px-3 py-2 text-sm",
        isAdminContact
          ? "border-warning/30 bg-warning/[0.08] text-warning"
          : "border-danger/30 bg-danger/[0.08] text-danger"
      )}
    >
      {isAdminContact ? (
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LoginPage() {
  const [mode, setMode] = React.useState<"signin" | "register">("signin");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const afterAuth = (role: Role) => {
    router.push(ROLE_HOME[role]);
    router.refresh();
  };

  const onSignIn = async (values: LoginValues) => {
    setServerError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    afterAuth(data.user.role);
  };

  const onRegister = async (values: RegisterValues) => {
    setServerError(null);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data.error ?? "Something went wrong.");
      return;
    }
    afterAuth(data.user.role);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Compass className="h-5 w-5" />
          <span className="font-display text-lg font-medium">AlumniLink</span>
        </Link>

        <Card>
          <CardContent className="p-6">
            {/* Tab switcher */}
            <div className="mb-6 grid grid-cols-2 rounded-sm border border-line p-1 text-sm">
              <button
                type="button"
                onClick={() => { setMode("signin"); setServerError(null); }}
                className={cn(
                  "rounded-sm py-2 font-medium transition-colors",
                  mode === "signin" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setServerError(null); }}
                className={cn(
                  "rounded-sm py-2 font-medium transition-colors",
                  mode === "register" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                )}
              >
                Register
              </button>
            </div>

            {/* Error / info banner */}
            {serverError && <ErrorBanner message={serverError} />}

            {/* Sign-in form */}
            {mode === "signin" ? (
              <form onSubmit={loginForm.handleSubmit(onSignIn)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="email">Institutional email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@alumnilink.edu"
                    autoComplete="email"
                    {...loginForm.register("email")}
                    aria-invalid={!!loginForm.formState.errors.email}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-danger">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...loginForm.register("password")}
                    aria-invalid={!!loginForm.formState.errors.password}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-danger">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                  {loginForm.formState.isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
              </form>
            ) : (
              /* Register form */
              <form onSubmit={registerForm.handleSubmit(onRegister)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    placeholder="Jordan Alvarez"
                    autoComplete="name"
                    {...registerForm.register("name")}
                  />
                  {registerForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-email">Institutional email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@alumnilink.edu"
                    autoComplete="email"
                    {...registerForm.register("email")}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role">I am registering as a…</Label>
                  <Select
                    onValueChange={(v) =>
                      registerForm.setValue("role", v as "student" | "mentor", { shouldValidate: true })
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="mentor">Alumni Mentor</SelectItem>
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.role && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.role.message}</p>
                  )}
                </div>

                {/* Mentor registration hint */}
                <div className="flex items-start gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-xs text-muted">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>
                    Alumni mentors must be approved by an admin before registering. If your email
                    is not yet on the approved roster, contact your institution&apos;s admin to be added.
                  </span>
                </div>

                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? "Creating account…" : "Create Account"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Only registered alumni on the approved roster can sign in as mentors.
          <br />
          Contact your institution&apos;s admin if you believe you should have access.
        </p>
      </div>
    </div>
  );
}
