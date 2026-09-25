"use client";

import Link from "next/link";
import {
  Users, GraduationCap, RefreshCw, Award, AlertTriangle, Wallet, ArrowRight, Users2, Landmark, ShieldCheck,
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from "recharts";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ADMIN_KPIS, CAPACITY_TREND, DOMAIN_DISTRIBUTION } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";

interface KpiCard {
  key: keyof typeof ADMIN_KPIS;
  label: string;
  icon: typeof GraduationCap;
  money?: boolean;
}

const KPI_CARDS: KpiCard[] = [
  { key: "totalStudents", label: "Students", icon: GraduationCap },
  { key: "totalMentors", label: "Mentors", icon: Users },
  { key: "activeCycles", label: "Active Cycles", icon: RefreshCw },
  { key: "completedCohorts", label: "Completed Cohorts", icon: Award },
  { key: "flaggedInactivity", label: "Flagged Inactivity", icon: AlertTriangle },
  { key: "accruedEscrow", label: "Accrued Escrow", icon: Wallet, money: true },
];

const QUICK_LINKS = [
  { href: "/admin/pairs", label: "Pairings Monitor", icon: Users2 },
  { href: "/admin/payroll", label: "Payroll Console", icon: Landmark },
  { href: "/admin/accreditation", label: "Accreditation Queue", icon: ShieldCheck },
  { href: "/admin/disputes", label: "Dispute Resolution", icon: AlertTriangle },
];

export default function AdminDashboard() {
  return (
    <div>
      <PageHeader title="Institutional Command Center" description="Live snapshot across every mentorship cycle and cohort." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {KPI_CARDS.map((k) => {
          const value = ADMIN_KPIS[k.key];
          return (
            <Card key={k.key}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] uppercase tracking-wide text-muted">{k.label}</p>
                  <k.icon className="h-3.5 w-3.5 text-muted" />
                </div>
                <p className="font-display text-xl font-medium number-tabular">
                  {k.money ? formatCurrency(value) : value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Platform Capacity Trend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={CAPACITY_TREND} margin={{ left: -20, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="students" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--role-admin))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--role-admin))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="mentors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted))" }} axisLine={false} tickLine={false} width={36} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--line))", borderRadius: 4, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="students" stroke="hsl(var(--role-admin))" fill="url(#students)" strokeWidth={2} name="Students" />
                <Area type="monotone" dataKey="mentors" stroke="hsl(var(--accent))" fill="url(#mentors)" strokeWidth={2} name="Mentors" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Cohorts by Domain</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={DOMAIN_DISTRIBUTION} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--line))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted))" }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="domain"
                  width={120}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--line))", borderRadius: 4, fontSize: 12 }}
                />
                <Bar dataKey="cohorts" fill="hsl(var(--role-admin))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((l) => (
          <Button key={l.href} variant="outline" asChild className="h-auto justify-start gap-3 py-4 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-sm">
            <Link href={l.href}>
              <l.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{l.label}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
