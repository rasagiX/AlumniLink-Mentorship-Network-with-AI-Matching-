"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users, GraduationCap, RefreshCw, Award, AlertTriangle, Wallet,
  ArrowRight, Users2, Landmark, ShieldCheck, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdminStats {
  totalStudents: number;
  totalMentors: number;
  activeCycles: number;
  pendingRequests: number;
  registeredMentors: number;
}

interface KpiDef {
  key: keyof AdminStats;
  label: string;
  icon: React.ElementType;
}

const KPI_DEFS: KpiDef[] = [
  { key: "totalStudents", label: "Students", icon: GraduationCap },
  { key: "totalMentors", label: "Registered Mentors", icon: Users },
  { key: "activeCycles", label: "Active Cycles", icon: RefreshCw },
  { key: "pendingRequests", label: "Pending Requests", icon: Award },
  { key: "registeredMentors", label: "Approved Mentors", icon: AlertTriangle },
];

const QUICK_LINKS = [
  { href: "/admin/pairs", label: "Pairings Monitor", icon: Users2 },
  { href: "/admin/payroll", label: "Payroll Console", icon: Landmark },
  { href: "/admin/accreditation", label: "Accreditation Queue", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Dispute Resolution", icon: AlertTriangle },
];

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch(() => setError("Could not load platform stats."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Institutional Command Center"
        description="Live snapshot across every mentorship cycle and cohort."
      />

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {KPI_DEFS.map((k) => {
          const value = stats?.[k.key];
          return (
            <Card key={k.key}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{k.label}</p>
                  <k.icon className="h-3.5 w-3.5 text-muted" />
                </div>
                <p className="font-display text-xl font-medium number-tabular">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  ) : error ? (
                    "—"
                  ) : (
                    value ?? 0
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Quick-link navigation */}
      <h2 className="mb-3 font-display text-lg font-medium">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((l) => (
          <Button
            key={l.href}
            variant="outline"
            asChild
            className="h-auto justify-start gap-3 py-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-sm"
          >
            <Link href={l.href}>
              <l.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{l.label}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ))}
      </div>

      {/* Live pairs table */}
      <PairsPreview />
    </div>
  );
}

function PairsPreview() {
  const [pairs, setPairs] = React.useState<
    { cycleId: string; studentName: string; mentorName: string; domain: string | null; currentWeek: number; totalWeeks: number }[]
  >([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/pairs")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setPairs(d.slice(0, 10)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (pairs.length === 0) return null;

  return (
    <div className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium">Recent Pairings</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/pairs">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Mentor</th>
                <th className="px-4 py-3 font-medium">Domain</th>
                <th className="px-4 py-3 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pairs.map((p) => (
                <tr key={p.cycleId} className="hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-medium">{p.studentName}</td>
                  <td className="px-4 py-3 text-muted">{p.mentorName}</td>
                  <td className="px-4 py-3 text-muted">{p.domain ?? "—"}</td>
                  <td className="px-4 py-3">
                    Week {p.currentWeek} / {p.totalWeeks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
