"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Compass, GraduationCap, BookOpen, ArrowRight, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

const YEAR_LABELS: Record<number, string> = {
  1: "1st Year", 2: "2nd Year", 3: "3rd Year",
  4: "4th Year", 5: "5th Year", 6: "Final Year",
};

const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  senior:  "/student/dashboard",   // seniors share the student portal
  mentor:  "/alumni/dashboard",
  admin:   "/admin/dashboard",
};

// Year >= this threshold → auto-promoted to Senior
const SENIOR_THRESHOLD = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null);
  const [branch, setBranch] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const willBecomeSenior = selectedYear !== null && selectedYear >= SENIOR_THRESHOLD;

  const onContinue = async () => {
    if (!selectedYear) { setError("Please select your current year."); return; }
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/profile/set-year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: selectedYear, branch: branch.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // data.user has the updated role after possible auto-promotion
      const role: Role = data.user?.role ?? "student";
      // Hard redirect so middleware re-reads the new session cookie
      window.location.href = ROLE_HOME[role];
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Compass className="h-5 w-5" />
          <span className="font-display text-lg font-medium">AlumniLink</span>
        </div>

        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-medium">Welcome to AlumniLink 👋</h1>
          <p className="mt-2 text-sm text-muted">
            Tell us which year you're in. We'll personalise your experience and
            connect you with the right seniors and mentors.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6 p-6">
            {/* Year picker */}
            <div>
              <Label className="flex items-center gap-1.5 mb-3">
                <GraduationCap className="h-3.5 w-3.5 text-muted" /> Your current academic year
              </Label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setSelectedYear(y); setError(null); }}
                    className={cn(
                      "flex flex-col items-center rounded-sm border px-2 py-3 text-xs font-medium transition-all",
                      selectedYear === y
                        ? "border-ink bg-ink text-paper shadow-sm"
                        : "border-line text-muted hover:border-ink hover:text-ink"
                    )}
                  >
                    <span className="text-lg font-bold">{y}</span>
                    <span className="text-[10px] opacity-70 leading-tight text-center">
                      {YEAR_LABELS[y].split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Auto-promote hint */}
              {willBecomeSenior && (
                <div className="mt-3 flex items-start gap-2 rounded-sm border border-success/30 bg-success/[0.06] px-3 py-2.5">
                  <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-success" />
                  <div>
                    <p className="text-xs font-medium text-success">
                      You'll join as a <strong>Senior Student</strong>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      Year {selectedYear} students are automatically enrolled as seniors.
                      You can mentor juniors AND be mentored by alumni.
                    </p>
                  </div>
                </div>
              )}

              {selectedYear && !willBecomeSenior && (
                <div className="mt-3 flex items-start gap-2 rounded-sm border border-accent/30 bg-accent/[0.04] px-3 py-2.5">
                  <GraduationCap className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" />
                  <p className="text-xs text-muted">
                    You'll join as a <strong className="text-ink">Junior Student</strong>.
                    You can browse the Seniors Directory and connect with seniors for guidance.
                  </p>
                </div>
              )}
            </div>

            {/* Branch */}
            <div>
              <Label htmlFor="branch" className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted" /> Your branch / department
                <span className="text-xs font-normal text-muted">(optional)</span>
              </Label>
              <Input
                id="branch"
                placeholder="e.g. Computer Science, Mechanical Engineering, ECE…"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted">
                Used to show you relevant seniors and mentors in your field.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedYear || submitting}
              onClick={onContinue}
            >
              {submitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Setting up your profile…</>
              ) : (
                <>
                  Continue to{" "}
                  {willBecomeSenior ? "Student Portal (Senior)" : "Student Portal"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => router.push("/student/dashboard")}
              className="w-full text-center text-xs text-muted hover:text-ink transition-colors"
            >
              Skip for now — I'll fill this in later
            </button>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          You can always update your year and branch from your profile settings.
        </p>
      </div>
    </div>
  );
}
