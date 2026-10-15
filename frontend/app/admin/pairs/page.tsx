"use client";

import * as React from "react";
import { Loader2, AlertCircle, Users2 } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Pair {
  cycleId: string;
  studentName: string;
  mentorName: string;
  domain: string | null;
  currentWeek: number;
  totalWeeks: number;
  startedAt: string | null;
}

export default function AdminPairsPage() {
  const [pairs, setPairs] = React.useState<Pair[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/pairs")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setPairs(d); else setError(d.error ?? "Failed to load."); })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Student–Mentor Pairings"
        description="All active mentorship cycles drawn from the database."
      />

      {loading && <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {error  && <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

      {!loading && !error && pairs.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Users2 className="h-5 w-5" /> No active pairings yet.
        </div>
      )}

      {pairs.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Mentor</th>
                  <th className="px-4 py-3 font-medium">Domain</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pairs.map((p) => {
                  const pct = p.totalWeeks > 0 ? Math.round((p.currentWeek / p.totalWeeks) * 100) : 0;
                  return (
                    <tr key={p.cycleId} className="hover:bg-ink/[0.02]">
                      <td className="px-4 py-3 font-medium">{p.studentName}</td>
                      <td className="px-4 py-3">{p.mentorName}</td>
                      <td className="px-4 py-3">
                        {p.domain
                          ? <Badge tone="neutral">{p.domain}</Badge>
                          : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted">
                            Wk {p.currentWeek}/{p.totalWeeks} ({pct}%)
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {p.startedAt
                          ? new Date(p.startedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
