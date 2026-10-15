"use client";

import * as React from "react";
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, UserCheck,
  Linkedin, Building2, Briefcase, Clock, Inbox,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Application {
  id: string;
  name: string;
  email: string;
  title: string | null;
  company: string | null;
  domain: string | null;
  linkedin_url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
}

function StatusBadge({ status }: { status: Application["status"] }) {
  if (status === "approved") return <Badge tone="success" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
  return <Badge tone="accent" className="flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
}

export default function AlumniApplicationsPage() {
  const [apps, setApps] = React.useState<Application[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [rejectReason, setRejectReason] = React.useState<Record<string, string>>({});

  const fetchApps = React.useCallback(() => {
    setLoading(true);
    setError(null);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    fetch(`/api/admin/alumni-applications${qs}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setApps(d); else setError(d.error ?? "Failed to load."); })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, [filter]);

  React.useEffect(() => { fetchApps(); }, [fetchApps]);

  const approve = async (appId: string) => {
    setActing(appId); setActionError(null);
    const res = await fetch(`/api/admin/alumni-applications/${appId}/approve`, { method: "PATCH" });
    const d = await res.json();
    if (!res.ok) { setActionError(d.error ?? "Approval failed."); }
    else { fetchApps(); }
    setActing(null);
  };

  const reject = async (appId: string) => {
    setActing(appId); setActionError(null);
    const res = await fetch(`/api/admin/alumni-applications/${appId}/reject`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason[appId] ?? "" }),
    });
    const d = await res.json();
    if (!res.ok) { setActionError(d.error ?? "Rejection failed."); }
    else { fetchApps(); }
    setActing(null);
  };

  const FILTER_TABS = [
    { id: "pending"  as const, label: "Pending"  },
    { id: "approved" as const, label: "Approved" },
    { id: "rejected" as const, label: "Rejected" },
    { id: "all"      as const, label: "All"      },
  ];

  return (
    <div>
      <PageHeader
        title="Alumni Applications"
        description="Review self-submitted alumni registration requests. Approve to create their account."
      />

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-sm border border-line bg-surface p-1">
        {FILTER_TABS.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)}
            className={cn("flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              filter === t.id ? "bg-ink text-paper" : "text-muted hover:text-ink")}>
            {t.label}
          </button>
        ))}
      </div>

      {(error || actionError) && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error ?? actionError}
        </div>
      )}

      {loading && <div className="flex items-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}

      {!loading && apps.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" />
          {filter === "pending" ? "No pending applications." : "No applications found."}
        </div>
      )}

      <div className="space-y-4">
        {apps.map((a) => (
          <Card key={a.id} className={a.status === "pending" ? "border-accent/30" : ""}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={a.name} />
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <span className="text-xs text-muted">{a.email}</span>
                    <StatusBadge status={a.status} />
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted mb-2">
                    {a.title && (
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {a.title}</span>
                    )}
                    {a.company && (
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {a.company}</span>
                    )}
                    {a.domain && (
                      <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" /> {a.domain}</span>
                    )}
                    {a.linkedin_url && (
                      <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-accent hover:underline">
                        <Linkedin className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                  </div>

                  {a.rejection_reason && (
                    <p className="text-xs text-danger">Rejected: {a.rejection_reason}</p>
                  )}

                  {/* Reject reason input for pending */}
                  {a.status === "pending" && (
                    <Input
                      placeholder="Rejection reason (optional)"
                      className="mt-2 h-8 text-xs"
                      value={rejectReason[a.id] ?? ""}
                      onChange={(e) => setRejectReason((prev) => ({ ...prev, [a.id]: e.target.value }))}
                    />
                  )}
                </div>

                {/* Actions */}
                {a.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="danger" disabled={acting === a.id} onClick={() => reject(a.id)}>
                      {acting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Reject
                    </Button>
                    <Button size="sm" disabled={acting === a.id} onClick={() => approve(a.id)}>
                      {acting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Approve
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
