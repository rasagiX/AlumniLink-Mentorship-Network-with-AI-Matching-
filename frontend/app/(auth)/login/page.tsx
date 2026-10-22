"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Compass, AlertCircle, Info, GraduationCap,
  Users, LogIn, CheckCircle2, Clock, Loader2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------
type Section = "login" | "student" | "alumni";

const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  mentor:  "/alumni/dashboard",
  admin:   "/admin/dashboard",
};

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginValues = z.infer<typeof loginSchema>;

const studentSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type StudentValues = z.infer<typeof studentSchema>;

const alumniSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
  title: z.string().optional(),
  company: z.string().optional(),
  domain: z.string().optional(),
  linkedin_url: z.string().url("Enter a valid LinkedIn URL").optional().or(z.literal("")),
});
type AlumniValues = z.infer<typeof alumniSchema>;

// ---------------------------------------------------------------------------
// Error / info banner
// ---------------------------------------------------------------------------
function Banner({ message, type = "error" }: { message: string; type?: "error" | "info" | "success" }) {
  const styles = {
    error:   "border-danger/30 bg-danger/[0.08] text-danger",
    info:    "border-warning/30 bg-warning/[0.08] text-warning",
    success: "border-success/30 bg-success/[0.06] text-success",
  };
  const Icon = type === "success" ? CheckCircle2 : type === "info" ? Info : AlertCircle;
  return (
    <div className={cn("mb-4 flex items-start gap-2 rounded-sm border px-3 py-2.5 text-sm", styles[type])}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section tab button
// ---------------------------------------------------------------------------
function SectionTab({
  id, active, icon: Icon, label, onClick,
}: {
  id: Section; active: boolean; icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-sm px-3 py-3 text-xs font-medium transition-colors",
        active ? "bg-ink text-paper" : "text-muted hover:text-ink"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Google icon
// ---------------------------------------------------------------------------
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AuthPage() {
  const [section, setSection] = React.useState<Section>("login");
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const router = useRouter();

  const loginForm    = useForm<LoginValues>   ({ resolver: zodResolver(loginSchema)   });
  const studentForm  = useForm<StudentValues> ({ resolver: zodResolver(studentSchema) });
  const alumniForm   = useForm<AlumniValues>  ({ resolver: zodResolver(alumniSchema)  });

  const clearMessages = () => { setServerError(null); setSuccessMsg(null); };

  const afterAuth = (role: Role) => {
    router.push(ROLE_HOME[role]);
    router.refresh();
  };

  // ── Login ──
  const onLogin = async (values: LoginValues) => {
    clearMessages();
    const res  = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Something went wrong."); return; }
    afterAuth(data.user.role as Role);
  };

  // ── Register student ──
  const onRegisterStudent = async (values: StudentValues) => {
    clearMessages();
    const { confirmPassword: _, ...payload } = values;
    const res  = await fetch("/api/auth/register/student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Registration failed."); return; }
    // New students go to onboarding to set their year
    router.push("/onboarding");
    router.refresh();
  };

  // ── Register alumni (pending approval) ──
  const onRegisterAlumni = async (values: AlumniValues) => {
    clearMessages();
    const payload = { ...values, linkedin_url: values.linkedin_url || undefined };
    const res  = await fetch("/api/auth/register/alumni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Submission failed."); return; }
    setSuccessMsg("Your application has been submitted! An admin will review it shortly. You'll be able to log in once approved.");
    alumniForm.reset();
  };

  const switchSection = (s: Section) => { setSection(s); clearMessages(); };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <Compass className="h-5 w-5" />
          <span className="font-display text-lg font-medium">AlumniLink</span>
        </Link>

        <Card>
          <CardContent className="p-6">
            {/* 3-section tab bar */}
            <div className="mb-6 flex gap-1 rounded-sm border border-line p-1">
              <SectionTab id="login"   active={section === "login"}   icon={LogIn}         label="Sign In"          onClick={() => switchSection("login")} />
              <SectionTab id="student" active={section === "student"} icon={GraduationCap} label="Join as Student"  onClick={() => switchSection("student")} />
              <SectionTab id="alumni"  active={section === "alumni"}  icon={Users}         label="Join as Alumni"   onClick={() => switchSection("alumni")} />
            </div>

            {serverError && <Banner message={serverError} type="error" />}
            {successMsg  && <Banner message={successMsg}  type="success" />}

            {/* ══ LOGIN ══ */}
            {section === "login" && (
              <>
                {/* Google */}
                <button
                  type="button"
                  onClick={() => { setGoogleLoading(true); window.location.href = "/api/auth/google"; }}
                  disabled={googleLoading}
                  className="mb-4 flex w-full items-center justify-center gap-3 rounded-sm border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-ink/[0.04] disabled:cursor-wait disabled:opacity-60"
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : <GoogleIcon />}
                  {googleLoading ? "Redirecting…" : "Continue with Google"}
                </button>

                <div className="mb-4 flex items-center gap-3 text-xs text-muted">
                  <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
                </div>

                <form onSubmit={loginForm.handleSubmit(onLogin)} noValidate className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@college.edu" autoComplete="email" {...loginForm.register("email")} />
                    {loginForm.formState.errors.email && <p className="mt-1 text-xs text-danger">{loginForm.formState.errors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...loginForm.register("password")} />
                    {loginForm.formState.errors.password && <p className="mt-1 text-xs text-danger">{loginForm.formState.errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loginForm.formState.isSubmitting}>
                    {loginForm.formState.isSubmitting ? "Signing in…" : "Sign In"}
                  </Button>
                </form>
              </>
            )}

            {/* ══ STUDENT REGISTER ══ */}
            {section === "student" && (
              <form onSubmit={studentForm.handleSubmit(onRegisterStudent)} noValidate className="space-y-4">
                <div className="flex items-start gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 text-xs text-muted">
                  <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  Create a student account. You'll set your academic year in the next step.
                </div>

                <div>
                  <Label htmlFor="s-name">Full name</Label>
                  <Input id="s-name" placeholder="Jordan Alvarez" autoComplete="name" {...studentForm.register("name")} />
                  {studentForm.formState.errors.name && <p className="mt-1 text-xs text-danger">{studentForm.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="s-email">College email</Label>
                  <Input id="s-email" type="email" placeholder="you@college.edu" autoComplete="email" {...studentForm.register("email")} />
                  {studentForm.formState.errors.email && <p className="mt-1 text-xs text-danger">{studentForm.formState.errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="s-password">Password</Label>
                  <Input id="s-password" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...studentForm.register("password")} />
                  {studentForm.formState.errors.password && <p className="mt-1 text-xs text-danger">{studentForm.formState.errors.password.message}</p>}
                </div>
                <div>
                  <Label htmlFor="s-confirm">Confirm password</Label>
                  <Input id="s-confirm" type="password" placeholder="••••••••" {...studentForm.register("confirmPassword")} />
                  {studentForm.formState.errors.confirmPassword && <p className="mt-1 text-xs text-danger">{studentForm.formState.errors.confirmPassword.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={studentForm.formState.isSubmitting}>
                  {studentForm.formState.isSubmitting ? "Creating account…" : "Create Student Account"}
                </Button>
              </form>
            )}

            {/* ══ ALUMNI REGISTER ══ */}
            {section === "alumni" && (
              <form onSubmit={alumniForm.handleSubmit(onRegisterAlumni)} noValidate className="space-y-4">
                <div className="flex items-start gap-2 rounded-sm border border-accent/30 bg-accent/[0.06] px-3 py-2.5 text-xs text-muted">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>
                    Alumni accounts require admin approval. Submit your details below — you'll be able to
                    log in once your application is reviewed.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label htmlFor="a-name">Full name</Label>
                    <Input id="a-name" placeholder="Arjun Mehta" autoComplete="name" {...alumniForm.register("name")} />
                    {alumniForm.formState.errors.name && <p className="mt-1 text-xs text-danger">{alumniForm.formState.errors.name.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="a-email">Email</Label>
                    <Input id="a-email" type="email" placeholder="you@company.com" autoComplete="email" {...alumniForm.register("email")} />
                    {alumniForm.formState.errors.email && <p className="mt-1 text-xs text-danger">{alumniForm.formState.errors.email.message}</p>}
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="a-password">Choose a password</Label>
                    <Input id="a-password" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...alumniForm.register("password")} />
                    {alumniForm.formState.errors.password && <p className="mt-1 text-xs text-danger">{alumniForm.formState.errors.password.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="a-title">Job title <span className="text-xs font-normal text-muted">(optional)</span></Label>
                    <Input id="a-title" placeholder="Senior Engineer" {...alumniForm.register("title")} />
                  </div>
                  <div>
                    <Label htmlFor="a-company">Company <span className="text-xs font-normal text-muted">(optional)</span></Label>
                    <Input id="a-company" placeholder="Google" {...alumniForm.register("company")} />
                  </div>
                  <div>
                    <Label htmlFor="a-domain">Domain <span className="text-xs font-normal text-muted">(optional)</span></Label>
                    <Input id="a-domain" placeholder="Software Engineering" {...alumniForm.register("domain")} />
                  </div>
                  <div>
                    <Label htmlFor="a-linkedin">LinkedIn <span className="text-xs font-normal text-muted">(optional)</span></Label>
                    <Input id="a-linkedin" type="url" placeholder="https://linkedin.com/in/…" {...alumniForm.register("linkedin_url")} />
                    {alumniForm.formState.errors.linkedin_url && <p className="mt-1 text-xs text-danger">{alumniForm.formState.errors.linkedin_url.message}</p>}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={alumniForm.formState.isSubmitting}>
                  {alumniForm.formState.isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</> : "Submit Application"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted">
          Already have an account?{" "}
          <button type="button" onClick={() => switchSection("login")} className="underline underline-offset-2 hover:text-ink">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
