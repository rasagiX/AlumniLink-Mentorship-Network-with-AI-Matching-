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
  senior:  "/senior/dashboard",
  mentor:  "/alumni/dashboard",
  admin:   "/admin/dashboard",
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
  role: z.enum(["student", "senior", "mentor"], { errorMap: () => ({ message: "Choose a role" }) }),
});
type RegisterValues = z.infer<typeof registerSchema>;

function ErrorBanner({ message }: { message: string }) {
  const isAdminContact =
    message.toLowerCase().includes("contact") && message.toLowerCase().includes("admin");
  return (
    <div className={cn(
      "mb-4 flex items-start gap-2 rounded-sm border px-3 py-2 text-sm",
      isAdminContact
        ? "border-warning/30 bg-warning/[0.08] text-warning"
        : "border-danger/30 bg-danger/[0.08] text-danger"
    )}>
      {isAdminContact
        ? <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span>{message}</span>
    </div>
  );
}

/** Google "G" SVG icon — inline so there's no external dependency */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = React.useState<"signin" | "register">("signin");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
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
    if (!res.ok) { setServerError(data.error ?? "Something went wrong."); return; }
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
    if (!res.ok) { setServerError(data.error ?? "Something went wrong."); return; }
    afterAuth(data.user.role as Role);
  };

  /**
   * Google OAuth — redirects to the backend's Google OAuth flow.
   * The backend handles the callback and sets the session cookie.
   * Replace the URL with your actual OAuth provider endpoint when ready.
   */
  const onGoogleSignIn = () => {
    setGoogleLoading(true);
    // This will redirect to your OAuth provider.
    // When you implement Google OAuth on the backend, point this at:
    //   GET /api/v1/auth/google  (which redirects to Google's consent screen)
    window.location.href = "/api/auth/google";
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

            {serverError && <ErrorBanner message={serverError} />}

            {/* Google sign-in button */}
            <button
              type="button"
              onClick={onGoogleSignIn}
              disabled={googleLoading}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-sm border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-ink/[0.04] disabled:cursor-wait disabled:opacity-60"
            >
              {googleLoading ? (
                <svg className="h-4 w-4 animate-spin text-muted" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : (
                <GoogleIcon />
              )}
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div className="mb-4 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
            </div>

            {/* Sign-in form */}
            {mode === "signin" ? (
              <form onSubmit={loginForm.handleSubmit(onSignIn)} noValidate className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@alumnilink.edu"
                    autoComplete="email"
                    {...loginForm.register("email")}
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
                  <Input id="name" placeholder="Jordan Alvarez" autoComplete="name" {...registerForm.register("name")} />
                  {registerForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" placeholder="you@alumnilink.edu" autoComplete="email" {...registerForm.register("email")} />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...registerForm.register("password")} />
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="role">I am registering as a…</Label>
                  <Select onValueChange={(v) => registerForm.setValue("role", v as "student" | "senior" | "mentor", { shouldValidate: true })}>
                    <SelectTrigger id="role"><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student (Junior)</SelectItem>
                      <SelectItem value="senior">Senior Student</SelectItem>
                      <SelectItem value="mentor">Alumni Mentor</SelectItem>
                    </SelectContent>
                  </Select>
                  {registerForm.formState.errors.role && (
                    <p className="mt-1 text-xs text-danger">{registerForm.formState.errors.role.message}</p>
                  )}
                </div>
                <div className="flex items-start gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-xs text-muted">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>
                    <strong>Seniors</strong> can mentor juniors and be mentored by alumni.{" "}
                    <strong>Alumni mentors</strong> must be approved by an admin first.
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
        </p>
      </div>
    </div>
  );
}
