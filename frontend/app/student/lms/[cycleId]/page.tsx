"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2, Circle, Lock, UploadCloud, Video, FileCheck2,
  Loader2, AlertCircle, PlayCircle, Map,
  BookOpen, ClipboardList, Link2, FileText, ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LearningResource { label: string; url: string }
interface AssignmentOut {
  id: string; submitted_file_name: string;
  grade: number | null; feedback: string | null;
  submitted_at: string; graded_at: string | null;
}
interface LMSModule {
  id: string; week_number: number; title: string; objectives: string;
  learning_resources: LearningResource[];
  assignment_prompt: string | null;
  live_class_url: string | null;
  recording_url: string | null; recording_title: string | null;
  is_published: boolean;
  status: "locked" | "active" | "completed";
  assignment: AssignmentOut | null;
}
interface Cycle {
  id: string; student_name: string; mentor_name: string;
  domain: string | null; total_weeks: number; current_week: number;
  roadmap: string | null; modules: LMSModule[];
}

type Tab = "roadmap" | "modules" | "recordings" | "assignments";

function StatusIcon({ status }: { status: LMSModule["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "active") return <Circle className="h-4 w-4 fill-accent text-accent" />;
  return <Lock className="h-3.5 w-3.5 text-muted" />;
}

// ---------------------------------------------------------------------------
// Assignment upload panel — uses real local file
// ---------------------------------------------------------------------------
function AssignmentUpload({ module, onSubmitted }: { module: LMSModule; onSubmitted: () => void }) {
  const [dragOver, setDragOver] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const pickFile = (f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") { setError("Only PDF files are accepted."); return; }
    setFile(f); setError(null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  };

  const onSubmit = async () => {
    if (!file) { setError("Please select a file first."); return; }
    setSubmitting(true); setError(null);
    const res = await fetch(`/api/lms/modules/${module.id}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submitted_file_name: file.name }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(d.error ?? "Submission failed."); return; }
    onSubmitted();
  };

  if (module.assignment) {
    return (
      <div className="flex items-start gap-3 rounded-sm border border-success/30 bg-success/[0.06] px-4 py-3 text-sm">
        <FileCheck2 className="h-4 w-4 mt-0.5 shrink-0 text-success" />
        <div>
          <p className="font-medium text-success">{module.assignment.submitted_file_name} — submitted</p>
          {module.assignment.grade != null ? (
            <p className="mt-0.5 text-xs text-muted">
              Grade: <strong>{module.assignment.grade}/100</strong>
              {module.assignment.feedback ? ` — ${module.assignment.feedback}` : ""}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">Awaiting mentor review…</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragOver ? "border-ink bg-ink/[0.04]" : "border-line"
        )}
      >
        {file ? (
          <>
            <FileText className="h-6 w-6 text-accent" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB · PDF</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted" />
            <p className="text-sm">
              Drag your PDF here, or{" "}
              <label htmlFor={`file-${module.id}`}
                className="cursor-pointer font-medium underline underline-offset-2 hover:text-ink">
                browse
              </label>
            </p>
          </>
        )}
        <input id={`file-${module.id}`} type="file" accept="application/pdf" className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
      </div>
      <Button onClick={onSubmit} className="mt-4" disabled={submitting || !file}>
        {submitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</> : "Submit Assignment"}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function StudentLmsPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [cycle, setCycle] = React.useState<Cycle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("modules");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const fetchCycle = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/lms/my-cycles/${cycleId}`);
      const d = await res.json();
      if (!res.ok) { setPageError(d.error ?? "Failed to load your LMS."); return; }
      setCycle(d);
      setSelectedId((prev) => {
        if (prev && d.modules.find((m: LMSModule) => m.id === prev)) return prev;
        return d.modules.find((m: LMSModule) => m.status === "active" && m.is_published)?.id
          ?? d.modules.find((m: LMSModule) => m.is_published)?.id
          ?? null;
      });
    } catch { setPageError("Could not reach the server."); }
    finally { setLoading(false); }
  }, [cycleId]);

  React.useEffect(() => { fetchCycle(); }, [fetchCycle]);

  if (loading) return (
    <div className="flex items-center gap-2 py-20 text-sm text-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your LMS…
    </div>
  );
  if (pageError) return (
    <div className="rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
      <AlertCircle className="mr-2 inline h-4 w-4" /> {pageError}
    </div>
  );
  if (!cycle) return null;

  const published = cycle.modules.filter((m) => m.is_published);
  const recordings = published.filter((m) => m.recording_url);
  const assignments = published.filter((m) => m.assignment_prompt);
  const activeModule = published.find((m) => m.id === selectedId) ?? null;
  const currentWeekMod = published.find((m) => m.week_number === cycle.current_week);

  const pendingAssignments = assignments.filter((m) => !m.assignment).length;

  const TABS = [
    { id: "roadmap" as Tab,     label: "Roadmap",     icon: Map,           badge: 0 },
    { id: "modules" as Tab,     label: "Modules",     icon: BookOpen,      badge: published.length },
    { id: "recordings" as Tab,  label: "Recordings",  icon: PlayCircle,    badge: recordings.length },
    { id: "assignments" as Tab, label: "Assignments", icon: ClipboardList, badge: pendingAssignments },
  ];

  return (
    <div>
      <PageHeader
        title={`${cycle.domain ?? "Mentorship"} — My LMS`}
        description={`Mentor: ${cycle.mentor_name} · Week ${cycle.current_week} of ${cycle.total_weeks}`}
        actions={
          currentWeekMod?.live_class_url ? (
            <a href={`/video-class/${cycleId}?week=${cycle.current_week}`}>
              <Button size="sm" className="gap-2">
                <Video className="h-3.5 w-3.5" /> Join Live Class
              </Button>
            </a>
          ) : (
            <a href={`/video-class/${cycleId}`}>
              <Button size="sm" variant="outline">
                <Video className="h-3.5 w-3.5" /> Start Video Class
              </Button>
            </a>
          )
        }
      />

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-sm border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-ink text-paper" : "text-muted hover:text-ink"
            )}>
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.badge > 0 && (
              <span className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab === t.id ? "bg-paper/20 text-paper" : "bg-ink/10 text-ink"
              )}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════ ROADMAP ══════════════ */}
      {tab === "roadmap" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Map className="h-4 w-4" /> Programme Roadmap</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {cycle.roadmap ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {cycle.roadmap}
              </pre>
            ) : (
              <p className="text-sm text-muted">Your mentor hasn't written a roadmap yet. Check back soon.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════ MODULES ══════════════ */}
      {tab === "modules" && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader><CardTitle>Weeks</CardTitle></CardHeader>
            <CardContent className="p-2">
              <ul>
                {published.map((m) => {
                  const isLocked = m.status === "locked";
                  const isSelected = m.id === selectedId;
                  const hasPendingAssignment = m.assignment_prompt && !m.assignment;
                  return (
                    <li key={m.id}>
                      <button disabled={isLocked} onClick={() => setSelectedId(m.id)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          isSelected ? "bg-ink text-paper" : "hover:bg-ink/[0.05]"
                        )}>
                        <span className="mt-0.5 shrink-0"><StatusIcon status={m.status} /></span>
                        <span className="flex-1 min-w-0">
                          <span className={cn("block text-[11px]", isSelected ? "text-paper/70" : "text-muted")}>
                            Week {m.week_number}
                          </span>
                          <span className="block font-medium leading-snug">{m.title}</span>
                        </span>
                        {hasPendingAssignment && !isSelected && (
                          <span className="mt-1 h-2 w-2 rounded-full bg-accent shrink-0" title="Assignment pending" />
                        )}
                      </button>
                    </li>
                  );
                })}
                {published.length === 0 && (
                  <li className="px-3 py-4 text-xs text-muted">No modules published yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Module content */}
          {activeModule ? (
            <div className="space-y-5">
              {/* Week header */}
              <Card>
                <CardHeader>
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge tone={
                      activeModule.status === "completed" ? "success"
                        : activeModule.status === "active" ? "accent" : "neutral"
                    }>
                      Week {activeModule.week_number} · {activeModule.status}
                    </Badge>
                    {activeModule.live_class_url && (
                      <Badge tone="accent" className="flex items-center gap-1">
                        <Video className="h-3 w-3" /> Live session available
                      </Badge>
                    )}
                    {activeModule.recording_url && (
                      <Badge tone="neutral" className="flex items-center gap-1">
                        <PlayCircle className="h-3 w-3" /> Recording available
                      </Badge>
                    )}
                  </div>
                  <CardTitle>{activeModule.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                  {/* Objectives */}
                  {activeModule.objectives ? (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Objectives</p>
                      <ul className="space-y-1.5 text-sm">
                        {activeModule.objectives.split("\n").filter(Boolean).map((o, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-sm text-muted">No objectives set yet.</p>
                  )}

                  {/* Live class button — internal route */}
                  {activeModule.live_class_url && (
                    <div className="rounded-sm border border-accent/30 bg-accent/[0.04] p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Live class is available for this week</p>
                        <p className="text-xs text-muted mt-0.5">Click to join the session with your mentor.</p>
                      </div>
                      <a href={`/video-class/${cycleId}?week=${activeModule.week_number}`}>
                        <Button className="gap-2 shrink-0">
                          <Video className="h-4 w-4" /> Join Live Class
                        </Button>
                      </a>
                    </div>
                  )}

                  {/* Recording */}
                  {activeModule.recording_url && (
                    <div className="flex items-center justify-between gap-4 rounded-sm border border-line bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-accent/10">
                          <PlayCircle className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {activeModule.recording_title || `Week ${activeModule.week_number} Recording`}
                          </p>
                          <p className="text-xs text-muted">Session recording</p>
                        </div>
                      </div>
                      <a href={activeModule.recording_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          Watch <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Learning resources */}
              {activeModule.learning_resources.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" /> Learning Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-line p-0">
                    {activeModule.learning_resources.map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                          <p className="font-medium">{r.label}</p>
                        </div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5">
                            Open <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Assignment — only shown if prompt is set */}
              {activeModule.assignment_prompt && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Assignment
                      </span>
                      {!activeModule.assignment && (
                        <Badge tone="accent">Submission required</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-sm text-muted">{activeModule.assignment_prompt}</p>
                    <AssignmentUpload module={activeModule} onSubmitted={fetchCycle} />
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-line text-sm text-muted">
              {published.length === 0 ? "Your mentor hasn't published any modules yet." : "Select a week from the sidebar."}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ RECORDINGS ══════════════ */}
      {tab === "recordings" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4" /> Session Recordings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {recordings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-sm text-muted">
                <PlayCircle className="h-5 w-5" />
                No recordings yet. Your mentor will add them after each session.
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-sm border border-line px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-accent/10">
                        <PlayCircle className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {m.recording_title || `Week ${m.week_number} — ${m.title}`}
                        </p>
                        <p className="text-xs text-muted">Week {m.week_number}</p>
                      </div>
                    </div>
                    <a href={m.recording_url!} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-1.5">
                        <PlayCircle className="h-3.5 w-3.5" /> Watch
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══════════════ ASSIGNMENTS ══════════════ */}
      {tab === "assignments" && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-sm text-muted">
              <ClipboardList className="h-5 w-5" /> No assignments yet.
            </div>
          ) : (
            assignments.map((m) => (
              <Card key={m.id}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">Week {m.week_number} — {m.title}</CardTitle>
                    {m.assignment
                      ? m.assignment.grade != null
                        ? <Badge tone="success">Graded {m.assignment.grade}/100</Badge>
                        : <Badge tone="accent">Submitted · awaiting grade</Badge>
                      : <Badge tone="neutral">Not submitted</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted">{m.assignment_prompt}</p>
                  {m.assignment ? (
                    <div className="flex items-start gap-3 rounded-sm border border-success/30 bg-success/[0.06] px-4 py-3 text-sm">
                      <FileCheck2 className="h-4 w-4 mt-0.5 text-success shrink-0" />
                      <div>
                        <p className="font-medium text-success">{m.assignment.submitted_file_name}</p>
                        {m.assignment.grade != null && (
                          <p className="text-xs text-muted mt-0.5">
                            <strong>{m.assignment.grade}/100</strong>
                            {m.assignment.feedback ? ` — ${m.assignment.feedback}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <AssignmentUpload module={m} onSubmitted={fetchCycle} />
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
