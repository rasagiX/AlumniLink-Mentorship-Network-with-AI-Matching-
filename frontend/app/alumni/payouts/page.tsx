import { CheckCircle2, Clock, ShieldCheck, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MENTOR_PAYOUTS, MENTOR_DIRECTORY, CURRENT_USER } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { PayoutEntry } from "@/lib/types";

function statusTone(status: PayoutEntry["status"]) {
  if (status === "Disbursed") return "success" as const;
  if (status === "Approved") return "accent" as const;
  return "warning" as const;
}

export default function MentorPayoutsPage() {
  const mentor = MENTOR_DIRECTORY.find((m) => m.id === CURRENT_USER.mentor.id)!;
  const totalAccrued = MENTOR_PAYOUTS.reduce((a, p) => a + p.amount, 0);
  const totalDisbursed = MENTOR_PAYOUTS.filter((p) => p.status === "Disbursed").reduce((a, p) => a + p.amount, 0);
  const totalHeld = MENTOR_PAYOUTS.filter((p) => p.status.startsWith("Held")).reduce((a, p) => a + p.amount, 0);

  return (
    <div>
      <PageHeader title="Weekly Milestone Payroll" description="Honorariums accrue per completed and verified student milestone." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Total Accrued</p>
            <p className="mt-2 font-display text-2xl font-medium number-tabular">{formatCurrency(totalAccrued)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Disbursed</p>
            <p className="mt-2 font-display text-2xl font-medium number-tabular text-success">{formatCurrency(totalDisbursed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wide text-muted">Held in Escrow</p>
            <p className="mt-2 font-display text-2xl font-medium number-tabular text-warning">{formatCurrency(totalHeld)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 p-4">
          {mentor.bankVerified ? (
            <>
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm">Bank / UPI payout method verified — disbursements process automatically on approval.</p>
            </>
          ) : (
            <>
              <ShieldAlert className="h-4 w-4 text-danger" />
              <p className="text-sm">Payout method not verified. Add and verify a bank or UPI account to receive disbursements.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Session Time</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {MENTOR_PAYOUTS.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 transition-colors hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 number-tabular">W{p.week}</td>
                  <td className="px-4 py-3">{p.studentName}</td>
                  <td className="px-4 py-3 number-tabular">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 number-tabular text-muted">{p.sessionMinutes} min</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(p.status)}>
                      {p.status === "Disbursed" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {p.status}
                    </Badge>
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
