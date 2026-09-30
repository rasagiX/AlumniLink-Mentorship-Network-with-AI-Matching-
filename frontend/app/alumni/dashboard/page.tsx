"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Users, BookOpenCheck, Loader2, AlertCircle, Inbox } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface LMSModule {
  id: string;
  week_number: number;
  status: "locked" | "active" | "completed";
}

interface Cycle {
  id: string;
  student_name: string;
  mentor_name: string;
  domain: string | null;
  total_weeks: number;
  current_week: number;
  is_active: boolean;
  modules: LMSModule[];
}

interface Session {
  name: string;
  email: string;
}

export default function MentorDashboard() {
  const [session, setSession] = React.useState<Session | null>(null);
  const [cycles, setCycles] = React.useState<Cycle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => d.user && setSession(d.user))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/lms/cycles")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCycles(d);
        else setError(d.error ?? "Failed to load mentee data.");
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Capacity Control Desk"
        description={session ? `Signed in as ${session.name} · ${session.email}` : "Loading…"}
      />

      {/* Stats bar */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Active Mentees</p>
            <p className="font-display text-2xl font-medium">{cycles.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Pending Requests</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/alumni/requests">View requests</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mentee cards */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium">Active Mentees</h2>
        <Badge tone="mentor">
          <Users className="mr-1 h-3 w-3" /> {cycles.length} active
        </Badge>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your mentees…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && cycles.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" />
          No active mentees yet.{" "}
          <Link href="/alumni/requests" className="underline underline-offset-2 hover:text-ink">
            Check pending requests
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cycles.map((cycle) => {
          const completed = cycle.modules.filter((m) => m.status === "completed").length;
          const total = cycle.total_weeks;
          return (
            <Card key={cycle.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={cycle.student_name} />
                  <div>
                    <CardTitle>{cycle.student_name}</CardTitle>
                    <p className="text-xs text-muted">{cycle.domain ?? "Mentorship"}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="mb-1 flex items-center justify-between text-xs text-muted">
                  <span>Week {cycle.current_week} of {total}</span>
                  <span>{completed} of {total} milestones complete</span>
                </div>
                <Progress value={total > 0 ? (completed / total) * 100 : 0} />
                <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                  <Link href={`/alumni/lms/${cycle.id}`}>
                    <BookOpenCheck className="h-3.5 w-3.5" /> Open Module Authoring Desk
                    <ArrowRight className="ml-auto h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
