"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpenCheck, ArrowRight, Clock, CheckCircle2,
  XCircle, Search, UserRoundPlus, Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface MentorRequest {
  id: string; mentor_id: string; mentor_name: string;
  status: "pending" | "accepted" | "declined";
  created_at: string; goal: string; weekly_hours: string;
  cycle_id?: string | null;
}

function StatusBadge({ status }: { status: MentorRequest["status"] }) {
  if (status === "pending") return <Badge tone="accent" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
  if (status === "accepted") return <Badge tone="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Accepted</Badge>;
  return <Badge tone="danger" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Declined</Badge>;
}

export default function SeniorMySeniorPage() {
  const [requests, setRequests] = React.useState<MentorRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/requests/mine")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRequests(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const accepted = requests.find((r) => r.status === "accepted");
  const pending = requests.filter((r) => r.status === "pending");
  const declined = requests.filter((r) => r.status === "declined");

  if (loading) return (
    <div className="flex items-center gap-2 py-20 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );

  return (
    <div>
      <PageHeader
        title="My Alumni Mentor"
        description="As a senior you can also be mentored by alumni — find and request a mentor below."
      />

      {/* Active mentorship */}
      {accepted && (
        <Card className="mb-6 border-success/30 bg-success/[0.04]">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="success" className="mb-3 flex w-fit items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Mentorship active
              </Badge>
              <h2 className="font-display text-xl font-medium">
                Mentored by {accepted.mentor_name}
              </h2>
              <p className="mt-1 text-sm text-muted line-clamp-2">{accepted.goal}</p>
              <p className="mt-1 text-xs text-muted">Since {formatDate(accepted.created_at)}</p>
            </div>
            {accepted.cycle_id && (
              <Button asChild>
                <Link href={`/student/lms/${accepted.cycle_id}`}>
                  <BookOpenCheck className="h-4 w-4" /> Open LMS
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* No requests yet */}
      {!loading && requests.length === 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="neutral" className="mb-3">No mentor yet</Badge>
              <h2 className="font-display text-xl font-medium">Find an alumni mentor</h2>
              <p className="mt-2 text-sm text-muted max-w-md">
                Browse the alumni directory and send a request. Alumni bring industry experience and career guidance that complements peer learning.
              </p>
            </div>
            <Button asChild>
              <Link href="/student/directory">
                <UserRoundPlus className="h-4 w-4" /> Browse Alumni
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-accent" /> Pending Requests ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line p-0">
            {pending.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{r.mentor_name}</p>
                  <p className="text-xs text-muted truncate">{r.goal.slice(0, 80)}{r.goal.length > 80 ? "…" : ""}</p>
                  <p className="text-xs text-muted mt-0.5">Sent {formatDate(r.created_at)} · {r.weekly_hours}h/wk</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-danger" /> Declined Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line p-0">
            {declined.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium">{r.mentor_name}</p>
                  <p className="text-xs text-muted">{formatDate(r.created_at)}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
          <CardContent className="px-5 pb-4 pt-0">
            <Button asChild size="sm" variant="outline">
              <Link href="/student/directory"><Search className="h-3.5 w-3.5" /> Find another mentor</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
