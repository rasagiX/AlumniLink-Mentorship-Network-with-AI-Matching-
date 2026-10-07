"use client";

import * as React from "react";
import {
  LifeBuoy, CheckCircle2, Clock, Loader2, AlertCircle,
  GraduationCap, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  user_name: string;
  user_role: "student" | "mentor";
  subject: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
}

function RoleBadge({ role }: { role: Ticket["user_role"] }) {
  return (
    <Badge tone={role === "student" ? "student" : "mentor"} className="flex items-center gap-1">
      {role === "student"
        ? <><GraduationCap className="h-3 w-3" /> Student</>
        : <><Users className="h-3 w-3" /> Mentor</>}
    </Badge>
  );
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [resolving, setResolving] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "open" | "resolved">("open");

  const fetchTickets = React.useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/support")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setTickets(d);
        else setError(d.error ?? "Failed to load tickets.");
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const resolve = async (ticketId: string) => {
    setResolving(ticketId);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/resolve`, { method: "PATCH" });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) => t.id === ticketId ? { ...t, status: "resolved" } : t)
        );
      }
    } finally {
      setResolving(null);
    }
  };

  const filtered = tickets.filter((t) =>
    filter === "all" ? true : t.status === filter
  );

  const openCount = tickets.filter((t) => t.status === "open").length;

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="All support requests submitted by students and mentors."
      />

      {/* Filter tabs */}
      <div className="mb-6 flex items-center gap-2">
        {(["open", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink"
            )}
          >
            {f}
            {f === "open" && openCount > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
                {openCount}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">{filtered.length} ticket{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tickets…
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <LifeBuoy className="h-5 w-5" />
          {filter === "open" ? "No open tickets — all clear." : "No tickets found."}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((t) => (
          <Card
            key={t.id}
            className={cn(t.status === "open" && "border-accent/30")}
          >
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{t.subject}</p>
                    <RoleBadge role={t.user_role} />
                    <Badge
                      tone={t.status === "open" ? "accent" : "success"}
                      className="flex items-center gap-1"
                    >
                      {t.status === "open"
                        ? <><Clock className="h-3 w-3" /> Open</>
                        : <><CheckCircle2 className="h-3 w-3" /> Resolved</>}
                    </Badge>
                  </div>

                  <p className="mb-1 text-xs text-muted">
                    From <span className="font-medium text-ink">{t.user_name}</span>
                    {" · "}
                    {new Date(t.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </p>

                  {/* Message — expandable */}
                  <p className={cn(
                    "text-sm text-muted transition-all",
                    expandedId === t.id ? "" : "line-clamp-2"
                  )}>
                    {t.message}
                  </p>
                  {t.message.length > 120 && (
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      {expandedId === t.id
                        ? <><ChevronUp className="h-3 w-3" /> Show less</>
                        : <><ChevronDown className="h-3 w-3" /> Read more</>}
                    </button>
                  )}
                </div>

                {/* Action */}
                {t.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={resolving === t.id}
                    onClick={() => resolve(t.id)}
                  >
                    {resolving === t.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Mark Resolved
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
