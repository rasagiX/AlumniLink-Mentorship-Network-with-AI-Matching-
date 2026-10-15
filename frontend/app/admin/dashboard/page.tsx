"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users, GraduationCap, RefreshCw, AlertTriangle, Loader2,
  ArrowRight, Users2, UserCheck, LifeBuoy, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Stats {
  totalStudents: number;
  totalMentors: number;
  activeCycles: number;
  pendingRequests: number;
  pendingAlumni: number;
}

const QUICK_LINKS = [
  { href: "/admin/pairs",               label: "Pairings Monitor",    icon: Users2,      desc: "Active student–mentor cycles" },
  { href: "/admin/alumni-applications", label: "Alumni Applications", icon: UserCheck,   desc: "Review pending alumni requests" },
  { href: "/admin/disputes",            label: "Disputes",            icon: AlertTriangle, desc: "Inactivity and cycle issues" },
  { href: "/admin/support",             label: "Support Tickets",     icon: LifeBuoy,    desc: "Messages from students and mentors" },
];

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setStats(d); })
      .catch(() => setError("Could not load stats."))
      .finally(() => setLoading(false));
  }, []);

  const KPI_CARDS = [
    { key: "totalStudents" as const, label: "Students",          icon: GraduationCap },
    { key: "totalMentors"  as const, label: "Active Mentors",    icon: Users         },
    { key: "activeCycles"  as const, label: "Active Cycles",     icon: RefreshCw     },
    { key: "pendingRequests" as const, label: "Pending Requests",icon: Clock         },
    { key: "pendingAlumni" as const, label: "Alumni Pending",    icon: UserCheck     },
  ];

  return (
    <div>
      <PageHeader title="Institutional Command Center" description="Live snapshot across every mentorship cycle and cohort." />

      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {KPI_CARDS.map((k) => {
          const value = stats?.[k.key];
          const isPending = k.key === "pendingAlumni" && (value ?? 0) > 0;
          return (
            <Card key={k.key} className={isPending ? "border-accent/40" : ""}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{k.label}</p>
                  <k.icon className={`h-3.5 w-3.5 ${isPending ? "text-accent" : "text-muted"}`} />
                </div>
                <p className="font-display text-xl font-medium">
                  {loading ? <span className="text-muted text-sm">—</span> : error ? "—" : (value ?? 0)}
                </p>
                {isPending && (
                  <Link href="/admin/alumni-applications" className="mt-1 block text-xs text-accent hover:underline">
                    Review →
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {error && <div className="mb-6 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">{error}</div>}

      {/* Quick links */}
      <h2 className="mb-3 font-display text-lg font-medium">Quick Actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((l) => (
          <Button key={l.href} variant="outline" asChild
            className="h-auto flex-col items-start gap-1 py-4 px-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-sm">
            <Link href={l.href}>
              <div className="flex w-full items-center justify-between">
                <l.icon className="h-4 w-4" />
                <ArrowRight className="h-3.5 w-3.5 text-muted" />
              </div>
              <p className="text-sm font-medium">{l.label}</p>
              <p className="text-xs font-normal text-muted">{l.desc}</p>
            </Link>
          </Button>
        ))}
      </div>

      {/* Live pairs preview */}
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
      .then((d) => Array.isArray(d) && setPairs(d.slice(0, 8)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  if (loading || pairs.length === 0) return null;

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
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-line overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${Math.round((p.currentWeek / p.totalWeeks) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">Wk {p.currentWeek}/{p.totalWeeks}</span>
                    </div>
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
