"use client";

import * as React from "react";
import {
  Video, MapPin, Check, X, Loader2, AlertCircle,
  Clock, CheckCircle2, GraduationCap, Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PeerSession {
  id: string; requester_id: string; requester_name: string; requester_role: string;
  session_type: "online" | "offline";
  proposed_date: string | null; proposed_time: string | null;
  topic: string | null; location_note: string | null;
  status: string; created_at: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "confirmed") return <Badge tone="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>;
  if (status === "rejected") return <Badge tone="danger">Declined</Badge>;
  return <Badge tone="accent" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
}

export default function SeniorJuniorsPage() {
  const [sessions, setSessions] = React.useState<PeerSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<string | null>(null);

  const fetchSessions = React.useCallback(() => {
    setLoading(true);
    fetch("/api/peer-sessions/inbound")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setSessions(d);
        else setError(d.error ?? "Failed to load.");
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const act = async (id: string, action: "confirm" | "reject") => {
    setActing(id);
    try {
      const res = await fetch(`/api/peer-sessions/${id}/${action}`, { method: "PATCH" });
      if (res.ok) fetchSessions();
    } finally { setActing(null); }
  };

  const pending = sessions.filter((s) => s.status === "pending");
  const resolved = sessions.filter((s) => s.status !== "pending");

  return (
    <div>
      <PageHeader
        title="My Juniors"
        description="Session requests from students who want to connect with you."
      />

      {loading && <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && pending.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" /> No pending session requests.
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8 space-y-3">
          {pending.map((s) => (
            <Card key={s.id} className="border-accent/20">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
                <Avatar name={s.requester_name} />
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{s.requester_name}</p>
                    <Badge tone="neutral" className="capitalize flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" /> {s.requester_role}
                    </Badge>
                    <Badge tone={s.session_type === "online" ? "accent" : "success"} className="capitalize flex items-center gap-1">
                      {s.session_type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                      {s.session_type}
                    </Badge>
                  </div>
                  {s.topic && <p className="text-sm text-muted">{s.topic}</p>}
                  <p className="mt-0.5 text-xs text-muted">
                    {s.proposed_date ?? "Date TBD"}
                    {s.proposed_time ? ` at ${s.proposed_time}` : ""}
                    {s.location_note ? ` · ${s.location_note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="danger" disabled={acting === s.id} onClick={() => act(s.id, "reject")}>
                    {acting === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Decline
                  </Button>
                  <Button size="sm" disabled={acting === s.id} onClick={() => act(s.id, "confirm")}>
                    {acting === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Confirm
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-lg font-medium">Past Sessions</h2>
          <div className="space-y-2">
            {resolved.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={s.requester_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{s.requester_name}</p>
                    <p className="text-xs text-muted capitalize">
                      {s.session_type} · {s.proposed_date ?? "No date"}{s.proposed_time ? ` at ${s.proposed_time}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
