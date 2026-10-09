"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, Video, MapPin, Send, X, Loader2, AlertCircle,
  Clock, CheckCircle2, BookOpen, Linkedin, MapPinned,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Senior {
  id: string; name: string; email: string;
  year: number | null; branch: string | null;
  bio: string | null; skills: string | null;
  campus_location: string | null; linkedin_url: string | null;
}

interface MySession {
  id: string; senior_id: string; session_type: string; status: string;
}

// ---------------------------------------------------------------------------
// Session request schema
// ---------------------------------------------------------------------------
const sessionSchema = z.object({
  session_type: z.enum(["online", "offline"]),
  proposed_date: z.string().optional(),
  proposed_time: z.string().optional(),
  topic: z.string().max(500).optional(),
  location_note: z.string().max(300).optional(),
});
type SessionValues = z.infer<typeof sessionSchema>;

// ---------------------------------------------------------------------------
// Session Request Modal
// ---------------------------------------------------------------------------
function SessionModal({
  senior,
  defaultType,
  onClose,
  onSent,
}: {
  senior: Senior;
  defaultType: "online" | "offline";
  onClose: () => void;
  onSent: (seniorId: string) => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<SessionValues>({
      resolver: zodResolver(sessionSchema),
      defaultValues: { session_type: defaultType },
    });

  const sessionType = watch("session_type");

  const onSubmit = async (values: SessionValues) => {
    setServerError(null);
    const res = await fetch("/api/peer-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senior_id: senior.id, ...values }),
    });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Could not send request."); return; }
    onSent(senior.id);
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
            <Avatar name={senior.name} />
            <div>
              <p className="font-medium">{senior.name}</p>
              <p className="text-xs text-muted">
                {senior.year ? `Year ${senior.year}` : ""}
                {senior.branch ? ` · ${senior.branch}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-muted hover:text-ink"><X className="h-4 w-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {serverError}
            </div>
          )}

          {/* Session type */}
          <div>
            <Label className="mb-2 block">Session type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["online", "offline"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("session_type", type)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-sm border px-4 py-4 text-sm font-medium transition-colors",
                    sessionType === type ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink"
                  )}
                >
                  {type === "online" ? <Video className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
                  {type === "online" ? "Online" : "Offline"}
                  <span className="text-[11px] font-normal opacity-70">
                    {type === "online" ? "Video call" : "Meet on campus"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic */}
          <div>
            <Label htmlFor="topic">What do you want to discuss?
              <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
            </Label>
            <Textarea id="topic" rows={3}
              placeholder="e.g. Advice on choosing electives, internship tips, project guidance…"
              {...register("topic")} />
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="proposed_date">Preferred date</Label>
              <Input id="proposed_date" type="date"
                min={new Date().toISOString().slice(0, 10)}
                {...register("proposed_date")} />
            </div>
            <div>
              <Label htmlFor="proposed_time">Preferred time</Label>
              <Input id="proposed_time" type="time" {...register("proposed_time")} />
            </div>
          </div>

          {/* Location note — only for offline */}
          {sessionType === "offline" && (
            <div>
              <Label htmlFor="location_note" className="flex items-center gap-1.5">
                <MapPinned className="h-3.5 w-3.5 text-muted" /> Preferred location on campus
                <span className="text-xs font-normal text-muted">(optional)</span>
              </Label>
              <Input id="location_note" placeholder="e.g. Library ground floor, cafeteria…"
                {...register("location_note")} />
              {senior.campus_location && (
                <p className="mt-1 text-xs text-muted">
                  {senior.name} is usually at: <strong>{senior.campus_location}</strong>
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><Send className="h-3.5 w-3.5" /> Send Request</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Senior Card
// ---------------------------------------------------------------------------
function SeniorCard({
  senior,
  alreadyRequested,
  onBook,
}: {
  senior: Senior;
  alreadyRequested: boolean;
  onBook: (senior: Senior, type: "online" | "offline") => void;
}) {
  const skills = senior.skills ? senior.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];

  return (
    <Card className={cn("flex flex-col transition-shadow", !alreadyRequested && "hover:shadow-md")}>
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar name={senior.name} />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{senior.name}</p>
            <p className="text-xs text-muted">
              {senior.year ? `Year ${senior.year}` : ""}
              {senior.branch ? ` · ${senior.branch}` : ""}
              {!senior.year && !senior.branch && "Senior Student"}
            </p>
          </div>
          {senior.linkedin_url && (
            <a href={senior.linkedin_url} target="_blank" rel="noopener noreferrer"
              className="rounded-sm p-1 text-muted transition-colors hover:text-ink" title="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </a>
          )}
        </div>

        {/* Bio */}
        {senior.bio && (
          <p className="text-xs text-muted line-clamp-3">{senior.bio}</p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {skills.slice(0, 4).map((skill) => (
              <span key={skill}
                className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                {skill}
              </span>
            ))}
            {skills.length > 4 && (
              <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted">
                +{skills.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Campus location */}
        {senior.campus_location && (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <MapPin className="h-3 w-3 shrink-0" />
            {senior.campus_location}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-auto pt-2 border-t border-line">
          {alreadyRequested ? (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Session request sent
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline"
                className="gap-1.5 border-accent/40 text-accent hover:bg-accent/[0.06] hover:border-accent"
                onClick={() => onBook(senior, "online")}>
                <Video className="h-3.5 w-3.5" /> Online
              </Button>
              <Button size="sm" variant="outline"
                className="gap-1.5 border-success/40 text-success hover:bg-success/[0.06] hover:border-success"
                onClick={() => onBook(senior, "offline")}>
                <MapPin className="h-3.5 w-3.5" /> Offline
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function StudentSeniorsPage() {
  const [seniors, setSeniors] = React.useState<Senior[]>([]);
  const [mySessions, setMySessions] = React.useState<MySession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [yearFilter, setYearFilter] = React.useState<number | null>(null);
  const [branchFilter, setBranchFilter] = React.useState("");
  const [bookingTarget, setBookingTarget] = React.useState<{ senior: Senior; type: "online" | "offline" } | null>(null);
  const [requestedIds, setRequestedIds] = React.useState<Set<string>>(new Set());

  const fetchData = React.useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (yearFilter) qs.set("year", String(yearFilter));
    if (branchFilter) qs.set("branch", branchFilter);

    Promise.all([
      fetch(`/api/profile/seniors${qs.toString() ? `?${qs}` : ""}`).then((r) => r.json()),
      fetch("/api/peer-sessions").then((r) => r.json()),
    ])
      .then(([s, m]) => {
        if (Array.isArray(s)) setSeniors(s);
        else setError(s.error ?? "Failed to load seniors.");
        if (Array.isArray(m)) {
          setMySessions(m);
          setRequestedIds(new Set(
            m.filter((x: MySession) => x.status === "pending" || x.status === "confirmed")
              .map((x: MySession) => x.senior_id)
          ));
        }
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setLoading(false));
  }, [yearFilter, branchFilter]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const handleSent = (seniorId: string) => {
    setRequestedIds((prev) => new Set([...prev, seniorId]));
    setBookingTarget(null);
  };

  const years = Array.from(new Set(seniors.map((s) => s.year).filter(Boolean))) as number[];
  const YEAR_LABEL: Record<number, string> = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year", 5: "5th Year", 6: "Final Year" };

  return (
    <div>
      <PageHeader
        title="Senior Directory"
        description="Connect with seniors in higher years for guidance, study help, and career advice."
      />

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted">Year</span>
          <button
            onClick={() => setYearFilter(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !yearFilter ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink"
            )}
          >All</button>
          {[...Array.from(new Set(seniors.map((s) => s.year).filter(Boolean) as number[]))].sort().map((y) => (
            <button
              key={y}
              onClick={() => setYearFilter(y === yearFilter ? null : y)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                y === yearFilter ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink"
              )}
            >{YEAR_LABEL[y] ?? `Year ${y}`}</button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 text-muted" />
          <Input
            placeholder="Filter by branch…"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-8 w-40 text-xs"
          />
        </div>

        <span className="text-xs text-muted">{seniors.length} seniors</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading seniors…
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {!loading && !error && seniors.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-20 text-center text-sm text-muted">
          <Users className="h-5 w-5" />
          No seniors registered yet.
          <p className="text-xs max-w-xs">
            Seniors need to register and fill in their profile for their cards to appear here.
          </p>
        </div>
      )}

      {/* Cards */}
      {seniors.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {seniors.map((senior) => (
            <SeniorCard
              key={senior.id}
              senior={senior}
              alreadyRequested={requestedIds.has(senior.id)}
              onBook={(s, type) => setBookingTarget({ senior: s, type })}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {bookingTarget && (
        <SessionModal
          senior={bookingTarget.senior}
          defaultType={bookingTarget.type}
          onClose={() => setBookingTarget(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
