"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Circle, Lock, UploadCloud, FileCheck2, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MENTOR_ACTIVE_CYCLES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { MilestoneModule } from "@/lib/types";

const authoringSchema = z.object({
  title: z.string().min(3, "Give the milestone a title."),
  objectives: z.string().min(5, "List at least one objective."),
  file: z.custom<FileList>().optional(),
});
type AuthoringValues = z.infer<typeof authoringSchema>;

const gradingSchema = z.object({
  grade: z.coerce.number().min(0, "Minimum score is 0").max(100, "Maximum score is 100"),
  feedback: z.string().min(10, "Feedback should be at least 10 characters."),
});
type GradingValues = z.infer<typeof gradingSchema>;

function StatusIcon({ status }: { status: MilestoneModule["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "active") return <Circle className="h-4 w-4 fill-role-mentor text-role-mentor" />;
  return <Lock className="h-3.5 w-3.5 text-muted" />;
}

export default function MentorLmsAuthoringPage() {
  const params = useParams<{ cycleId: string }>();
  const cycle = MENTOR_ACTIVE_CYCLES.find((c) => c.id === params.cycleId) ?? MENTOR_ACTIVE_CYCLES[0];
  const [selectedWeek, setSelectedWeek] = React.useState(cycle.currentWeek);
  const [publishedNote, setPublishedNote] = React.useState<string | null>(null);
  const [gradedNote, setGradedNote] = React.useState<string | null>(null);
  const activeModule = cycle.modules.find((m) => m.week === selectedWeek)!;

  const authoring = useForm<AuthoringValues>({
    resolver: zodResolver(authoringSchema),
    defaultValues: { title: activeModule.title, objectives: activeModule.objectives.join("\n") },
  });

  React.useEffect(() => {
    authoring.reset({ title: activeModule.title, objectives: activeModule.objectives.join("\n") });
    setPublishedNote(null);
    setGradedNote(null);
  }, [selectedWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  const grading = useForm<GradingValues>({
    resolver: zodResolver(gradingSchema),
    defaultValues: { grade: activeModule.assignment?.grade ?? undefined, feedback: activeModule.assignment?.feedback ?? "" },
  });

  const onPublish = async (values: AuthoringValues) => {
    await new Promise((r) => setTimeout(r, 500));
    setPublishedNote(`Milestone "${values.title}" saved and pushed to Cloudflare R2.`);
  };

  const onGrade = async (values: GradingValues) => {
    await new Promise((r) => setTimeout(r, 500));
    setGradedNote(`Grade ${values.grade}/100 recorded for ${cycle.studentName}. Payout will unlock once session time is verified.`);
  };

  return (
    <div>
      <PageHeader
        title={`Authoring Desk — ${cycle.studentName}`}
        description={`${cycle.domain} · Week ${cycle.currentWeek} of ${cycle.totalWeeks}`}
      />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ul>
              {cycle.modules.map((m) => (
                <li key={m.week}>
                  <button
                    onClick={() => setSelectedWeek(m.week)}
                    className={cn(
                      "flex w-full items-start gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm transition-colors",
                      m.week === selectedWeek ? "bg-ink text-paper" : "hover:bg-ink/[0.05]"
                    )}
                  >
                    <span className="mt-0.5 shrink-0">
                      <StatusIcon status={m.status} />
                    </span>
                    <span>
                      <span className={cn("block text-[11px]", m.week === selectedWeek ? "text-paper/70" : "text-muted")}>
                        Week {m.week}
                      </span>
                      <span className="font-medium">{m.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Authoring form */}
          <Card>
            <CardHeader>
              <CardTitle>Module Authoring — Week {activeModule.week}</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={authoring.handleSubmit(onPublish)} className="space-y-4" noValidate>
                <div>
                  <Label htmlFor="title">Milestone title</Label>
                  <Input id="title" {...authoring.register("title")} />
                  {authoring.formState.errors.title && (
                    <p className="mt-1 text-xs text-danger">{authoring.formState.errors.title.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="objectives">Syllabus objectives (one per line)</Label>
                  <Textarea id="objectives" rows={4} {...authoring.register("objectives")} />
                  {authoring.formState.errors.objectives && (
                    <p className="mt-1 text-xs text-danger">{authoring.formState.errors.objectives.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="briefing-file">Briefing PDF (uploads to Cloudflare R2)</Label>
                  <label
                    htmlFor="briefing-file"
                    className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-line px-4 py-3 text-sm text-muted hover:border-ink"
                  >
                    <UploadCloud className="h-4 w-4" /> Choose a PDF or drag it here
                  </label>
                  <input id="briefing-file" type="file" accept="application/pdf" className="sr-only" {...authoring.register("file")} />
                </div>
                <Button type="submit" disabled={authoring.formState.isSubmitting}>
                  {authoring.formState.isSubmitting ? "Publishing…" : "Save & Publish Milestone"}
                </Button>
                {publishedNote && (
                  <p className="flex items-center gap-1.5 text-sm text-success">
                    <FileCheck2 className="h-3.5 w-3.5" /> {publishedNote}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Grading panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" /> Assignment Grading
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {!activeModule.assignment ? (
                <p className="text-sm text-muted">No assignment is configured for this week.</p>
              ) : !activeModule.assignment.submitted ? (
                <p className="text-sm text-muted">
                  {cycle.studentName} has not submitted this week&apos;s assignment yet. Grading unlocks on submission.
                </p>
              ) : (
                <form onSubmit={grading.handleSubmit(onGrade)} className="space-y-4" noValidate>
                  <div className="flex items-center gap-2 rounded-sm border border-line bg-paper px-3 py-2 text-sm">
                    <FileCheck2 className="h-4 w-4 text-success" />
                    {activeModule.assignment.submittedFileName ?? "submission.pdf"} — verified received
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                    <div>
                      <Label htmlFor="grade">Score (0–100)</Label>
                      <Input id="grade" type="number" min={0} max={100} {...grading.register("grade")} />
                      {grading.formState.errors.grade && (
                        <p className="mt-1 text-xs text-danger">{grading.formState.errors.grade.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="feedback">Written feedback</Label>
                      <Textarea id="feedback" rows={3} {...grading.register("feedback")} />
                      {grading.formState.errors.feedback && (
                        <p className="mt-1 text-xs text-danger">{grading.formState.errors.feedback.message}</p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" disabled={grading.formState.isSubmitting}>
                    {grading.formState.isSubmitting ? "Saving…" : "Submit Grade"}
                  </Button>
                  {gradedNote && <p className="text-sm text-success">{gradedNote}</p>}
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
