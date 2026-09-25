"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Circle, Lock, FileDown, UploadCloud, Video, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MENTORSHIP_CYCLES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { MilestoneModule } from "@/lib/types";

const uploadSchema = z.object({
  file: z
    .custom<FileList>()
    .refine((f) => f && f.length > 0, "Attach a PDF file.")
    .refine((f) => f?.[0]?.type === "application/pdf", "Only PDF files are accepted."),
});
type UploadValues = z.infer<typeof uploadSchema>;

function StatusIcon({ status }: { status: MilestoneModule["status"] }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "active") return <Circle className="h-4 w-4 fill-accent text-accent" />;
  return <Lock className="h-3.5 w-3.5 text-muted" />;
}

export default function StudentLmsPage() {
  const params = useParams<{ cycleId: string }>();
  const cycle = MENTORSHIP_CYCLES.find((c) => c.id === params.cycleId) ?? MENTORSHIP_CYCLES[0];
  const [selectedWeek, setSelectedWeek] = React.useState(cycle.currentWeek);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);

  const activeModule = cycle.modules.find((m) => m.week === selectedWeek)!;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<UploadValues>({ resolver: zodResolver(uploadSchema) });

  const fileList = watch("file");
  const fileName = fileList?.[0]?.name;

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      setValue("file", e.dataTransfer.files, { shouldValidate: true });
    }
  };

  const onSubmit = async () => {
    await new Promise((r) => setTimeout(r, 600));
    setUploadedName(fileName ?? "assignment.pdf");
  };

  return (
    <div>
      <PageHeader
        title={`${cycle.domain} Cycle`}
        description={`Mentor: ${cycle.mentorName} · Week ${cycle.currentWeek} of ${cycle.totalWeeks}`}
        actions={
          <Button asChild size="sm">
            <Link href={`/student/consultation/${cycle.id}`}>
              <Video className="h-3.5 w-3.5" /> Join Live Video Consultation
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left: milestone sidebar */}
        <Card className="h-fit lg:sticky lg:top-6">
          <CardHeader>
            <CardTitle>12-Week Milestones</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ul>
              {cycle.modules.map((m) => {
                const isLocked = m.status === "locked";
                const isSelected = m.week === selectedWeek;
                return (
                  <li key={m.week}>
                    <button
                      disabled={isLocked}
                      onClick={() => setSelectedWeek(m.week)}
                      className={cn(
                        "flex w-full items-start gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        isSelected ? "bg-ink text-paper" : "hover:bg-ink/[0.05]"
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        <StatusIcon status={m.status} />
                      </span>
                      <span>
                        <span className={cn("block text-[11px]", isSelected ? "text-paper/70" : "text-muted")}>
                          Week {m.week}
                        </span>
                        <span className="font-medium">{m.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Right: active module workspace */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone={activeModule.status === "completed" ? "success" : activeModule.status === "active" ? "accent" : "neutral"}>
                    Week {activeModule.week} · {activeModule.status}
                  </Badge>
                </div>
                <CardTitle>{activeModule.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Objectives</p>
              <ul className="space-y-1.5 text-sm">
                {activeModule.objectives.map((o) => (
                  <li key={o} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink" />
                    {o}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Syllabus Resources</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-line p-0">
              {activeModule.resources.map((r) => (
                <div key={r.r2Key} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-xs text-muted">{r.sizeKb} KB · Cloudflare R2</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileDown className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {activeModule.assignment && (
            <Card>
              <CardHeader>
                <CardTitle>Assignment Submission</CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <p className="mb-4 text-sm text-muted">{activeModule.assignment.prompt}</p>

                {activeModule.assignment.submitted || uploadedName ? (
                  <div className="flex items-center gap-3 rounded-sm border border-success/30 bg-success/[0.06] px-4 py-3 text-sm">
                    <FileCheck2 className="h-4 w-4 shrink-0 text-success" />
                    <div>
                      <p className="font-medium text-success">
                        {uploadedName ?? activeModule.assignment.submittedFileName} submitted
                      </p>
                      {activeModule.assignment.grade && (
                        <p className="mt-0.5 text-xs text-muted">
                          Graded {activeModule.assignment.grade}/100 — {activeModule.assignment.feedback}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} noValidate>
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={onDrop}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors",
                        dragOver ? "border-ink bg-ink/[0.04]" : "border-line"
                      )}
                    >
                      <UploadCloud className="h-6 w-6 text-muted" />
                      <p className="text-sm">
                        Drag and drop your PDF here, or{" "}
                        <label htmlFor="assignment-file" className="cursor-pointer font-medium underline underline-offset-2">
                          browse files
                        </label>
                      </p>
                      <input
                        id="assignment-file"
                        type="file"
                        accept="application/pdf"
                        className="sr-only"
                        {...register("file")}
                      />
                      {fileName && <p className="text-xs text-muted">Selected: {fileName}</p>}
                    </div>
                    {errors.file && <p className="mt-2 text-xs text-danger">{errors.file.message as string}</p>}
                    <Button type="submit" className="mt-4" disabled={isSubmitting}>
                      {isSubmitting ? "Uploading…" : "Submit Assignment"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
