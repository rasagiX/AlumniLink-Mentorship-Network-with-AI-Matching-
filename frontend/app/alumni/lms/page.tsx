"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpenCheck, ArrowRight, Loader2, AlertCircle,
  Inbox, CheckCircle2, Clock, CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LMSModule {
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
  available_days: string | null;
  class_start_date: string | null;
  modules: LMSModule[];
}

export default function MentorLmsIndexPage() {
  const [cycles, setCycles] = React.useState<Cycle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/lms/cycles")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCycles(d);
        else setError(d.error ?? "Failed to load.");
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2 py-20 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your students…
    </div>
  );

  if (error) return (
    <div className="rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
      <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Module Authoring"
        description="Select a student to open their LMS and manage their programme."
      />

      {cycles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-line py-20 text-center text-sm text-muted">
          <Inbox className="h-6 w-6" />
          <p>No active students yet.</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/alumni/requests">View pending requests</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cycles.map((cycle) => {
            const completed = cycle.modules.filter((m) => m.status === "completed").length;
            const total = cycle.total_weeks;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            const days = cycle.available_days
              ? cycle.available_days.split(",").join(" · ")
              : null;

            return (
              <Card
                key={cycle.id}
                className="flex flex-col transition-shadow hover:shadow-md"
              >
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <Avatar name={cycle.student_name} />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{cycle.student_name}</CardTitle>
                      <p className="text-xs text-muted truncate">
                        {cycle.domain ?? "Mentorship"}
                      </p>
                    </div>
                    <Badge
                      tone={cycle.current_week >= cycle.total_weeks ? "success" : "accent"}
                      className="shrink-0"
                    >
                      {cycle.current_week >= cycle.total_weeks ? (
                        <><CheckCircle2 className="h-3 w-3" /> Done</>
                      ) : (
                        <>Week {cycle.current_week}</>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 p-5 pt-0">
                  {/* Progress */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>{completed} / {total} modules done</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} />
                  </div>

                  {/* Schedule details */}
                  <div className="space-y-1 text-xs text-muted">
                    {days && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{days}</span>
                      </div>
                    )}
                    {cycle.class_start_date && (
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3 shrink-0" />
                        <span>
                          Started{" "}
                          {new Date(cycle.class_start_date).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <Button asChild size="sm" variant="outline" className="mt-auto w-full">
                    <Link href={`/alumni/lms/${cycle.id}`}>
                      <BookOpenCheck className="h-3.5 w-3.5" />
                      Open LMS
                      <ArrowRight className="ml-auto h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
