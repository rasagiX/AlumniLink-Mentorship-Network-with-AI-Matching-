"use client";

import * as React from "react";
import { Video, MapPin, Check, X, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PeerSession {
  id: string; requester_name: string; requester_role: string;
  session_type: "online" | "offline";
  proposed_date: string | null; proposed_time: string | null;
  topic: string | null; location_note: string | null;
  status: string; created_at: string;
}

export default function SeniorSessionsPage() {
  const [sessions, setSessions] = React.useState<PeerSession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"pending" | "confirmed" | "all">("pending");

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

  const tabs = [
    { id: "pending" as const, label: "Pending", count: sessions.filter((s) => s.status === "pending").length },
    { id: "confirmed" as const, label: "Confirmed", count: sessions.filter((s) => s.status === "confirmed").length },
    { id: "all" as const, label: "All", count: sessions.length },
  ];

  const visible = tab === "all" ? sessions : sessions.filter((s) => s.status === tab);

  return (
    <div>
      <PageHeader title="Sessions" description="All peer session requests from juniors and fellow seniors." />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-sm border border-line bg-surface p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-ink text-paper" : "text-muted hover:text-ink"
            )}>
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab === t.id ? "bg-paper/20 text-paper" : "bg-ink/10 text-ink"
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {error && <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Clock className="h-5 w-5" /> No sessions in this view.
        </div>
      )}

      <div className="space-y-3">
        {visible.map((s) => (
          <Card key={s.id} className={cn(s.status === "pending" && "border-accent/20")}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <Avatar name={s.requester_name} />
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{s.requester_name}</p>
                  <Badge tone="neutral" className="capitalize">{s.requester_role}</Badge>
                  <Badge tone={s.session_type === "online" ? "accent" : "success"} className="capitalize flex items-center gap-1">
                    {s.session_type === "online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                    {s.session_type}
                  </Badge>
                  {s.status === "confirmed" && <Badge tone="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>}
                  {s.status === "rejected" && <Badge tone="danger">Declined</Badge>}
                </div>
                {s.topic && <p className="text-sm text-muted">{s.topic}</p>}
                <p className="mt-0.5 text-xs text-muted">
                  {s.proposed_date ?? "Date TBD"}{s.proposed_time ? ` at ${s.proposed_time}` : ""}
                  {s.location_note ? ` · ${s.location_note}` : ""}
                </p>
              </div>
              {s.status === "pending" && (
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
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
