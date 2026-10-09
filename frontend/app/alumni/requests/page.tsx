"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check, X, Inbox, Loader2, AlertCircle, Clock,
  CalendarDays, Timer, Users, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InboundRequest {
  id: string;
  student_id: string;
  student_name: string;
  goal: string;
  weekly_hours: string;
  desired_weeks: number | null;
  available_asap: boolean;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

// ---------------------------------------------------------------------------
// Accept schedule schema
// ---------------------------------------------------------------------------
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const acceptSchema = z.object({
  total_weeks: z.coerce.number().min(1, "Min 1 week").max(52, "Max 52 weeks"),
  class_start_date: z.string().min(1, "Pick a start date"),
  class_time: z.string().min(1, "Pick a class time"),
  available_days: z.array(z.string()).min(1, "Select at least one day"),
});
type AcceptValues = z.infer<typeof acceptSchema>;

// ---------------------------------------------------------------------------
// Accept modal
// ---------------------------------------------------------------------------
function AcceptModal({
  request,
  onClose,
  onAccepted,
}: {
  request: InboundRequest;
  onClose: () => void;
  onAccepted: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AcceptValues>({
    resolver: zodResolver(acceptSchema),
    defaultValues: {
      total_weeks: request.desired_weeks ?? 12,
      class_start_date: "",
      class_time: "",
      available_days: [],
    },
  });

  const selectedDays = watch("available_days") ?? [];

  const toggleDay = (day: string) => {
    const current = selectedDays;
    if (current.includes(day)) {
      setValue("available_days", current.filter((d) => d !== day), { shouldValidate: true });
    } else {
      setValue("available_days", [...current, day], { shouldValidate: true });
    }
  };

  const onSubmit = async (values: AcceptValues) => {
    setServerError(null);
    const res = await fetch(`/api/requests/${request.id}/accept`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data.error ?? "Could not accept request.");
      return;
    }
    onAccepted();
    onClose();
  };

  // Close on Escape
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-md border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={request.student_name} />
            <div>
              <p className="font-medium">Accept — {request.student_name}</p>
              <p className="text-xs text-muted">Set up the programme schedule</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Student request summary */}
        <div className="border-b border-line bg-ink/[0.02] px-5 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted mb-1">Student's goal</p>
          <p className="text-sm text-ink line-clamp-3">{request.goal}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Timer className="h-3 w-3" /> {request.weekly_hours}h / week requested
            </span>
            {request.desired_weeks && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {request.desired_weeks} weeks desired
              </span>
            )}
            <span className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              request.available_asap
                ? "bg-success/10 text-success"
                : "bg-muted/20 text-muted"
            )}>
              {request.available_asap ? "✓ Available ASAP" : "Flexible start"}
            </span>
          </div>
        </div>

        {/* Schedule form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {serverError}
            </div>
          )}

          {/* Total weeks */}
          <div>
            <Label htmlFor="total_weeks" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted" /> Total programme weeks
            </Label>
            <Input
              id="total_weeks"
              type="number"
              min={1}
              max={52}
              className="w-32"
              {...register("total_weeks")}
            />
            {errors.total_weeks && (
              <p className="mt-1 text-xs text-danger">{errors.total_weeks.message}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              Student requested {request.desired_weeks ?? "not specified"} weeks.
            </p>
          </div>

          {/* Class start date */}
          <div>
            <Label htmlFor="class_start_date" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted" /> Classes start on
            </Label>
            <Input
              id="class_start_date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              {...register("class_start_date")}
            />
            {errors.class_start_date && (
              <p className="mt-1 text-xs text-danger">{errors.class_start_date.message}</p>
            )}
          </div>

          {/* Class time */}
          <div>
            <Label htmlFor="class_time" className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-muted" /> Class time
            </Label>
            <Input
              id="class_time"
              type="time"
              {...register("class_time")}
            />
            {errors.class_time && (
              <p className="mt-1 text-xs text-danger">{errors.class_time.message}</p>
            )}
            <p className="mt-1 text-xs text-muted">
              The recurring time slot each class will take place.
            </p>
          </div>

          {/* Available days */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-muted" /> Your available days
            </Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => {
                const active = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-muted hover:border-ink hover:text-ink"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {errors.available_days && (
              <p className="mt-1 text-xs text-danger">{errors.available_days.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Accepting…</>
              ) : (
                <><Check className="h-3.5 w-3.5" /> Confirm & Accept</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: InboundRequest["status"] }) {
  if (status === "accepted") return <Badge tone="success">Accepted</Badge>;
  if (status === "declined") return <Badge tone="danger">Declined</Badge>;
  return (
    <Badge tone="accent" className="flex items-center gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MentorRequestsPage() {
  const [requests, setRequests] = React.useState<InboundRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [acting, setActing] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [acceptTarget, setAcceptTarget] = React.useState<InboundRequest | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

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

  const decline = async (id: string) => {
    setActing(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/requests/${id}/decline`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) { setActionError(data.error ?? "Could not decline."); return; }
      fetchRequests();
    } catch { setActionError("Could not reach the server."); }
    finally { setActing(null); }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Inbound Mentee Requests"
        description="Review student requests. Accepting opens a schedule form to set up the programme."
      />

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading requests…
        </div>
      )}

      {(error || actionError) && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error ?? actionError}
        </div>
      )}

      {!loading && !error && pending.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" /> No pending requests.
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3 mb-8">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar name={r.student_name} />
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <p className="font-medium">{r.student_name}</p>
                      <Badge tone="neutral">{r.weekly_hours}h/wk</Badge>
                      {r.desired_weeks && (
                        <Badge tone="neutral">{r.desired_weeks} weeks</Badge>
                      )}
                      {r.available_asap && (
                        <Badge tone="success">Available ASAP</Badge>
                      )}
                      <span className="text-xs text-muted">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    {/* Goal — expandable */}
                    <p className={cn(
                      "text-sm text-muted transition-all",
                      expandedId === r.id ? "" : "line-clamp-2"
                    )}>
                      {r.goal}
                    </p>
                    {r.goal.length > 120 && (
                      <button
                        onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        className="mt-1 flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        {expandedId === r.id ? (
                          <><ChevronUp className="h-3 w-3" /> Show less</>
                        ) : (
                          <><ChevronDown className="h-3 w-3" /> Read more</>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={acting === r.id}
                      onClick={() => decline(r.id)}
                    >
                      {acting === r.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />}
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      disabled={acting === r.id}
                      onClick={() => setAcceptTarget(r)}
                    >
                      <Check className="h-3.5 w-3.5" /> Accept
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 font-display text-lg font-medium">Resolved</h2>
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

      {/* Accept modal */}
      {acceptTarget && (
        <AcceptModal
          request={acceptTarget}
          onClose={() => setAcceptTarget(null)}
          onAccepted={fetchRequests}
        />
      )}
    </div>
  );
}
