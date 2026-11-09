"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle, Info, GraduationCap, Users, LogIn,
  CheckCircle2, Clock, Loader2, Zap, ArrowRight,
  BookOpen, Star, Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────
type Section = "login" | "student" | "alumni";

const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  senior:  "/senior/dashboard",
  mentor:  "/alumni/dashboard",
  admin:   "/admin/dashboard",
};

// ─── Schemas ───────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email:    z.string().min(1, "Required").email("Enter a valid email"),
  password: z.string().min(1, "Required"),
});
type LoginValues = z.infer<typeof loginSchema>;

const studentSchema = z.object({
  name:            z.string().min(2, "Enter your full name"),
  email:           z.string().min(1, "Required").email("Enter a valid email"),
  password:        z.string().min(8, "At least 8 characters"),
  confirmPassword: z.string().min(1, "Required"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
type StudentValues = z.infer<typeof studentSchema>;

const alumniSchema = z.object({
  name:         z.string().min(2, "Enter your full name"),
  email:        z.string().min(1, "Required").email("Enter a valid email"),
  password:     z.string().min(8, "At least 8 characters"),
  title:        z.string().optional(),
  company:      z.string().optional(),
  domain:       z.string().optional(),
  linkedin_url: z.string().url("Enter a valid LinkedIn URL").optional().or(z.literal("")),
});
type AlumniValues = z.infer<typeof alumniSchema>;

// ─── Helpers ───────────────────────────────────────────────────────────────
function Banner({ message, type = "error" }: { message: string; type?: "error" | "info" | "success" }) {
  const s = {
    error:   "border-danger/30   bg-danger/[0.07]   text-danger",
    info:    "border-warning/30  bg-warning/[0.07]  text-warning",
    success: "border-success/30  bg-success/[0.07]  text-success",
  }[type];
  const Icon = type === "success" ? CheckCircle2 : type === "info" ? Info : AlertCircle;
  return (
    <div className={cn("mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm", s)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Hero panel (left side) ───────────────────────────────────────────────
const FEATURES = [
  { icon: Star,     text: "AI-powered mentor matching based on your goals" },
  { icon: BookOpen, text: "Structured 12-week cohort LMS with weekly milestones" },
  { icon: Globe,    text: "Video sessions with alumni from top companies" },
  { icon: Users,    text: "Peer community across batches and departments" },
];

function HeroPanel() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden p-10 md:flex lg:p-14">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 mesh-bg" />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--ink)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--ink)) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Logo */}
      <div className="relative flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dim shadow-glow">
          <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-display text-xl font-semibold text-ink">AlumniLink</span>
      </div>

      {/* Hero copy */}
      <div className="relative space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent/80 mb-3">
            Mentorship Network
          </p>
          <h2 className="font-display text-4xl font-semibold leading-tight text-ink lg:text-5xl">
            Bridge the gap between{" "}
            <span className="gradient-text">students</span> and{" "}
            <span className="gradient-text">alumni</span>
          </h2>
          <p className="mt-4 text-base text-muted/80 leading-relaxed max-w-md">
            AI matches you with the right mentor based on your career goals, domain, and availability.
            Join a structured programme that accelerates real career growth.
          </p>
        </div>

        <ul className="space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-muted/80">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-3.5 w-3.5" />
              </div>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom quote */}
      <div className="relative">
        <blockquote className="border-l-2 border-accent/40 pl-4 text-sm italic text-muted/60">
          "The right mentor at the right time changes everything."
        </blockquote>
      </div>
    </div>
  );
}

