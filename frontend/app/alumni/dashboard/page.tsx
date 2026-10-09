"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowRight, Users, BookOpenCheck, Loader2, AlertCircle,
  Inbox, Video, MapPin, X, Check, Clock, CalendarDays, FileText,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface LMSModule { status: "locked" | "active" | "completed" }
interface Cycle {
  id: string; student_name: string; mentor_name: string;
  domain: string | null; total_weeks: number; current_week: number;
  is_active: boolean; modules: LMSModule[];
  available_days: string | null; class_start_date: string | null;
  class_time: string | null;
}
interface Session { name: string; email: string }

interface InboundBooking {
  id: string; cycle_id: string; student_name: string;
  session_type: "online" | "offline";
  proposed_date: string | null; proposed_time: string | null;
  note: string | null; status: string; created_at: string;
}

// ---------------------------------------------------------------------------
// Book Session Modal
// ---------------------------------------------------------------------------
const bookingSchema = z.object({
  session_type: z.enum(["online", "offline"]),
  proposed_date: z.string().min(1, "Pick a date"),
  proposed_time: z.string().min(1, "Pick a time"),
  note: z.string().optional(),
});
type BookingValues = z.infer<typeof bookingSchema>;

function BookSessionModal({
  cycle,
  defaultType,
  onClose,
  onBooked,
}: {
  cycle: Cycle;
  defaultType: "online" | "offline";
  onClose: () => void;
  onBooked: () => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<BookingValues>({
      resolver: zodResolver(bookingSchema),
      defaultValues: {
        session_type: defaultType,
        proposed_date: "",
        proposed_time: "",
        note: "",
      },
    });

  const sessionType = watch("session_type");

  const onSubmit = async (values: BookingValues) => {
    setServerError(null);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cycle_id: cycle.id, ...values }),
    });
    const d = await res.json();
    if (!res.ok) { setServerError(d.error ?? "Could not book session."); return; }
    onBooked();
    onClose();
  };

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
      <div className="w-full max-w-md rounded-md border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={cycle.student_name} />
            <div>
              <p className="font-medium">Book a Session — {cycle.student_name}</p>
              <p className="text-xs text-muted">{cycle.domain ?? "Mentorship"}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {serverError}
            </div>
          )}

          {/* Session type toggle */}
          <div>
            <Label className="mb-2 block">Session type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue("session_type", "online", { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-sm border px-4 py-4 text-sm font-medium transition-colors",
                  sessionType === "online"
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-muted hover:border-ink"
                )}
              >
                <Video className="h-5 w-5" />
                Online Session
                <span className="text-xs font-normal opacity-70">Video call / virtual</span>
              </button>
              <button
                type="button"
                onClick={() => setValue("session_type", "offline", { shouldValidate: true })}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-sm border px-4 py-4 text-sm font-medium transition-colors",
                  sessionType === "offline"
                    ? "border-ink bg-ink text-paper"
                    : "border-line text-muted hover:border-ink"
                )}
              >
                <MapPin className="h-5 w-5" />
                Offline Session
                <span className="text-xs font-normal opacity-70">In-person meeting</span>
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <Label htmlFor="proposed_date" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted" /> Proposed date
            </Label>
            <Input
              id="proposed_date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              {...register("proposed_date")}
            />
            {errors.proposed_date && (
              <p className="mt-1 text-xs text-danger">{errors.proposed_date.message}</p>
            )}
          </div>

          {/* Time */}
          <div>
            <Label htmlFor="proposed_time" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-muted" /> Proposed time
            </Label>
            <Input id="proposed_time" type="time" {...register("proposed_time")} />
            {errors.proposed_time && (
              <p className="mt-1 text-xs text-danger">{errors.proposed_time.message}</p>
            )}
          </div>

          {/* Note */}
          <div>
            <Label htmlFor="note" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-muted" /> Note
              <span className="text-xs font-normal text-muted">(optional)</span>
            </Label>
            <Textarea
              id="note"
              rows={2}
              placeholder={sessionType === "offline"
                ? "e.g. Meet at the library, room 204"
                : "e.g. I'll send the video link 10 min before"}
              {...register("note")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><Check className="h-3.5 w-3.5" /> Send Session Request</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MentorDashboard() {
  const [userSession, setUserSession] = React.useState<Session | null>(null);
  const [cycles, setCycles] = React.useState<Cycle[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bookingTarget, setBookingTarget] = React.useState<{ cycle: Cycle; type: "online" | "offline" } | null>(null);
  const [inboundBookings, setInboundBookings] = React.useState<InboundBooking[]>([]);
  const [bookingSuccess, setBookingSuccess] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => d.user && setUserSession(d.user))
      .catch(() => undefined);
  }, []);

  const fetchData = React.useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/lms/cycles").then((r) => r.json()),
      fetch("/api/sessions/inbound").then((r) => r.json()),
    ])
      .then(([cyclesData, bookingsData]) => {
        if (Array.isArray(cyclesData)) setCycles(cyclesData);
        else setError(cyclesData.error ?? "Failed to load data.");
        if (Array.isArray(bookingsData)) setInboundBookings(bookingsData);
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const pendingBookings = inboundBookings.filter((b) => b.status === "pending");

  const handleBookingAction = async (bookingId: string, action: "confirm" | "reject") => {
    const res = await fetch(`/api/sessions/${bookingId}/${action}`, { method: "PATCH" });
    if (res.ok) fetchData();
  };

  return (
    <div>
      <PageHeader
        title="Capacity Control Desk"
        description={userSession ? `Signed in as ${userSession.name} · ${userSession.email}` : "Loading…"}
      />

      {/* Stats bar */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Active Mentees</p>
            <p className="font-display text-2xl font-medium">{cycles.length}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Pending Requests</p>
            <Button asChild size="sm" variant="outline" className="mt-1">
              <Link href="/alumni/requests">View requests</Link>
            </Button>
          </div>
          {pendingBookings.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Session Requests</p>
              <Badge tone="accent" className="mt-1">{pendingBookings.length} pending</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending session booking requests */}
      {pendingBookings.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 font-display text-lg font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent" /> Pending Session Requests
          </h2>
          <div className="space-y-2">
            {pendingBookings.map((b) => (
              <Card key={b.id} className="border-accent/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-sm shrink-0",
                    b.session_type === "online" ? "bg-accent/10" : "bg-success/10"
                  )}>
                    {b.session_type === "online"
                      ? <Video className="h-4 w-4 text-accent" />
                      : <MapPin className="h-4 w-4 text-success" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium">{b.student_name}</p>
                      <Badge tone={b.session_type === "online" ? "accent" : "success"} className="capitalize">
                        {b.session_type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {b.proposed_date && `${b.proposed_date}`}
                      {b.proposed_time && ` at ${b.proposed_time}`}
                      {b.note && ` · ${b.note}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="danger" onClick={() => handleBookingAction(b.id, "reject")}>
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                    <Button size="sm" onClick={() => handleBookingAction(b.id, "confirm")}>
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {bookingSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-sm border border-success/30 bg-success/[0.06] px-4 py-3 text-sm text-success">
          <Check className="h-4 w-4 shrink-0" /> {bookingSuccess}
        </div>
      )}

      {/* Mentee cards */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-medium">Active Mentees</h2>
        <Badge tone="mentor">
          <Users className="mr-1 h-3 w-3" /> {cycles.length} active
        </Badge>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your mentees…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && cycles.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" />
          No active mentees yet.{" "}
          <Link href="/alumni/requests" className="underline underline-offset-2 hover:text-ink">
            Check pending requests
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {cycles.map((cycle) => {
          const completed = cycle.modules.filter((m) => m.status === "completed").length;
          const total = cycle.total_weeks;
          return (
            <Card key={cycle.id} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={cycle.student_name} />
                  <div>
                    <CardTitle>{cycle.student_name}</CardTitle>
                    <p className="text-xs text-muted">{cycle.domain ?? "Mentorship"}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                {/* Progress */}
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted">
                    <span>Week {cycle.current_week} of {total}</span>
                    <span>{completed} of {total} milestones</span>
                  </div>
                  <Progress value={total > 0 ? (completed / total) * 100 : 0} />
                </div>

                {/* Schedule summary */}
                {(cycle.available_days || cycle.class_time) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    {cycle.available_days && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {cycle.available_days.split(",").join(" · ")}
                      </span>
                    )}
                    {cycle.class_time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {cycle.class_time}
                      </span>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link href={`/alumni/lms/${cycle.id}`}>
                      <BookOpenCheck className="h-3.5 w-3.5" /> Open Authoring Desk
                      <ArrowRight className="ml-auto h-3.5 w-3.5" />
                    </Link>
                  </Button>

                  {/* Session booking buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-accent/40 text-accent hover:bg-accent/[0.06] hover:border-accent"
                      onClick={() => setBookingTarget({ cycle, type: "online" })}
                    >
                      <Video className="h-3.5 w-3.5" /> Online Session
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-success/40 text-success hover:bg-success/[0.06] hover:border-success"
                      onClick={() => setBookingTarget({ cycle, type: "offline" })}
                    >
                      <MapPin className="h-3.5 w-3.5" /> Offline Session
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Book Session Modal */}
      {bookingTarget && (
        <BookSessionModal
          cycle={bookingTarget.cycle}
          defaultType={bookingTarget.type}
          onClose={() => setBookingTarget(null)}
          onBooked={() => {
            fetchData();
            setBookingSuccess(`Session request sent to ${bookingTarget.cycle.student_name}.`);
            setTimeout(() => setBookingSuccess(null), 4000);
          }}
        />
      )}
    </div>
  );
}
