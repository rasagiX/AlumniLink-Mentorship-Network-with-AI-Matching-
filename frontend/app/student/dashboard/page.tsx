"use client";

import * as React from "react";
import Link from "next/link";
import { Search, UserRoundPlus, Clock, CheckCircle2, XCircle, BookOpenCheck, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface MentorRequest {
  id: string;
  mentor_id: string;
  mentor_name: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  goal: string;
  weekly_hours: string;
  cycle_id?: string | null;
}

function StatusBadge({ status }: { status: MentorRequest["status"] }) {
  if (status === "pending")
    return (
      <Badge tone="accent" className="flex items-center gap-1">
        <Clock className="h-3 w-3" /> Pending mentor response
      </Badge>
    );
  if (status === "accepted")
    return (
      <Badge tone="success" className="flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Accepted
      </Badge>
    );
  return (
    <Badge tone="danger" className="flex items-center gap-1">
      <XCircle className="h-3 w-3" /> Declined
    </Badge>
  );
}

export default function StudentDashboard() {
  const [name, setName] = React.useState("Student");
  const [requests, setRequests] = React.useState<MentorRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => d.user?.name && setName(d.user.name))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    setLoading(true);
    fetch("/api/requests/mine")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setRequests(d);
        else setError(d.error ?? "Failed to load requests.");
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  const acceptedRequest = requests.find((r) => r.status === "accepted");
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const declinedRequests = requests.filter((r) => r.status === "declined");

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Track your mentorship requests and active programme."
      />

      {/* ── Active cycle banner ── */}
      {acceptedRequest && (
        <Card className="mb-6 border-success/30 bg-success/[0.04]">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="success" className="mb-3 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Mentorship active
              </Badge>
              <h2 className="font-display text-xl font-medium">
                You are matched with {acceptedRequest.mentor_name}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Goal: {acceptedRequest.goal.slice(0, 120)}{acceptedRequest.goal.length > 120 ? "…" : ""}
              </p>
              <p className="mt-1 text-xs text-muted">
                Accepted {formatDate(acceptedRequest.created_at)}
              </p>
            </div>
            {acceptedRequest.cycle_id && (
              <Button asChild>
                <Link href={`/student/lms/${acceptedRequest.cycle_id}`}>
                  <BookOpenCheck className="h-4 w-4" /> Open My LMS
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── No activity at all ── */}
      {!loading && requests.length === 0 && (
        <Card className="mb-6">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="student" className="mb-3">No mentor selected</Badge>
              <h2 className="font-display text-xl font-medium">Your mentorship has not started yet</h2>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Browse the registered mentor directory and send a request when you find the right mentor.
                Progress, weeks, and sessions appear only after a request is accepted.
              </p>
            </div>
            <Button asChild>
              <Link href="/student/directory">
                <UserRoundPlus className="h-4 w-4" /> Find a mentor
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Pending requests ── */}
      {pendingRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line p-0">
            {pendingRequests.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{r.mentor_name}</p>
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">{r.goal}</p>
                  <p className="mt-1 text-xs text-muted">
                    Sent {formatDate(r.created_at)} · {r.weekly_hours}h/week
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Declined ── */}
      {declinedRequests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-danger" />
              Declined Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-line p-0">
            {declinedRequests.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{r.mentor_name}</p>
                  <p className="mt-0.5 text-xs text-muted">{formatDate(r.created_at)}</p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </CardContent>
          <CardContent className="px-5 pb-4 pt-0">
            <Button asChild size="sm" variant="outline">
              <Link href="/student/directory">
                <Search className="h-3.5 w-3.5" /> Find another mentor
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Error state ── */}
      {error && (
        <Card>
          <CardContent className="p-5 text-sm text-danger">{error}</CardContent>
        </Card>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <Card>
          <CardContent className="p-5 text-sm text-muted animate-pulse">Loading your requests…</CardContent>
        </Card>
      )}

      {/* ── Discovery prompt if no active cycle ── */}
      {!acceptedRequest && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Mentor discovery
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 text-sm text-muted">
            {requests.length > 0
              ? "You can send additional requests to other mentors while you wait."
              : "Your dashboard will update once you submit a request and your mentor responds."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
