"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Pair {
  cycleId: string;
  studentName: string;
  mentorName: string;
  domain: string | null;
  currentWeek: number;
  totalWeeks: number;
  startedAt: string | null;
}

export default function DisputesPage() {
  const [pairs, setPairs] = React.useState<Pair[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/pairs")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setPairs(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  // Flag cycles stuck on week 1 for more than expected (simple heuristic)
  const stalled = pairs.filter((p) => p.currentWeek === 1 && p.totalWeeks > 1);
  const healthy = pairs.filter((p) => p.currentWeek > 1 || p.totalWeeks <= 1);

  return (
    <div>
      <PageHeader
        title="Disputes & Inactivity"
        description="Cycles that appear stalled or have not progressed past week 1."
      />

      {loading && <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}

      {!loading && stalled.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <CheckCircle2 className="h-5 w-5 text-success" />
          No stalled cycles — all active mentorships have progressed past week 1.
        </div>
      )}

      {stalled.length > 0 && (
        <div className="mb-8 space-y-3">
          {stalled.map((p) => (
            <Card key={p.cycleId} className="border-danger/30">
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.studentName}</p>
                    <span className="text-xs text-muted">paired with {p.mentorName}</span>
                    <Badge tone="danger">Stuck on Week 1</Badge>
                    {p.domain && <Badge tone="neutral">{p.domain}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Started{" "}
                    {p.startedAt
                      ? new Date(p.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                      : "unknown"}{" "}
                    · {p.totalWeeks}-week programme
                  </p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <a href={`mailto:${p.mentorName}`}>Contact Mentor</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {healthy.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-lg font-medium">Healthy Cycles ({healthy.length})</h2>
          <div className="space-y-2">
            {healthy.map((p) => (
              <Card key={p.cycleId}>
                <CardContent className="flex items-center gap-4 p-4 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <span className="font-medium">{p.studentName}</span>
                  <span className="text-muted">↔ {p.mentorName}</span>
                  <Badge tone="success" className="ml-auto">Week {p.currentWeek}/{p.totalWeeks}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
