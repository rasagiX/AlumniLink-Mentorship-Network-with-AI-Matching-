"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2, ShieldAlert, UserRoundPlus, X,
  Loader2, AlertCircle, Send, Clock, CalendarDays, Timer,
  Sparkles, Star, Zap, ChevronDown, ChevronUp,
  MessageSquare, BookOpen, RotateCcw, BrainCircuit,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMentorMatch, type MentorMatchItem } from "@/lib/use-mentor-match";

// ─── Types ────────────────────────────────────────────────────────────────────
type DirectoryMentor = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  domain: string | null;
  capacity: number;
};

// ─── Request modal schema ─────────────────────────────────────────────────────
const requestSchema = z.object({
  goal: z.string().min(20, "Describe your goal in at least 20 characters.").max(2000),
  weekly_hours: z.string().min(1, "Enter how many hours per week.").max(20),
  desired_weeks: z.coerce.number().min(1).max(52).optional(),
  available_asap: z.boolean(),
});
type RequestValues = z.infer<typeof requestSchema>;

// ─── AI match query schema ────────────────────────────────────────────────────
const aiSchema = z.object({
  target_role:          z.string().min(3, "Enter your target role (e.g. 'Software Engineer')"),
  semester:             z.string().min(1, "Enter your year/semester (e.g. '5th semester')"),
  skills_and_interests: z.string().default(""),
  bio:                  z.string().optional(),
});
type AiValues = z.infer<typeof aiSchema>;

// ─── Match score badge ────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "success" : score >= 60 ? "accent" : "warning";
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold",
      tone === "success" && "bg-green-500/15 text-green-400",
      tone === "accent"  && "bg-blue-500/15  text-blue-400",
      tone === "warning" && "bg-yellow-500/15 text-yellow-400",
    )}>
      <Star className="h-2.5 w-2.5 fill-current" />
      {score}% match
    </span>
  );
}

