"use client";

import * as React from "react";
import { CheckCircle2, Clock, Landmark } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PAYOUT_LEDGER } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { PayoutEntry } from "@/lib/types";

function statusTone(status: PayoutEntry["status"]) {
  if (status === "Disbursed") return "success" as const;
  if (status === "Approved") return "accent" as const;
  return "warning" as const;
}

export default function AdminPayrollPage() {
  const [ledger, setLedger] = React.useState<PayoutEntry[]>(PAYOUT_LEDGER);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const releasable = ledger.filter((p) => p.status === "Approved");

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const release = (ids: string[]) => {
    setLedger((prev) => prev.map((p) => (ids.includes(p.id) && p.status === "Approved" ? { ...p, status: "Disbursed" } : p)));
    setSelected(new Set());
  };

  const totalHeld = ledger.filter((p) => p.status.startsWith("Held")).reduce((a, p) => a + p.amount, 0);
  const totalApproved = ledger.filter((p) => p.status === "Approved").reduce((a, p) => a + p.amount, 0);

  return (
    <div>
      <PageHeader
        title="Milestone Escrow Console"
        description="Payouts hold automatically until a session logs 30+ minutes and a grade is submitted."
        actions={
          <Button size="sm" disabled={selected.size === 0} onClick={() => release(Array.from(selected))}>
            <Landmark className="h-3.5 w-3.5" /> Release Selected ({selected.size})
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Held (auto-flagged)</p>
            <p className="mt-2 font-display text-2xl font-medium number-tabular text-warning">{formatCurrency(totalHeld)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Approved, awaiting release</p>
            <p className="mt-2 font-display text-2xl font-medium number-tabular">{formatCurrency(totalApproved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Bulk action</p>
              <p className="mt-2 text-sm">{releasable.length} entries ready</p>
            </div>
            <Button size="sm" variant="outline" disabled={releasable.length === 0} onClick={() => release(releasable.map((r) => r.id))}>
              Release All Approved
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Grade</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {ledger.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 transition-colors hover:bg-ink/[0.02]">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      disabled={p.status !== "Approved"}
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 accent-ink"
                    />
                  </td>
                  <td className="px-4 py-3">{p.studentName}</td>
                  <td className="px-4 py-3 number-tabular">W{p.week}</td>
                  <td className="px-4 py-3 number-tabular">{formatCurrency(p.amount)}</td>
                  <td className={`px-4 py-3 number-tabular ${p.sessionMinutes < 30 ? "text-danger" : "text-muted"}`}>
                    {p.sessionMinutes} min
                  </td>
                  <td className="px-4 py-3">{p.gradeSubmitted ? "Submitted" : <span className="text-danger">Missing</span>}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.status)}>
                      {p.status === "Disbursed" ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "Approved" && (
                      <Button size="sm" variant="outline" onClick={() => release([p.id])}>
                        Release
                      </Button>
                    )}
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
