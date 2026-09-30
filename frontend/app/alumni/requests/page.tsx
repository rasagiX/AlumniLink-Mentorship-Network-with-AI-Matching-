"use client";

import * as React from "react";
import { Check, X, Inbox, Loader2, AlertCircle, Clock } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface InboundRequest {
  id: string;
  student_id: string;
  student_name: string;
  goal: string;
  weekly_hours: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

function StatusBadge({ status }: { status: InboundRequest["status"] }) {
  if (status === "accepted")
    return <Badge tone="success" className="capitalize">Accepted</Badge>;
  if (status === "declined")
    return <Badge tone="danger" className="capitalize">Declined</Badge>;
  return (
    <Badge tone="accent" className="flex items-center gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export default function MentorRequestsPage() {
  const [requests, setRequests] = React.useState<InboundRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const fetchRequests = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/requests/inbound")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setRequests(d);
        else setError(d.error ?? "Failed to load requests.");
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const act = async (id: string, action: "accept" | "decline") => {
    setActing(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${id}/${action}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Action failed.");
        return;
      }
      // Refresh the list from server to reflect DB truth
      fetchRequests();
    } catch {
      setActionError("Could not reach the server.");
    } finally {
      setActing(null);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Inbound Mentee Requests"
        description="Review and respond to requests from students seeking your guidance."
      />

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {actionError}
        </div>
      )}

      {!loading && !error && pending.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" /> No pending requests. New matches will appear here.
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <Avatar name={r.student_name} />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.student_name}</p>
                    <Badge tone="neutral">{r.weekly_hours}h / week</Badge>
                    <span className="text-xs text-muted">
                      Requested {formatDate(r.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted line-clamp-3">{r.goal}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={acting === r.id}
                    onClick={() => act(r.id, "decline")}
                  >
                    {acting === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    disabled={acting === r.id}
                    onClick={() => act(r.id, "accept")}
                  >
                    {acting === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-medium">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={r.student_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.student_name}</p>
                    <p className="text-xs text-muted truncate">{r.goal.slice(0, 80)}…</p>
                  </div>
                  <StatusBadge status={r.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