// ─── AI match result card ─────────────────────────────────────────────────────
function AiMatchCard({
  match, alreadyRequested, onRequest,
}: {
  match: MentorMatchItem;
  alreadyRequested: boolean;
  onRequest: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="overflow-hidden border-line/60 transition-shadow hover:shadow-card-hover">
      {/* Score accent line */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, hsl(var(--accent)/${Math.round(match.match_score / 100 * 0.8 + 0.2)}) 0%, hsl(var(--role-mentor)/0.4) 100%)`,
        }}
      />
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar alt={match.mentor_name} size="md" />
            <div className="min-w-0">
              <p className="font-semibold text-ink truncate">{match.mentor_name}</p>
              <p className="text-xs text-muted/80 truncate">
                {match.title ?? "Alumni Mentor"}
                {match.company ? ` · ${match.company}` : ""}
              </p>
            </div>
          </div>
          <ScoreBadge score={match.match_score} />
        </div>

        {/* Domain */}
        {match.domain && (
          <Badge tone="mentor" className="w-fit">{match.domain}</Badge>
        )}

        {/* Match reasons */}
        <div className="space-y-1.5">
          {match.match_reasons.map((reason, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted/80">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
              {reason}
            </div>
          ))}
        </div>

        {/* Expandable section */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between text-xs text-muted/60 hover:text-ink transition-colors pt-1 border-t border-line/40"
        >
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Icebreaker & focus areas
          </span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="space-y-3 animate-fade-up">
            {/* Icebreaker */}
            <div className="rounded-xl border border-accent/20 bg-accent/[0.06] p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-accent/70">
                <MessageSquare className="h-3 w-3" /> Suggested Icebreaker
              </div>
              <p className="text-xs text-muted/90 leading-relaxed italic">
                "{match.suggested_icebreaker}"
              </p>
            </div>

            {/* Focus areas */}
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted/60">
                <BookOpen className="h-3 w-3" /> Recommended Focus Areas
              </div>
              <div className="flex flex-wrap gap-1.5">
                {match.recommended_focus_areas.map((area, i) => (
                  <span key={i} className="rounded-full border border-line/60 bg-surface2 px-2.5 py-0.5 text-[11px] text-muted/80">
                    {area}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        {alreadyRequested ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            <Clock className="h-3.5 w-3.5" /> Request sent
          </Button>
        ) : (
          <Button size="sm" variant="accent" className="w-full" onClick={onRequest}>
            <UserRoundPlus className="h-3.5 w-3.5" /> Send Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Standard directory card ──────────────────────────────────────────────────
function DirectoryCard({
  mentor, alreadyRequested, onRequest,
}: {
  mentor: DirectoryMentor;
  alreadyRequested: boolean;
  onRequest: () => void;
}) {
  return (
    <Card className="transition-shadow hover:shadow-card-hover">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Avatar alt={mentor.name} size="md" />
          <div>
            <p className="font-semibold text-ink">{mentor.name}</p>
            <p className="text-xs text-muted/80">
              {mentor.title ?? "Alumni mentor"}
              {mentor.company ? ` · ${mentor.company}` : ""}
            </p>
          </div>
        </div>
        {mentor.domain && <Badge tone="mentor" className="w-fit">{mentor.domain}</Badge>}
        <div className="flex items-center gap-2 border-t border-line/40 pt-3 text-xs text-muted/60">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          Verified · Capacity: {mentor.capacity}
        </div>
        {alreadyRequested ? (
          <Button size="sm" variant="outline" disabled className="w-full">
            <Clock className="h-3.5 w-3.5" /> Request sent
          </Button>
        ) : (
          <Button size="sm" className="w-full" onClick={onRequest}>
            <UserRoundPlus className="h-3.5 w-3.5" /> Send Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Request modal ────────────────────────────────────────────────────────────
function RequestModal({ mentor, icebreaker, onClose, onSent }: {
  mentor: { id: string; name: string; title: string | null; company: string | null };
  icebreaker?: string;
  onClose: () => void;
  onSent: (mentorId: string) => void;
}) {
  const [serverError, setServerError] = React.useState<string | null>(null);
  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { available_asap: true, goal: icebreaker ?? "" },
  });

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const onSubmit = async (values: RequestValues) => {
    setServerError(null);
    const res  = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mentor_id: mentor.id, ...values }) });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Could not send request."); return; }
    onSent(mentor.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/60 px-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-line/60 bg-surface shadow-sheet">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line/60 bg-surface px-5 py-4">
          <div className="flex items-center gap-3">
            <Avatar alt={mentor.name} size="sm" />
            <div>
              <p className="font-semibold text-sm">{mentor.name}</p>
              <p className="text-xs text-muted/70">{mentor.title ?? "Alumni mentor"}{mentor.company ? ` · ${mentor.company}` : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted/70 hover:bg-surface2 hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 p-5">
          {serverError && (
            <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/[0.08] px-3 py-2.5 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{serverError}
            </div>
          )}
          <div>
            <Label>Your career goal <span className="text-xs font-normal text-muted/60">(min 20 characters)</span></Label>
            <Textarea rows={5} placeholder="Describe what you want to achieve with this mentor…" {...register("goal")} />
            {errors.goal && <p className="mt-1 text-xs text-danger">{errors.goal.message}</p>}
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 text-muted/70" />Hours per week you can commit</Label>
            <Input placeholder="e.g. 3–5" {...register("weekly_hours")} />
            {errors.weekly_hours && <p className="mt-1 text-xs text-danger">{errors.weekly_hours.message}</p>}
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-muted/70" />Programme duration in weeks <span className="text-xs font-normal text-muted/60">(optional)</span></Label>
            <Input type="number" min={1} max={52} placeholder="e.g. 12" className="w-32" {...register("desired_weeks")} />
            {errors.desired_weeks && <p className="mt-1 text-xs text-danger">{errors.desired_weeks.message}</p>}
          </div>
          <Controller name="available_asap" control={control} render={({ field }) => (
            <div className="flex gap-2">
              {[{ val: true, label: "Available ASAP", icon: "⚡", sub: "Ready to start immediately" }, { val: false, label: "Flexible start", icon: "📅", sub: "Will discuss timing" }].map(({ val, label, icon, sub }) => (
                <button key={String(val)} type="button" onClick={() => field.onChange(val)} className={cn("flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-all", field.value === val ? "border-accent bg-accent/10 text-ink" : "border-line/60 text-muted/70 hover:border-muted/40")}>
                  <span className="block text-lg">{icon}</span>{label}
                  <span className="mt-0.5 block text-[11px] font-normal opacity-70">{sub}</span>
                </button>
              ))}
            </div>
          )} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="accent" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending…</> : <><Send className="h-3.5 w-3.5" />Send Request</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AI Match panel ───────────────────────────────────────────────────────────
function AiMatchPanel({ onResults, loading }: { onResults: (v: AiValues) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<AiValues>({ resolver: zodResolver(aiSchema) });
  return (
    <Card className="mb-8 overflow-hidden border-accent/20">
      <div className="h-0.5 w-full bg-gradient-to-r from-accent via-role-mentor to-role-admin" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <BrainCircuit className="h-3.5 w-3.5" />
          </div>
          AI Mentor Matching
          <Badge tone="accent" className="ml-auto">Powered by LLaMA 3.3</Badge>
        </CardTitle>
        <p className="text-xs text-muted/70 mt-1">
          Describe your goals and the AI will find the best-matched mentors using semantic search and intelligent re-ranking.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit(onResults)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Target Role</Label>
              <Input placeholder="e.g. Software Engineer at a product startup" {...register("target_role")} />
              {errors.target_role && <p className="mt-1 text-xs text-danger">{errors.target_role.message}</p>}
            </div>
            <div>
              <Label>Current Year / Semester</Label>
              <Input placeholder="e.g. 5th semester, 3rd year" {...register("semester")} />
              {errors.semester && <p className="mt-1 text-xs text-danger">{errors.semester.message}</p>}
            </div>
          </div>
          <div>
            <Label>Skills & Interests <span className="text-xs font-normal text-muted/60">(optional)</span></Label>
            <Input placeholder="e.g. Python, Machine Learning, System Design, React" {...register("skills_and_interests")} />
          </div>
          <div>
            <Label>Career Goals / Bio <span className="text-xs font-normal text-muted/60">(optional)</span></Label>
            <Textarea rows={3} placeholder="e.g. I want to transition into ML engineering within 12 months. I need help with interview prep and building projects…" {...register("bio")} />
          </div>
          <Button type="submit" variant="accent" disabled={loading} className="w-full sm:w-auto">
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Finding matches…</>
              : <><Zap className="h-4 w-4" />Find My Best Mentors</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function MentorDirectoryPage() {
  // Standard directory data
  const [mentors,      setMentors]      = React.useState<DirectoryMentor[]>([]);
  const [domainFilter, setDomainFilter] = React.useState<string | null>(null);
  const [dirError,     setDirError]     = React.useState<string | null>(null);
  const [dirLoading,   setDirLoading]   = React.useState(true);
  const [requestedIds, setRequestedIds] = React.useState<Set<string>>(new Set());
  const [selectedMentor, setSelectedMentor] = React.useState<{ id: string; name: string; title: string | null; company: string | null } | null>(null);
  const [selectedIcebreaker, setSelectedIcebreaker] = React.useState<string | undefined>(undefined);

  // AI matching
  const aiMatch = useMentorMatch();
  const [activeTab, setActiveTab] = React.useState<"ai" | "browse">("ai");

  // Load directory
  React.useEffect(() => {
    fetch("/api/mentors/directory")
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error ?? "Could not load mentors."); setMentors(d); })
      .catch((e) => setDirError(e.message))
      .finally(() => setDirLoading(false));
  }, []);

  // Load existing requests
  React.useEffect(() => {
    fetch("/api/requests/mine")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRequestedIds(new Set(d.filter((r) => r.status === "pending" || r.status === "accepted").map((r) => r.mentor_id))); })
      .catch(() => undefined);
  }, []);

  const handleRequestSent = (mentorId: string) => {
    setRequestedIds((prev) => new Set([...prev, mentorId]));
    setSelectedMentor(null);
    setSelectedIcebreaker(undefined);
  };

  const openRequest = (id: string, name: string, title: string | null, company: string | null, icebreaker?: string) => {
    setSelectedMentor({ id, name, title, company });
    setSelectedIcebreaker(icebreaker);
  };

  const handleAiMatch = (values: AiValues) => {
    aiMatch.runMatch(values);
    setActiveTab("ai");
  };

  const domains = Array.from(new Set(mentors.map((m) => m.domain).filter(Boolean))) as string[];
  const visibleMentors = domainFilter ? mentors.filter((m) => m.domain === domainFilter) : mentors;

  // Build a map from mentor_id → DirectoryMentor for the AI results
  const mentorMap = React.useMemo(() =>
    new Map(mentors.map((m) => [m.id, m])), [mentors]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Student Portal"
        title="Mentor Directory"
        description="Browse all mentors or let AI find your best matches."
      />

      {/* ── Tab switcher ── */}
      <div className="mb-6 flex gap-1 rounded-xl border border-line/60 bg-surface2/50 p-1.5">
        {[
          { id: "ai"     as const, label: "AI Match",        icon: <BrainCircuit className="h-3.5 w-3.5" /> },
          { id: "browse" as const, label: "Browse All",      icon: <ShieldAlert   className="h-3.5 w-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-150",
              activeTab === tab.id ? "bg-accent text-white shadow-glow" : "text-muted hover:bg-surface2 hover:text-ink"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ══ AI TAB ══ */}
      {activeTab === "ai" && (
        <div>
          <AiMatchPanel onResults={handleAiMatch} loading={aiMatch.status === "loading"} />

          {/* Loading state */}
          {aiMatch.status === "loading" && (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <BrainCircuit className="h-8 w-8 text-accent animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-ink">Finding your best mentors…</p>
                <p className="mt-1 text-sm text-muted/70">Running semantic search + AI re-ranking</p>
              </div>
            </div>
          )}

          {/* Error */}
          {aiMatch.status === "error" && (
            <Card className="border-danger/20 bg-danger/[0.06]">
              <CardContent className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-danger shrink-0" />
                  <p className="text-sm text-danger">{aiMatch.error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={aiMatch.reset}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {aiMatch.status === "success" && aiMatch.result && (
            <div className="space-y-6">
              {/* Summary bar */}
              <div className="flex items-center gap-3 rounded-xl border border-line/40 bg-surface2/40 px-4 py-3 text-sm">
                <Sparkles className="h-4 w-4 text-accent shrink-0" />
                <span className="text-muted/80">
                  Evaluated <strong className="text-ink">{aiMatch.result.total_candidates_evaluated}</strong> mentor
                  {aiMatch.result.total_candidates_evaluated !== 1 ? "s" : ""} · showing top{" "}
                  <strong className="text-ink">{aiMatch.result.recommendations.length}</strong> matches for{" "}
                  <em className="text-ink/80">{aiMatch.result.query_summary.split("→")[1]?.trim()}</em>
                </span>
                <button
                  type="button"
                  onClick={aiMatch.reset}
                  className="ml-auto flex items-center gap-1.5 text-xs text-muted/60 hover:text-ink transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> New search
                </button>
              </div>

              {/* Match cards */}
              {aiMatch.result.recommendations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line/60 py-16 text-center">
                  <ShieldAlert className="h-8 w-8 text-muted/40" />
                  <p className="text-sm text-muted/60">No matches found yet — mentors may not have embeddings yet.</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("browse")}>Browse all mentors</Button>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {aiMatch.result.recommendations.map((match) => (
                    <AiMatchCard
                      key={match.mentor_id}
                      match={match}
                      alreadyRequested={requestedIds.has(match.mentor_id)}
                      onRequest={() => openRequest(match.mentor_id, match.mentor_name, match.title, match.company, match.suggested_icebreaker)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Idle state */}
          {aiMatch.status === "idle" && (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/20 to-role-mentor/20">
                <BrainCircuit className="h-10 w-10 text-accent" />
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">AI-powered mentor matching</p>
                <p className="mt-2 max-w-md text-sm text-muted/70">
                  Fill in your target role and goals above. The engine will use semantic search
                  across all mentor profiles and LLaMA 3.3 reasoning to find your best matches —
                  with personalised icebreakers and focus areas.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {["Career path alignment", "Skill gap coverage", "Industry trajectory", "Mentorship impact"].map((tag) => (
                  <span key={tag} className="rounded-full border border-line/50 bg-surface2 px-3 py-1 text-xs text-muted/70">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ BROWSE TAB ══ */}
      {activeTab === "browse" && (
        <div>
          {dirError && (
            <p className="mb-6 rounded-xl border border-danger/30 bg-danger/[0.06] p-4 text-sm text-danger">{dirError}</p>
          )}

          {/* Domain filter */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-muted/60">Domain</span>
            {[null, ...domains].map((item) => (
              <button
                key={item ?? "__all__"}
                onClick={() => setDomainFilter(item)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  domainFilter === item ? "border-accent bg-accent/15 text-accent" : "border-line/60 text-muted/70 hover:border-muted/40 hover:text-ink"
                )}
              >
                {item ?? "All"}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted/50">{visibleMentors.length} mentor{visibleMentors.length !== 1 ? "s" : ""}</span>
          </div>

          {dirLoading ? (
            <div className="flex items-center gap-2 py-10 text-sm text-muted/70">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading mentors…
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMentors.map((mentor) => (
                <DirectoryCard
                  key={mentor.id}
                  mentor={mentor}
                  alreadyRequested={requestedIds.has(mentor.id)}
                  onRequest={() => openRequest(mentor.id, mentor.name, mentor.title, mentor.company)}
                />
              ))}
              {visibleMentors.length === 0 && (
                <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line/60 py-16 text-center">
                  <ShieldAlert className="h-6 w-6 text-muted/40" />
                  <p className="text-sm text-muted/60">No mentors available yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Request modal ── */}
      {selectedMentor && (
        <RequestModal
          mentor={selectedMentor}
          icebreaker={selectedIcebreaker}
          onClose={() => { setSelectedMentor(null); setSelectedIcebreaker(undefined); }}
          onSent={handleRequestSent}
        />
      )}
    </div>
  );
}
