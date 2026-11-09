"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search, UserRoundPlus, Clock, CheckCircle2, XCircle,
  BookOpenCheck, ArrowRight, GraduationCap, CalendarDays,
  TrendingUp, Sparkles, ChevronRight,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface MentorRequest {
  id: string;
  mentor_id: string;
  mentor_name: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  goal: string;
  weekly_hours: string;
  cycle_id?: string | null;
}

// ─── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MentorRequest["status"] }) {
  if (status === "pending")
    return <Badge tone="warning"><Clock className="h-2.5 w-2.5" /> Awaiting response</Badge>;
  if (status === "accepted")
    return <Badge tone="success"><CheckCircle2 className="h-2.5 w-2.5" /> Accepted</Badge>;
  return <Badge tone="danger"><XCircle className="h-2.5 w-2.5" /> Declined</Badge>;
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface2 ${className}`}
      style={{
        backgroundImage: "linear-gradient(90deg, hsl(var(--surface2)) 25%, hsl(var(--line)/0.3) 50%, hsl(var(--surface2)) 75%)",
        backgroundSize: "400% 100%",
        animation: "shimmer 1.8s linear infinite",
      }}
    />
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="relative">
        {/* Decorative gradient strip */}
        <div className="h-1 w-full bg-gradient-to-r from-accent via-role-mentor to-role-admin" />
        <CardContent className="flex flex-col items-start gap-6 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">
                Start your mentorship journey
              </h2>
              <p className="mt-1.5 max-w-md text-sm text-muted/80">
                Browse the mentor directory, find someone aligned with your goals, and send your first request.
                Your personalised dashboard activates once a mentor accepts.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Career guidance", "Technical skills", "Interview prep", "Networking"].map((tag) => (
                <span key={tag} className="rounded-full border border-line/60 bg-surface2 px-3 py-1 text-xs text-muted/80">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <Button asChild variant="accent" size="lg" className="shrink-0">
            <Link href="/student/directory">
              <UserRoundPlus className="h-4 w-4" /> Find a mentor
            </Link>
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const [name, setName]     = React.useState("Student");
  const [yearSet, setYearSet] = React.useState<boolean | null>(null);
  const [requests, setRequests] = React.useState<MentorRequest[]>([]);
  const [loading, setLoading]   = React.useState(true);
  const [error, setError]       = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json())
      .then((d) => d.user?.name && setName(d.user.name))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    fetch("/api/profile/me").then((r) => r.json())
      .then((d) => setYearSet(!!d.year))
      .catch(() => setYearSet(true));
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/requests/mine").then((r) => r.json())
      .then((d) => Array.isArray(d) ? setRequests(d) : setError(d.error ?? "Failed to load requests."))
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  const accepted  = requests.find((r) => r.status === "accepted");
  const pending   = requests.filter((r) => r.status === "pending");
  const declined  = requests.filter((r) => r.status === "declined");
  const firstName = name.split(" ")[0];

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Student Dashboard"
        title={`Good to see you, ${firstName}`}
        description="Track your mentorship requests and programme progress."
      />

      {/* ── Stats row ── */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Active mentor"
          value={accepted ? "1" : "—"}
          sub={accepted ? accepted.mentor_name : "None yet"}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone={accepted ? "success" : "default"}
        />
        <StatCard
          label="Pending requests"
          value={loading ? "…" : String(pending.length)}
          sub="Awaiting reply"
          icon={<Clock className="h-5 w-5" />}
          tone={pending.length > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Total sent"
          value={loading ? "…" : String(requests.length)}
          sub="All time"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="LMS modules"
          value={accepted?.cycle_id ? "Active" : "—"}
          sub="12-week programme"
          icon={<BookOpenCheck className="h-5 w-5" />}
          tone={accepted?.cycle_id ? "accent" : "default"}
        />
      </div>

      {/* ── Year nudge ── */}
      {yearSet === false && (
        <Card className="mb-6 border-accent/20 bg-gradient-to-r from-accent/[0.07] to-transparent">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Set your academic year</p>
                <p className="mt-0.5 text-xs text-muted/70">
                  Tell us which year you're in. Year 3+ students unlock the Senior portal automatically.
                </p>
              </div>
            </div>
            <Button asChild variant="accent" size="sm" className="shrink-0">
              <Link href="/onboarding">Set my year <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Active mentorship banner ── */}
      {accepted && (
        <Card className="mb-6 overflow-hidden border-success/25">
          <div className="h-0.5 w-full bg-gradient-to-r from-success/60 via-success to-success/60" />
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <Badge tone="success"><CheckCircle2 className="h-2.5 w-2.5" /> Mentorship active</Badge>
              <h2 className="font-display text-xl font-semibold text-ink">
                Your mentor is{" "}
                <span className="text-success">{accepted.mentor_name}</span>
              </h2>
              <p className="text-sm text-muted/80 line-clamp-2">
                {accepted.goal}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted/60">
                <CalendarDays className="h-3 w-3" />
                Accepted {formatDate(accepted.created_at)}
              </p>
            </div>
            {accepted.cycle_id && (
              <Button asChild variant="accent" size="lg" className="shrink-0">
                <Link href={`/student/lms/${accepted.cycle_id}`}>
                  <BookOpenCheck className="h-4 w-4" /> Open My LMS
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Empty state ── */}
      {!loading && requests.length === 0 && <EmptyState />}

      {/* ── Pending requests ── */}
      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <Clock className="h-3.5 w-3.5" />
              </div>
              Pending Requests
              <span className="ml-auto rounded-full bg-surface2 px-2 py-0.5 text-xs font-semibold tabular text-muted">
                {pending.length}
              </span>
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-line/50">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-surface2/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-ink">{r.mentor_name}</p>
                  <p className="text-xs text-muted/70 line-clamp-1">{r.goal}</p>
                  <p className="text-xs text-muted/50">
                    Sent {formatDate(r.created_at)} · {r.weekly_hours}h/week
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Declined ── */}
      {declined.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <XCircle className="h-3.5 w-3.5" />
              </div>
              Declined Requests
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-line/50">
            {declined.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-surface2/40 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">{r.mentor_name}</p>
                  <p className="text-xs text-muted/50">{formatDate(r.created_at)}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
          <div className="border-t border-line/50 px-6 py-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/student/directory">
                <Search className="h-3.5 w-3.5" /> Find another mentor
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <Card className="border-danger/20 bg-danger/[0.06]">
          <CardContent className="p-5 text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {/* ── Discovery CTA ── */}
      {!accepted && !loading && requests.length > 0 && (
        <Card className="border-line/40">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted/80">
                You can send requests to additional mentors while waiting for a reply.
              </p>
            </div>
            <Link href="/student/directory" className="ml-4 shrink-0 text-accent transition-colors hover:text-accent-ink">
              <ChevronRight className="h-5 w-5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
