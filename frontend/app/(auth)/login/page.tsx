"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Compass, GraduationCap, Users, ShieldCheck, AlertCircle } from "lucide-react";
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

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["student", "mentor", "admin"], { errorMap: () => ({ message: "Choose a role" }) }),
});
type RegisterValues = z.infer<typeof registerSchema>;

export default function LoginPage() {
  const [mode, setMode] = React.useState<"signin" | "register">("signin");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [demoLoading, setDemoLoading] = React.useState<Role | null>(null);
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

  const onDemo = async (role: Role) => {
    setServerError(null);
    setDemoLoading(role);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Demo login failed.");
        return;
      }
      afterAuth(role);
    } finally {
      setDemoLoading(null);
    }
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
            <div className="mb-6 grid grid-cols-2 rounded-sm border border-line p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setServerError(null);
                }}
                className={cn(
                  "rounded-sm py-2 font-medium transition-colors",
                  mode === "signin" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setServerError(null);
                }}
                className={cn(
                  "rounded-sm py-2 font-medium transition-colors",
                  mode === "register" ? "bg-ink text-paper" : "text-muted hover:text-ink"
                )}
              >
                Register
              </button>
            </div>

            {serverError && (
              <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {serverError}
              </div>
            )}

            {mode === "signin" ? (
              <form onSubmit={loginForm.handleSubmit(onSignIn)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="email">Institutional email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@alumnilink.edu"
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
              <form onSubmit={registerForm.handleSubmit(onRegister)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" placeholder="Jordan Alvarez" {...registerForm.register("name")} />
                  {registerForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-email">Institutional email</Label>
                  <Input id="reg-email" type="email" placeholder="you@alumnilink.edu" {...registerForm.register("email")} />
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
                    {...registerForm.register("password")}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role">I am registering as a…</Label>
                  <Select onValueChange={(v) => registerForm.setValue("role", v as Role, { shouldValidate: true })}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="mentor">Alumni Mentor</SelectItem>
                      <SelectItem value="admin">Institutional Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.role && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.role.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={registerForm.formState.isSubmitting}>
                  {registerForm.formState.isSubmitting ? "Creating account…" : "Create Account"}
                </Button>
              </form>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or explore instantly <span className="h-px flex-1 bg-line" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" disabled={!!demoLoading} onClick={() => onDemo("student")}>
                <GraduationCap className="h-3.5 w-3.5" /> {demoLoading === "student" ? "…" : "Student"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!!demoLoading} onClick={() => onDemo("mentor")}>
                <Users className="h-3.5 w-3.5" /> {demoLoading === "mentor" ? "…" : "Mentor"}
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={!!demoLoading} onClick={() => onDemo("admin")}>
                <ShieldCheck className="h-3.5 w-3.5" /> {demoLoading === "admin" ? "…" : "Admin"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted">
          Demo buttons sign in to seeded accounts through the real auth backend — run{" "}
          <code className="rounded-sm bg-surface px-1 py-0.5">npm run db:seed</code> once after install.
        </p>
      </div>
    </div>
  );
}