// ─── Tab button ────────────────────────────────────────────────────────────
function Tab({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-1.5 rounded-xl px-3 py-3 text-xs font-semibold transition-all duration-150",
        active
          ? "bg-accent text-white shadow-glow"
          : "text-muted hover:bg-surface2 hover:text-ink"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function AuthPage() {
  const [section, setSection] = React.useState<Section>("login");
  const [serverError, setServerError]   = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const router = useRouter();

  const loginForm   = useForm<LoginValues>  ({ resolver: zodResolver(loginSchema)   });
  const studentForm = useForm<StudentValues>({ resolver: zodResolver(studentSchema) });
  const alumniForm  = useForm<AlumniValues> ({ resolver: zodResolver(alumniSchema)  });

  const clear = () => { setServerError(null); setSuccessMsg(null); };

  const afterAuth = (role: Role) => { router.push(ROLE_HOME[role]); router.refresh(); };

  const onLogin = async (v: LoginValues) => {
    clear();
    const res  = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Something went wrong."); return; }
    afterAuth(data.user.role as Role);
  };

  const onRegisterStudent = async (v: StudentValues) => {
    clear();
    const { confirmPassword: _, ...payload } = v;
    const res  = await fetch("/api/auth/register/student", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Registration failed."); return; }
    router.push("/onboarding"); router.refresh();
  };

  const onRegisterAlumni = async (v: AlumniValues) => {
    clear();
    const payload = { ...v, linkedin_url: v.linkedin_url || undefined };
    const res  = await fetch("/api/auth/register/alumni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Submission failed."); return; }
    setSuccessMsg("Application submitted! You'll receive an email once an admin approves your account.");
    alumniForm.reset();
  };

  const switchSection = (s: Section) => { setSection(s); clear(); };

  return (
    <div className="flex min-h-screen bg-paper">
      {/* Left — hero */}
      <div className="flex-1 md:grid md:grid-cols-2">
        <HeroPanel />

        {/* Right — form panel */}
        <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 md:px-10 lg:px-14">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-dim shadow-glow">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-semibold text-ink">AlumniLink</span>
          </div>

          <div className="w-full max-w-sm animate-fade-up">
            <div className="mb-7">
              <h1 className="font-display text-2xl font-semibold text-ink">
                {section === "login"   ? "Welcome back"       :
                 section === "student" ? "Create an account"  :
                                         "Apply as a mentor"}
              </h1>
              <p className="mt-1 text-sm text-muted/70">
                {section === "login"   ? "Sign in to your AlumniLink account"                :
                 section === "student" ? "Join the mentorship programme as a student"        :
                                         "Alumni accounts require admin approval before access"}
              </p>
            </div>

            {/* Tabs */}
            <div className="mb-6 flex gap-1.5 rounded-xl border border-line/60 bg-surface2/50 p-1.5">
              <Tab id="login"   active={section === "login"}   icon={LogIn}         label="Sign In"         onClick={() => switchSection("login")} />
              <Tab id="student" active={section === "student"} icon={GraduationCap} label="Student"         onClick={() => switchSection("student")} />
              <Tab id="alumni"  active={section === "alumni"}  icon={Users}         label="Alumni"          onClick={() => switchSection("alumni")} />
            </div>

            {serverError && <Banner message={serverError} type="error" />}
            {successMsg  && <Banner message={successMsg}  type="success" />}

            {/* ══ LOGIN ══ */}
            {section === "login" && (
              <div className="space-y-5">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => { setGoogleLoading(true); window.location.href = "/api/auth/google"; }}
                  disabled={googleLoading}
                  className={cn(
                    "flex w-full items-center justify-center gap-3 rounded-xl border border-line/70 bg-surface2/50",
                    "px-4 py-2.5 text-sm font-medium text-ink",
                    "transition-all duration-150 hover:bg-surface2 hover:border-muted/40",
                    "disabled:cursor-wait disabled:opacity-50"
                  )}
                >
                  {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : <GoogleIcon />}
                  {googleLoading ? "Redirecting…" : "Continue with Google"}
                </button>

                <div className="flex items-center gap-3 text-xs text-muted/50">
                  <span className="h-px flex-1 bg-line/60" />or use email<span className="h-px flex-1 bg-line/60" />
                </div>

                <form onSubmit={loginForm.handleSubmit(onLogin)} noValidate className="space-y-4">
                  <Field label="Email" error={loginForm.formState.errors.email?.message}>
                    <Input id="email" type="email" placeholder="you@college.edu" autoComplete="email" {...loginForm.register("email")} />
                  </Field>
                  <Field label="Password" error={loginForm.formState.errors.password?.message}>
                    <Input id="password" type="password" placeholder="••••••••" autoComplete="current-password" {...loginForm.register("password")} />
                  </Field>
                  <Button type="submit" variant="accent" size="lg" className="w-full mt-2" disabled={loginForm.formState.isSubmitting}>
                    {loginForm.formState.isSubmitting
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
                      : <> Sign In <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              </div>
            )}

            {/* ══ STUDENT ══ */}
            {section === "student" && (
              <form onSubmit={studentForm.handleSubmit(onRegisterStudent)} noValidate className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/[0.07] px-4 py-3 text-xs text-muted/80">
                  <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                  Create a student account. Set your academic year in the next step.
                </div>
                <Field label="Full name" error={studentForm.formState.errors.name?.message}>
                  <Input id="s-name" placeholder="Jordan Alvarez" autoComplete="name" {...studentForm.register("name")} />
                </Field>
                <Field label="College email" error={studentForm.formState.errors.email?.message}>
                  <Input id="s-email" type="email" placeholder="you@college.edu" autoComplete="email" {...studentForm.register("email")} />
                </Field>
                <Field label="Password" error={studentForm.formState.errors.password?.message}>
                  <Input id="s-password" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...studentForm.register("password")} />
                </Field>
                <Field label="Confirm password" error={studentForm.formState.errors.confirmPassword?.message}>
                  <Input id="s-confirm" type="password" placeholder="••••••••" {...studentForm.register("confirmPassword")} />
                </Field>
                <Button type="submit" variant="accent" size="lg" className="w-full mt-2" disabled={studentForm.formState.isSubmitting}>
                  {studentForm.formState.isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</>
                    : <> Create Account <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            )}

            {/* ══ ALUMNI ══ */}
            {section === "alumni" && (
              <form onSubmit={alumniForm.handleSubmit(onRegisterAlumni)} noValidate className="space-y-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-warning/20 bg-warning/[0.07] px-4 py-3 text-xs text-muted/80">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                  Alumni accounts require admin approval. You'll be able to log in once reviewed.
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Field label="Full name" error={alumniForm.formState.errors.name?.message}>
                      <Input id="a-name" placeholder="Arjun Mehta" autoComplete="name" {...alumniForm.register("name")} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Email" error={alumniForm.formState.errors.email?.message}>
                      <Input id="a-email" type="email" placeholder="you@company.com" autoComplete="email" {...alumniForm.register("email")} />
                    </Field>
                  </div>
                  <div className="col-span-2">
                    <Field label="Choose a password" error={alumniForm.formState.errors.password?.message}>
                      <Input id="a-password" type="password" placeholder="At least 8 characters" autoComplete="new-password" {...alumniForm.register("password")} />
                    </Field>
                  </div>
                  <div>
                    <Field label="Job title (optional)">
                      <Input id="a-title" placeholder="Senior Engineer" {...alumniForm.register("title")} />
                    </Field>
                  </div>
                  <div>
                    <Field label="Company (optional)">
                      <Input id="a-company" placeholder="Google" {...alumniForm.register("company")} />
                    </Field>
                  </div>
                  <div>
                    <Field label="Domain (optional)">
                      <Input id="a-domain" placeholder="Software Eng." {...alumniForm.register("domain")} />
                    </Field>
                  </div>
                  <div>
                    <Field label="LinkedIn (optional)" error={alumniForm.formState.errors.linkedin_url?.message}>
                      <Input id="a-linkedin" type="url" placeholder="linkedin.com/in/…" {...alumniForm.register("linkedin_url")} />
                    </Field>
                  </div>
                </div>

                <Button type="submit" variant="accent" size="lg" className="w-full mt-2" disabled={alumniForm.formState.isSubmitting}>
                  {alumniForm.formState.isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                    : <> Submit Application <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </form>
            )}

            <p className="mt-6 text-center text-xs text-muted/50">
              {section !== "login" ? (
                <>Already have an account?{" "}
                  <button type="button" onClick={() => switchSection("login")} className="text-accent hover:text-accent-ink transition-colors">
                    Sign in
                  </button>
                </>
              ) : (
                <>New here?{" "}
                  <button type="button" onClick={() => switchSection("student")} className="text-accent hover:text-accent-ink transition-colors">
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
