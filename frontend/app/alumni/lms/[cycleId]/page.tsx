"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CheckCircle2, Circle, Lock, ClipboardCheck, Loader2,
  AlertCircle, Plus, Trash2, ChevronRight, FileCheck2,
  Video, BookOpen, Map, Mic, Link2, Save,
  PlayCircle, X, UploadCloud, FileText, FolderOpen,
  RotateCcw, Flag,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LearningResource { label: string; url: string }
interface ModuleFile { id: string; original_name: string; storage_key: string; size_bytes: number | null; is_downloadable: boolean }
interface AssignmentOut {
  id: string; submitted_file_name: string;
  grade: number | null; feedback: string | null;
  submitted_at: string; graded_at: string | null;
}
interface LMSModule {
  id: string; cycle_id: string; week_number: number;
  title: string; objectives: string;
  learning_resources: LearningResource[];
  assignment_prompt: string | null;
  live_class_url: string | null;
  recording_url: string | null; recording_title: string | null;
  is_published: boolean; is_completed: boolean;
  status: "locked" | "active" | "completed";
  assignment: AssignmentOut | null;
  files: ModuleFile[];
}
interface Cycle {
  id: string; student_name: string; mentor_name: string;
  domain: string | null; total_weeks: number; current_week: number;
  roadmap: string | null; modules: LMSModule[];
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const moduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  objectives: z.string().min(1, "Add at least one objective"),
  assignment_prompt: z.string().optional(),
  live_class_enabled: z.boolean(),
  learning_resources: z.array(z.object({
    label: z.string().min(1, "Label required"),
    url: z.string().url("Enter a valid URL"),
  })).optional(),
  is_published: z.boolean(),
});
type ModuleValues = z.infer<typeof moduleSchema>;

const recordingSchema = z.object({
  recording_url: z.string().url("Enter a valid URL"),
  recording_title: z.string().optional(),
});
type RecordingValues = z.infer<typeof recordingSchema>;

const gradingSchema = z.object({
  grade: z.coerce.number().min(0).max(100),
  feedback: z.string().min(10, "At least 10 characters"),
});
type GradingValues = z.infer<typeof gradingSchema>;

const addWeekSchema = z.object({
  week_number: z.coerce.number().min(1),
  title: z.string().min(1, "Title required"),
});
type AddWeekValues = z.infer<typeof addWeekSchema>;

type Tab = "roadmap" | "modules" | "live" | "recordings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function StatusIcon({ status, isCompleted }: { status: LMSModule["status"]; isCompleted: boolean }) {
  if (isCompleted || status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "active") return <Circle className="h-4 w-4 fill-role-mentor text-role-mentor" />;
  return <Lock className="h-3.5 w-3.5 text-muted" />;
}

