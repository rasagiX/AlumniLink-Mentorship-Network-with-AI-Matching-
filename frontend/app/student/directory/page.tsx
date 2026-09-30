"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2, ShieldAlert, UserRoundPlus, X,
  Loader2, AlertCircle, Send, Clock,
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
type Mentor = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  domain: string | null;
  capacity: number;
};

// ---------------------------------------------------------------------------
// Request form schema
// ---------------------------------------------------------------------------
const requestSchema = z.object({
  goal: z
    .string()
    .min(20, "Please describe your goal in at least 20 characters.")
    .max(2000, "Keep it under 2000 characters."),
  weekly_hours: z
    .string()
    .min(1, "Enter how many hours per week you can commit.")
    .max(20),
});
type RequestValues = z.infer<typeof requestSchema>;

// ---------------------------------------------------------------------------
// Request modal
// ---------------------------------------------------------------------------
function RequestModal({
  mentor,
  onClose,
  onSent,
}: {
  mentor: Mentor;
  onClose: () => void;
  onSent: (mentorId: string) => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({ resolver: zodResolver(requestSchema) });

  const onSubmit = async (values: RequestValues) => {
    setServerError(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentor_id: mentor.id, ...values }),
    });
    const data = await res.json();
    if (!res.ok) {
      setServerError(data.error ?? "Could not send request.");
      return;
    }
    onSent(mentor.id);
  };

  // Close on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-md border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar name={mentor.name} />
            <div>
              <p className="font-medium">{mentor.name}</p>
              <p className="text-xs text-muted">
                {mentor.title ?? "Alumni mentor"}
                {mentor.company ? ` · ${mentor.company}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-muted transition-colors hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {serverError}
            </div>
          )}

          <div>
            <Label htmlFor="goal">
              Your career goal{" "}
              <span className="text-xs font-normal text-muted">(min 20 characters)</span>
            </Label>
            <Textarea
              id="goal"
              rows={4}
              placeholder="e.g. I want to transition into product management at a tech company within the next 12 months. I'm currently a junior developer and want help with interview prep, portfolio building, and networking strategy."
              {...register("goal")}
              aria-invalid={!!errors.goal}
            />
            {errors.goal && (
              <p className="mt-1 text-xs text-danger">{errors.goal.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="weekly_hours">Hours per week you can commit</Label>
            <Input
              id="weekly_hours"
              placeholder="e.g. 3–5"
              {...register("weekly_hours")}
              aria-invalid={!!errors.weekly_hours}
            />
            {errors.weekly_hours && (
              <p className="mt-1 text-xs text-danger">{errors.weekly_hours.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-3.5 w-3.5" /> Send Request</>
              )}
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
export default function MentorDirectoryPage() {
  const [mentors, setMentors] = React.useState<Mentor[]>([]);
  const [domain, setDomain] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Track which mentors already have a pending/accepted request
  const [requestedIds, setRequestedIds] = React.useState<Set<string>>(new Set());
  const [selectedMentor, setSelectedMentor] = React.useState<Mentor | null>(null);

  // Load directory
  React.useEffect(() => {
    fetch("/api/mentors/directory")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load mentors.");
        setMentors(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load mentors."))
      .finally(() => setLoading(false));
  }, []);

  // Pre-load existing requests so we can grey out mentors already requested
  React.useEffect(() => {
    fetch("/api/requests/mine")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const ids = data
            .filter((r) => r.status === "pending" || r.status === "accepted")
            .map((r) => r.mentor_id as string);
          setRequestedIds(new Set(ids));
        }
      })
      .catch(() => undefined); // non-fatal
  }, []);

  const handleRequestSent = (mentorId: string) => {
    setRequestedIds((prev) => new Set([...prev, mentorId]));
    setSelectedMentor(null);
  };

  const domains = Array.from(
    new Set(mentors.map((m) => m.domain).filter(Boolean))
  ) as string[];
  const visible = domain ? mentors.filter((m) => m.domain === domain) : mentors;

  return (
    <div>
      <PageHeader
        title="Mentor Directory"
        description="Approved mentors registered in the AlumniLink platform."
      />

      {error && (
        <p className="mb-6 rounded-md border border-danger/30 bg-danger/[0.06] p-4 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Domain filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wide text-muted">Domains</span>
        <button
          onClick={() => setDomain(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            !domain ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink"
          )}
        >
          All
        </button>
        {domains.map((item) => (
          <button
            key={item}
            onClick={() => setDomain(item === domain ? null : item)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              item === domain
                ? "border-ink bg-ink text-paper"
                : "border-line text-muted hover:border-ink"
            )}
          >
            {item}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">{visible.length} mentors</span>
      </div>

      {/* Mentor cards */}
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading approved mentors…
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((mentor) => {
            const alreadyRequested = requestedIds.has(mentor.id);
            return (
              <Card
                key={mentor.id}
                className={cn(
                  "transition-shadow",
                  !alreadyRequested && "hover:shadow-md"
                )}
              >
                <CardContent className="flex flex-col gap-4 p-5">
                  {/* Mentor info */}
                  <div className="flex items-center gap-3">
                    <Avatar name={mentor.name} />
                    <div>
                      <p className="font-medium">{mentor.name}</p>
                      <p className="text-xs text-muted">
                        {mentor.title ?? "Alumni mentor"}
                        {mentor.company ? ` · ${mentor.company}` : ""}
                      </p>
                    </div>
                  </div>

                  {mentor.domain && (
                    <Badge tone="neutral" className="w-fit">
                      {mentor.domain}
                    </Badge>
                  )}

                  {/* Capacity row */}
                  <div className="flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Verified mentor · Capacity: {mentor.capacity}
                  </div>

                  {/* Action button */}
                  {alreadyRequested ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <Clock className="h-3.5 w-3.5" /> Request sent
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedMentor(mentor)}
                    >
                      <UserRoundPlus className="h-3.5 w-3.5" /> Send Request
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {!error && visible.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-sm text-muted">
              <ShieldAlert className="h-5 w-5" />
              No registered mentors are available yet.
            </div>
          )}
        </div>
      )}

      {/* Request modal */}
      {selectedMentor && (
        <RequestModal
          mentor={selectedMentor}
          onClose={() => setSelectedMentor(null)}
          onSent={handleRequestSent}
        />
      )}
    </div>
  );
}
