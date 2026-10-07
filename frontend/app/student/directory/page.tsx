"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2, ShieldAlert, UserRoundPlus, X,
  Loader2, AlertCircle, Send, Clock, CalendarDays, Timer,
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

type Mentor = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  domain: string | null;
  capacity: number;
};

// ---------------------------------------------------------------------------
// Enhanced request schema
// ---------------------------------------------------------------------------
const requestSchema = z.object({
  goal: z.string().min(20, "Describe your goal in at least 20 characters.").max(2000),
  weekly_hours: z.string().min(1, "Enter how many hours per week.").max(20),
  desired_weeks: z.coerce.number().min(1, "Min 1 week").max(52, "Max 52 weeks").optional(),
  available_asap: z.boolean(),
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
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { available_asap: true },
  });

  const availableAsap = watch("available_asap");

  const onSubmit = async (values: RequestValues) => {
    setServerError(null);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mentor_id: mentor.id, ...values }),
    });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Could not send request."); return; }
    onSent(mentor.id);
  };

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-md border border-line bg-surface shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
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
          <button onClick={onClose} className="rounded-sm p-1 text-muted hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {serverError}
            </div>
          )}

          {/* Goal */}
          <div>
            <Label htmlFor="goal">
              Your career goal
              <span className="ml-1 text-xs font-normal text-muted">(min 20 characters)</span>
            </Label>
            <Textarea
              id="goal"
              rows={5}
              placeholder="e.g. I want to transition into product management at a tech company within the next 12 months. I'm currently a junior developer and want help with interview prep, portfolio building, and networking strategy."
              {...register("goal")}
            />
            {errors.goal && <p className="mt-1 text-xs text-danger">{errors.goal.message}</p>}
          </div>

          {/* Weekly hours */}
          <div>
            <Label htmlFor="weekly_hours" className="flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5 text-muted" /> Hours per week you can commit
            </Label>
            <Input
              id="weekly_hours"
              placeholder="e.g. 3–5"
              {...register("weekly_hours")}
            />
            {errors.weekly_hours && <p className="mt-1 text-xs text-danger">{errors.weekly_hours.message}</p>}
          </div>

          {/* Desired weeks */}
          <div>
            <Label htmlFor="desired_weeks" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted" /> How many weeks do you want the programme to run?
              <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
            </Label>
            <Input
              id="desired_weeks"
              type="number"
              min={1}
              max={52}
              placeholder="e.g. 12"
              className="w-32"
              {...register("desired_weeks")}
            />
            {errors.desired_weeks && <p className="mt-1 text-xs text-danger">{errors.desired_weeks.message}</p>}
            <p className="mt-1 text-xs text-muted">
              Leave blank if you're flexible. The mentor will set the final duration when accepting.
            </p>
          </div>

          {/* Availability toggle */}
          <div>
            <Label className="flex items-center gap-1.5 mb-2">
              <Clock className="h-3.5 w-3.5 text-muted" /> When can you start?
            </Label>
            <Controller
              name="available_asap"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => field.onChange(true)}
                    className={cn(
                      "flex-1 rounded-sm border px-4 py-3 text-sm font-medium transition-colors",
                      field.value
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-muted hover:border-ink"
                    )}
                  >
                    <span className="block text-base">⚡</span>
                    Available ASAP
                    <span className="mt-0.5 block text-xs font-normal opacity-70">
                      I'm ready to start immediately
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => field.onChange(false)}
                    className={cn(
                      "flex-1 rounded-sm border px-4 py-3 text-sm font-medium transition-colors",
                      !field.value
                        ? "border-ink bg-ink text-paper"
                        : "border-line text-muted hover:border-ink"
                    )}
                  >
                    <span className="block text-base">📅</span>
                    Flexible start
                    <span className="mt-0.5 block text-xs font-normal opacity-70">
                      I can discuss timing
                    </span>
                  </button>
                </div>
              )}
            />
            <p className="mt-1 text-xs text-muted">
              {availableAsap
                ? "You've indicated you're available to start as soon as the mentor accepts."
                : "You've indicated you're flexible on timing — the mentor will set the start date."}
            </p>
          </div>

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
// Page
// ---------------------------------------------------------------------------
export default function MentorDirectoryPage() {
  const [mentors, setMentors] = React.useState<Mentor[]>([]);
  const [domain, setDomain] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [requestedIds, setRequestedIds] = React.useState<Set<string>>(new Set());
  const [selectedMentor, setSelectedMentor] = React.useState<Mentor | null>(null);

  React.useEffect(() => {
    fetch("/api/mentors/directory")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Could not load mentors.");
        setMentors(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetch("/api/requests/mine")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setRequestedIds(new Set(
            d.filter((r) => r.status === "pending" || r.status === "accepted").map((r) => r.mentor_id)
          ));
        }
      })
      .catch(() => undefined);
  }, []);

  const handleRequestSent = (mentorId: string) => {
    setRequestedIds((prev) => new Set([...prev, mentorId]));
    setSelectedMentor(null);
  };

  const domains = Array.from(new Set(mentors.map((m) => m.domain).filter(Boolean))) as string[];
  const visible = domain ? mentors.filter((m) => m.domain === domain) : mentors;

  return (
    <div>
      <PageHeader
        title="Mentor Directory"
        description="Approved alumni mentors registered on the AlumniLink platform."
      />

      {error && (
        <p className="mb-6 rounded-md border border-danger/30 bg-danger/[0.06] p-4 text-sm text-danger">{error}</p>
      )}

      {/* Domain filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wide text-muted">Domain</span>
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
              item === domain ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink"
            )}
          >
            {item}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">{visible.length} mentors</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading mentors…
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((mentor) => {
            const already = requestedIds.has(mentor.id);
            return (
              <Card key={mentor.id} className={cn("transition-shadow", !already && "hover:shadow-md")}>
                <CardContent className="flex flex-col gap-4 p-5">
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

                  {mentor.domain && <Badge tone="neutral" className="w-fit">{mentor.domain}</Badge>}

                  <div className="flex items-center gap-2 border-t border-line pt-3 text-xs text-muted">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    Verified mentor · Capacity: {mentor.capacity}
                  </div>

                  {already ? (
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <Clock className="h-3.5 w-3.5" /> Request sent
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => setSelectedMentor(mentor)}>
                      <UserRoundPlus className="h-3.5 w-3.5" /> Send Request
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {!error && visible.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-sm text-muted">
              <ShieldAlert className="h-5 w-5" /> No mentors available yet.
            </div>
          )}
        </div>
      )}

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