function FeedbackBanner({ fb, onDismiss }: { fb: { type: "success" | "error"; msg: string }; onDismiss: () => void }) {
  return (
    <div className={cn(
      "mb-4 flex items-start justify-between gap-2 rounded-sm border px-4 py-3 text-sm",
      fb.type === "success" ? "border-success/30 bg-success/[0.06] text-success" : "border-danger/30 bg-danger/[0.08] text-danger"
    )}>
      <div className="flex items-start gap-2">
        {fb.type === "success" ? <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        {fb.msg}
      </div>
      <button onClick={onDismiss}><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function formatBytes(n: number | null) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MentorLmsPage() {
  const { cycleId } = useParams<{ cycleId: string }>();

  const [cycle, setCycle] = React.useState<Cycle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [pageError, setPageError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("modules");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [showAddWeek, setShowAddWeek] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [advancing, setAdvancing] = React.useState(false);
  const [roadmapText, setRoadmapText] = React.useState("");
  const [savingRoadmap, setSavingRoadmap] = React.useState(false);
  const [uploadingFile, setUploadingFile] = React.useState(false);
  const [completingModule, setCompletingModule] = React.useState(false);

  const fetchCycle = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/lms/cycles/${cycleId}`);
      const d = await res.json();
      if (!res.ok) { setPageError(d.error ?? "Failed to load."); return; }
      setCycle(d);
      setRoadmapText(d.roadmap ?? "");
      setSelectedId((prev) => prev ?? d.modules[0]?.id ?? null);
    } catch { setPageError("Could not reach the server."); }
    finally { setLoading(false); }
  }, [cycleId]);

  React.useEffect(() => { fetchCycle(); }, [fetchCycle]);

  const activeModule = cycle?.modules.find((m) => m.id === selectedId) ?? null;

  // Forms
  const moduleForm = useForm<ModuleValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { title: "", objectives: "", assignment_prompt: "", live_class_enabled: false, learning_resources: [], is_published: false },
  });
  const { fields: resFields, append: appendRes, remove: removeRes } = useFieldArray({ control: moduleForm.control, name: "learning_resources" });

  React.useEffect(() => {
    if (!activeModule) return;
    moduleForm.reset({
      title: activeModule.title,
      objectives: activeModule.objectives,
      assignment_prompt: activeModule.assignment_prompt ?? "",
      live_class_enabled: !!activeModule.live_class_url,
      learning_resources: activeModule.learning_resources ?? [],
      is_published: activeModule.is_published,
    });
    setFeedback(null);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const recordingForm = useForm<RecordingValues>({ resolver: zodResolver(recordingSchema) });
  React.useEffect(() => {
    if (!activeModule) return;
    recordingForm.reset({ recording_url: activeModule.recording_url ?? "", recording_title: activeModule.recording_title ?? "" });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const gradingForm = useForm<GradingValues>({ resolver: zodResolver(gradingSchema) });
  React.useEffect(() => {
    if (!activeModule?.assignment) return;
    gradingForm.reset({ grade: activeModule.assignment.grade ?? undefined, feedback: activeModule.assignment.feedback ?? "" });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addWeekForm = useForm<AddWeekValues>({ resolver: zodResolver(addWeekSchema) });

  // ── Actions ──
  const onSaveModule = async (values: ModuleValues) => {
    if (!activeModule || !cycle) return;
    setFeedback(null);
    const res = await fetch(`/api/lms/cycles/${cycle.id}/modules/${activeModule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        objectives: values.objectives,
        assignment_prompt: values.assignment_prompt || null,
        live_class_url: values.live_class_enabled ? `internal://${cycle.id}/${activeModule.id}` : null,
        learning_resources: values.learning_resources ?? [],
        is_published: values.is_published,
      }),
    });
    const d = await res.json();
    if (!res.ok) { setFeedback({ type: "error", msg: d.error ?? "Save failed." }); return; }
    setFeedback({ type: "success", msg: `Week ${activeModule.week_number} saved${values.is_published ? " and published" : " as draft"}.` });
    await fetchCycle();
  };

  const onSaveRecording = async (values: RecordingValues) => {
    if (!activeModule || !cycle) return;
    const res = await fetch(`/api/lms/cycles/${cycle.id}/modules/${activeModule.id}/recording`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    });
    const d = await res.json();
    if (!res.ok) { setFeedback({ type: "error", msg: d.error ?? "Save failed." }); return; }
    setFeedback({ type: "success", msg: "Recording saved." });
    await fetchCycle();
  };

  const onGrade = async (values: GradingValues) => {
    if (!activeModule) return;
    const res = await fetch(`/api/lms/modules/${activeModule.id}/grade`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
    });
    const d = await res.json();
    if (!res.ok) { setFeedback({ type: "error", msg: d.error ?? "Grading failed." }); return; }
    setFeedback({ type: "success", msg: `Grade ${values.grade}/100 saved.` });
    await fetchCycle();
  };

  const onAddWeek = async (values: AddWeekValues) => {
    if (!cycle) return;
    const res = await fetch(`/api/lms/cycles/${cycle.id}/modules`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week_number: values.week_number, title: values.title, objectives: "", is_published: false }),
    });
    const d = await res.json();
    if (!res.ok) { setFeedback({ type: "error", msg: d.error ?? "Failed to add week." }); return; }
    setShowAddWeek(false); addWeekForm.reset();
    await fetchCycle();
    setSelectedId(d.id);
  };

  const onDelete = async (moduleId: string) => {
    if (!cycle || !confirm("Remove this week? All submissions will also be deleted.")) return;
    setDeleting(moduleId);
    const res = await fetch(`/api/lms/cycles/${cycle.id}/modules/${moduleId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) { await fetchCycle(); setSelectedId(null); }
    else { const d = await res.json().catch(() => ({})); setFeedback({ type: "error", msg: d.error ?? "Delete failed." }); }
    setDeleting(null);
  };

  const onAdvance = async () => {
    if (!cycle) return;
    setAdvancing(true);
    const res = await fetch(`/api/lms/cycles/${cycle.id}/advance-week`, { method: "PATCH" });
    const d = await res.json();
    if (!res.ok) setFeedback({ type: "error", msg: d.error ?? "Failed." });
    else { setFeedback({ type: "success", msg: d.message }); await fetchCycle(); }
    setAdvancing(false);
  };

  const onSaveRoadmap = async () => {
    if (!cycle) return;
    setSavingRoadmap(true);
    const res = await fetch(`/api/lms/cycles/${cycle.id}/roadmap`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roadmap: roadmapText }),
    });
    setSavingRoadmap(false);
    const d = await res.json();
    if (!res.ok) setFeedback({ type: "error", msg: d.error ?? "Save failed." });
    else setFeedback({ type: "success", msg: "Roadmap saved." });
  };

  const onUploadFile = async (file: File) => {
    if (!activeModule || !cycle) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFeedback({ type: "error", msg: "Only PDF files are accepted." }); return;
    }
    setUploadingFile(true);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/lms/cycles/${cycle.id}/modules/${activeModule.id}/materials`, {
        method: "POST", body: formData,
      });
      const d = await res.json();
      if (!res.ok) { setFeedback({ type: "error", msg: d.error ?? "Upload failed." }); return; }
      setFeedback({ type: "success", msg: `"${file.name}" uploaded. Students can download it from the Downloads tab.` });
      await fetchCycle();
    } catch { setFeedback({ type: "error", msg: "Upload failed." }); }
    finally { setUploadingFile(false); }
  };

  const onDeleteFile = async (fileId: string) => {
    if (!confirm("Remove this file?")) return;
    const res = await fetch(`/api/lms/files/delete/${fileId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) { await fetchCycle(); }
    else setFeedback({ type: "error", msg: "Could not delete file." });
  };

  const onToggleComplete = async () => {
    if (!activeModule || !cycle) return;
    setCompletingModule(true);
    const action = activeModule.is_completed ? "reopen" : "complete";
    const res = await fetch(`/api/lms/cycles/${cycle.id}/modules/${activeModule.id}/${action}`, { method: "PATCH" });
    const d = await res.json();
    if (!res.ok) setFeedback({ type: "error", msg: d.error ?? "Action failed." });
    else {
      setFeedback({ type: "success", msg: action === "complete" ? "Module marked as completed. Reflected on student portal immediately." : "Module reopened." });
      await fetchCycle();
    }
    setCompletingModule(false);
  };

  // ── Loading / error ──
  if (loading) return <div className="flex items-center gap-2 py-20 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  if (pageError) return <div className="rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger"><AlertCircle className="mr-2 inline h-4 w-4" /> {pageError}</div>;
  if (!cycle) return null;

  const recordings = cycle.modules.filter((m) => m.recording_url);
  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "roadmap",    label: "Roadmap",         icon: Map      },
    { id: "modules",    label: "Weeks / Modules", icon: BookOpen },
    { id: "live",       label: "Live Session",    icon: Video    },
    { id: "recordings", label: "Recordings",      icon: PlayCircle },
  ];

  return (
    <div>
      <PageHeader
        title={`LMS — ${cycle.student_name}`}
        description={`${cycle.domain ?? "Mentorship"} · Week ${cycle.current_week} of ${cycle.total_weeks}`}
        actions={
          <Button size="sm" variant="outline" disabled={advancing} onClick={onAdvance}>
            {advancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Advance to Week {cycle.current_week + 1}
          </Button>
        }
      />

      {feedback && <FeedbackBanner fb={feedback} onDismiss={() => setFeedback(null)} />}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-sm border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex shrink-0 items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-ink text-paper" : "text-muted hover:text-ink")}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ ROADMAP ══ */}
      {tab === "roadmap" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Map className="h-4 w-4" /> Programme Roadmap</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-sm text-muted">Write a free-form overview of the programme. Students can read this at any time.</p>
            <Textarea rows={14} value={roadmapText} onChange={(e) => setRoadmapText(e.target.value)}
              className="font-mono text-sm"
              placeholder={"Weeks 1–3: Foundation\n  – Audit current skills\n  – Define goal\n\nWeeks 4–8: Sprint\n  – Case studies & mock interviews\n\nWeeks 9–12: Launch\n  – Portfolio, negotiation, handoff"} />
            <Button onClick={onSaveRoadmap} disabled={savingRoadmap}>
              {savingRoadmap ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Save Roadmap</>}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══ MODULES ══ */}
      {tab === "modules" && (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                Weeks
                <button onClick={() => setShowAddWeek((v) => !v)} title="Add week" className="rounded-sm p-1 text-muted hover:text-ink">
                  <Plus className="h-4 w-4" />
                </button>
              </CardTitle>
            </CardHeader>

            {showAddWeek && (
              <CardContent className="border-t border-line px-4 pb-4 pt-3">
                <form onSubmit={addWeekForm.handleSubmit(onAddWeek)} className="space-y-3">
                  <div>
                    <Label>Week number</Label>
                    <Input type="number" min={1} {...addWeekForm.register("week_number")} />
                    {addWeekForm.formState.errors.week_number && <p className="mt-1 text-xs text-danger">{addWeekForm.formState.errors.week_number.message}</p>}
                  </div>
                  <div>
                    <Label>Title</Label>
                    <Input placeholder="e.g. Portfolio Review" {...addWeekForm.register("title")} />
                    {addWeekForm.formState.errors.title && <p className="mt-1 text-xs text-danger">{addWeekForm.formState.errors.title.message}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={addWeekForm.formState.isSubmitting}>
                      {addWeekForm.formState.isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Add"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowAddWeek(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            )}

            <CardContent className="p-2">
              <ul>
                {cycle.modules.map((m) => (
                  <li key={m.id} className="group flex items-center">
                    <button onClick={() => setSelectedId(m.id)}
                      className={cn("flex flex-1 items-start gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm transition-colors",
                        m.id === selectedId ? "bg-ink text-paper" : "hover:bg-ink/[0.05]")}>
                      <span className="mt-0.5 shrink-0"><StatusIcon status={m.status} isCompleted={m.is_completed} /></span>
                      <span>
                        <span className={cn("block text-[11px]", m.id === selectedId ? "text-paper/70" : "text-muted")}>Week {m.week_number}</span>
                        <span className="font-medium leading-tight">{m.title || "Untitled"}</span>
                        {!m.is_published && <span className="ml-1 text-[10px] text-muted">(draft)</span>}
                        {m.is_completed && <span className="ml-1 text-[10px] text-success">(ended)</span>}
                      </span>
                    </button>
                    <button onClick={() => onDelete(m.id)} disabled={deleting === m.id}
                      className="mr-1 hidden rounded-sm p-1 text-muted hover:text-danger group-hover:block" title="Remove week">
                      {deleting === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </li>
                ))}
                {cycle.modules.length === 0 && <li className="px-3 py-4 text-xs text-muted">No weeks yet. Click + to add one.</li>}
              </ul>
            </CardContent>
          </Card>

          {/* Editor panel */}
          {activeModule ? (
            <div className="space-y-5">
              {/* Module status bar — complete / reopen */}
              <div className="flex items-center justify-between rounded-sm border border-line bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <StatusIcon status={activeModule.status} isCompleted={activeModule.is_completed} />
                  <div>
                    <p className="text-sm font-medium">
                      Week {activeModule.week_number} — {activeModule.is_completed ? "Ended" : activeModule.status}
                    </p>
                    <p className="text-xs text-muted">
                      {activeModule.is_completed
                        ? "This module has been marked as ended. Students see it as completed."
                        : "Mark as ended when you're done with this week's content."}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={activeModule.is_completed ? "outline" : "outline"}
                  className={cn("shrink-0 gap-1.5",
                    activeModule.is_completed
                      ? "border-muted text-muted hover:border-ink hover:text-ink"
                      : "border-success/40 text-success hover:bg-success/[0.06] hover:border-success")}
                  disabled={completingModule}
                  onClick={onToggleComplete}
                >
                  {completingModule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                    activeModule.is_completed ? <><RotateCcw className="h-3.5 w-3.5" /> Reopen</> : <><Flag className="h-3.5 w-3.5" /> End Module</>}
                </Button>
              </div>

              {/* Module editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Week {activeModule.week_number} — Edit Module
                    {activeModule.is_published ? <Badge tone="success">Published</Badge> : <Badge tone="neutral">Draft</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <form onSubmit={moduleForm.handleSubmit(onSaveModule)} className="space-y-5" noValidate>
                    <div>
                      <Label htmlFor="mod-title">Week title</Label>
                      <Input id="mod-title" {...moduleForm.register("title")} />
                      {moduleForm.formState.errors.title && <p className="mt-1 text-xs text-danger">{moduleForm.formState.errors.title.message}</p>}
                    </div>

                    <div>
                      <Label htmlFor="mod-obj">Learning objectives <span className="text-xs font-normal text-muted">(one per line)</span></Label>
                      <Textarea id="mod-obj" rows={4} placeholder={"Define outcome statement\nAudit skill gaps\nAlign on cadence"} {...moduleForm.register("objectives")} />
                      {moduleForm.formState.errors.objectives && <p className="mt-1 text-xs text-danger">{moduleForm.formState.errors.objectives.message}</p>}
                    </div>

                    {/* Learning resources */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="mb-0 flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5 text-muted" /> Learning resources</Label>
                        <button type="button" onClick={() => appendRes({ label: "", url: "" })}
                          className="flex items-center gap-1 text-xs text-accent hover:underline">
                          <Plus className="h-3 w-3" /> Add link
                        </button>
                      </div>
                      {resFields.length === 0 && <p className="text-xs text-muted">Add articles, videos, or docs.</p>}
                      <div className="space-y-2">
                        {resFields.map((field, idx) => (
                          <div key={field.id} className="flex gap-2">
                            <Input className="w-40 shrink-0" placeholder="Label" {...moduleForm.register(`learning_resources.${idx}.label`)} />
                            <Input className="flex-1" placeholder="https://..." {...moduleForm.register(`learning_resources.${idx}.url`)} />
                            <button type="button" onClick={() => removeRes(idx)} className="p-2 text-muted hover:text-danger"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PDF upload */}
                    <div>
                      <Label className="mb-1 block flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-muted" /> Upload module material
                        <span className="text-xs font-normal text-muted">(PDF — stored in R2, portal-only download)</span>
                      </Label>
                      <label htmlFor="material-file"
                        className="flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-line px-4 py-3 text-sm transition-colors hover:border-ink">
                        {uploadingFile
                          ? <><Loader2 className="h-4 w-4 animate-spin text-muted" /> Uploading…</>
                          : <><UploadCloud className="h-4 w-4 text-muted" /><span className="text-muted">Choose a PDF from your computer</span></>}
                      </label>
                      <input id="material-file" type="file" accept="application/pdf" className="sr-only"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUploadFile(f); e.target.value = ""; }} />
                      <p className="mt-1 text-xs text-muted">Students can download uploaded files from the Downloads tab in their portal.</p>

                      {/* Uploaded files list */}
                      {activeModule.files.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {activeModule.files.map((f) => (
                            <div key={f.id} className="flex items-center justify-between rounded-sm border border-line px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-3.5 w-3.5 text-muted shrink-0" />
                                <span className="truncate font-medium">{f.original_name}</span>
                                {f.size_bytes && <span className="text-muted shrink-0">{formatBytes(f.size_bytes)}</span>}
                              </div>
                              <button onClick={() => onDeleteFile(f.id)} className="ml-3 shrink-0 text-muted hover:text-danger" title="Delete file">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assignment prompt */}
                    <div>
                      <Label htmlFor="mod-assign" className="flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5 text-muted" /> Assignment prompt
                        <span className="text-xs font-normal text-muted">(leave empty for no assignment)</span>
                      </Label>
                      <Textarea id="mod-assign" rows={3} placeholder="Submit a 1-page reflection as a PDF…" {...moduleForm.register("assignment_prompt")} />
                    </div>

                    {/* Live class toggle */}
                    <div>
                      <div className="flex items-center gap-3 rounded-sm border border-line bg-surface px-4 py-3">
                        <input id="mod-live" type="checkbox" className="h-4 w-4 rounded border-line" {...moduleForm.register("live_class_enabled")} />
                        <div>
                          <Label htmlFor="mod-live" className="mb-0 flex items-center gap-1.5 cursor-pointer"><Video className="h-3.5 w-3.5 text-accent" /> Enable live class</Label>
                          <p className="text-xs text-muted">Student sees a "Join Live Class" button opening your video room.</p>
                        </div>
                      </div>
                      {activeModule.live_class_url && (
                        <a href={`/video-class/${cycle.id}?week=${activeModule.week_number}`} className="mt-3 inline-block">
                          <Button type="button" size="sm" className="gap-2"><Video className="h-3.5 w-3.5" /> Start Live Class</Button>
                        </a>
                      )}
                    </div>

                    {/* Publish */}
                    <div className="flex items-center gap-3 rounded-sm border border-line bg-surface px-4 py-3">
                      <input id="mod-publish" type="checkbox" className="h-4 w-4 rounded border-line" {...moduleForm.register("is_published")} />
                      <div>
                        <Label htmlFor="mod-publish" className="mb-0 cursor-pointer">Publish to student</Label>
                        <p className="text-xs text-muted">Students only see published weeks.</p>
                      </div>
                    </div>

                    <Button type="submit" disabled={moduleForm.formState.isSubmitting}>
                      {moduleForm.formState.isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Save className="h-3.5 w-3.5" /> Save Module</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Grade assignment */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Grade Assignment</CardTitle></CardHeader>
                <CardContent className="p-5">
                  {!activeModule.assignment_prompt ? (
                    <p className="text-sm text-muted">No assignment configured for this week.</p>
                  ) : !activeModule.assignment ? (
                    <p className="text-sm text-muted">{cycle.student_name} hasn't submitted yet.</p>
                  ) : (
                    <form onSubmit={gradingForm.handleSubmit(onGrade)} className="space-y-4" noValidate>
                      <div className="flex items-center gap-2 rounded-sm border border-line px-3 py-2 text-sm">
                        <FileCheck2 className="h-4 w-4 text-success" />
                        <span className="flex-1 font-medium">{activeModule.assignment.submitted_file_name}</span>
                        {activeModule.assignment.grade != null && <Badge tone="success">Graded {activeModule.assignment.grade}/100</Badge>}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                        <div>
                          <Label htmlFor="grade">Score (0–100)</Label>
                          <Input id="grade" type="number" min={0} max={100} {...gradingForm.register("grade")} />
                          {gradingForm.formState.errors.grade && <p className="mt-1 text-xs text-danger">{gradingForm.formState.errors.grade.message}</p>}
                        </div>
                        <div>
                          <Label htmlFor="feedback">Feedback</Label>
                          <Textarea id="feedback" rows={3} {...gradingForm.register("feedback")} />
                          {gradingForm.formState.errors.feedback && <p className="mt-1 text-xs text-danger">{gradingForm.formState.errors.feedback.message}</p>}
                        </div>
                      </div>
                      <Button type="submit" disabled={gradingForm.formState.isSubmitting}>
                        {gradingForm.formState.isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : "Submit Grade"}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              {/* Recording */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Mic className="h-4 w-4" /> Session Recording — Week {activeModule.week_number}</CardTitle></CardHeader>
                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted">Paste a recording URL after your session. Students see a Watch button.</p>
                  <form onSubmit={recordingForm.handleSubmit(onSaveRecording)} className="space-y-4" noValidate>
                    <div>
                      <Label htmlFor="rec-title">Recording title <span className="text-xs font-normal text-muted">(optional)</span></Label>
                      <Input id="rec-title" placeholder={`Week ${activeModule.week_number} — Session Recording`} {...recordingForm.register("recording_title")} />
                    </div>
                    <div>
                      <Label htmlFor="rec-url">Recording URL <span className="text-xs font-normal text-muted">(YouTube, Loom, Drive…)</span></Label>
                      <Input id="rec-url" type="url" placeholder="https://youtu.be/..." {...recordingForm.register("recording_url")} />
                      {recordingForm.formState.errors.recording_url && <p className="mt-1 text-xs text-danger">{recordingForm.formState.errors.recording_url.message}</p>}
                    </div>
                    {activeModule.recording_url && (
                      <div className="flex items-center gap-2 rounded-sm border border-success/30 bg-success/[0.06] px-3 py-2 text-xs">
                        <PlayCircle className="h-3.5 w-3.5 text-success shrink-0" />
                        Saved: <span className="truncate max-w-xs underline">{activeModule.recording_title || activeModule.recording_url}</span>
                      </div>
                    )}
                    <Button type="submit" disabled={recordingForm.formState.isSubmitting}>
                      {recordingForm.formState.isSubmitting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</> : <><Mic className="h-3.5 w-3.5" /> Save Recording</>}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-line text-sm text-muted">
              {cycle.modules.length === 0 ? "Click + to add your first week." : "Select a week from the sidebar."}
            </div>
          )}
        </div>
      )}

      {/* ══ LIVE SESSION ══ */}
      {tab === "live" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Video className="h-4 w-4 text-accent" /> Live Class Sessions</CardTitle></CardHeader>
          <CardContent className="p-5 space-y-5">
            <div className="rounded-sm border border-accent/30 bg-accent/[0.04] p-4 space-y-3">
              <p className="text-sm font-medium">Start a live session</p>
              <p className="text-xs text-muted">Enable live class on a week (Modules tab) then click Start below. The student sees a Join button automatically.</p>
              {(() => {
                const cur = cycle.modules.find((m) => m.week_number === cycle.current_week);
                return cur?.live_class_url ? (
                  <a href={`/video-class/${cycle.id}?week=${cycle.current_week}`}>
                    <Button className="gap-2"><Video className="h-4 w-4" /> Start Live Class — Week {cycle.current_week}</Button>
                  </a>
                ) : (
                  <p className="text-sm text-muted">Live class not enabled for week {cycle.current_week}. Enable it in the Modules tab.</p>
                );
              })()}
            </div>
            <div className="space-y-2">
              {cycle.modules.filter((m) => m.live_class_url).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-sm border border-line px-4 py-3">
                  <div><p className="text-sm font-medium">Week {m.week_number} — {m.title}</p><p className="text-xs text-muted">Live class room available</p></div>
                  <a href={`/video-class/${cycle.id}?week=${m.week_number}`}>
                    <Button size="sm" className="gap-1.5"><Video className="h-3.5 w-3.5" /> Start</Button>
                  </a>
                </div>
              ))}
              {cycle.modules.every((m) => !m.live_class_url) && (
                <p className="text-sm text-muted">No weeks have live class enabled yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══ RECORDINGS ══ */}
      {tab === "recordings" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Session Recordings</CardTitle></CardHeader>
          <CardContent className="p-5">
            <p className="mb-4 text-sm text-muted">Add recording URLs in the Modules tab → select a week → Session Recording.</p>
            {recordings.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-12 text-sm text-muted">
                <PlayCircle className="h-5 w-5" /> No recordings yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-sm border border-line px-4 py-3">
                    <div><p className="text-sm font-medium">{m.recording_title || `Week ${m.week_number} — ${m.title}`}</p><p className="text-xs text-muted">Week {m.week_number}</p></div>
                    <a href={m.recording_url!} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline"><PlayCircle className="h-3.5 w-3.5" /> Watch</Button>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
