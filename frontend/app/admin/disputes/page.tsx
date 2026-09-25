"use client";

import * as React from "react";
import { AlertTriangle, History, RefreshCcw, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DISPUTE_ALERTS, MENTORSHIP_CYCLES, MENTOR_DIRECTORY } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { DisputeAlert } from "@/lib/types";

export default function DisputesPage() {
  const [alerts, setAlerts] = React.useState<DisputeAlert[]>(DISPUTE_ALERTS);
  const [repairTarget, setRepairTarget] = React.useState<DisputeAlert | null>(null);
  const [newMentor, setNewMentor] = React.useState<string>("");
  const [resolvedNote, setResolvedNote] = React.useState<string | null>(null);

  const eligibleMentors = MENTOR_DIRECTORY.filter((m) => m.activeMentees < m.capacity);

  const confirmRepair = () => {
    if (!repairTarget || !newMentor) return;
    const mentorName = MENTOR_DIRECTORY.find((m) => m.id === newMentor)?.name;
    setAlerts((prev) => prev.map((a) => (a.id === repairTarget.id ? { ...a, status: "resolved" } : a)));
    setResolvedNote(
      `${repairTarget.studentName} transferred to ${mentorName}. Completed module history through week ${repairTarget.currentWeek - 1} was preserved.`
    );
    setRepairTarget(null);
    setNewMentor("");
  };

  const open = alerts.filter((a) => a.status === "open");
  const resolved = alerts.filter((a) => a.status === "resolved");

  return (
    <div>
      <PageHeader title="Inactivity Disputes" description="Cycles with zero logged meetings in the trailing 10 days." />

      {resolvedNote && (
        <div className="mb-6 flex items-center gap-2 rounded-md border border-success/30 bg-success/[0.06] px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> {resolvedNote}
        </div>
      )}

      <div className="space-y-3">
        {open.map((a) => {
          const cycle = MENTORSHIP_CYCLES.find((c) => c.id === a.cycleId)!;
          return (
            <Card key={a.id} className="border-danger/30">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <AlertTriangle className="h-5 w-5 shrink-0 text-danger" />
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.studentName}</p>
                    <span className="text-xs text-muted">paired with {a.mentorName}</span>
                    <Badge tone="danger">{a.meetingsLast10Days} meetings / 10 days</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    Currently at week {a.currentWeek} of 12 · Flagged {formatDate(a.flaggedOn)} · {cycle.modules.filter((m) => m.status === "completed").length} completed modules
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setRepairTarget(a)}>
                  <RefreshCcw className="h-3.5 w-3.5" /> Re-pair Student
                </Button>
              </CardContent>
            </Card>
          );
        })}
        {open.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
            <CheckCircle2 className="h-5 w-5" /> No open inactivity disputes.
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-medium">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-3 p-4 text-sm">
                  <History className="h-4 w-4 text-muted" />
                  <span className="font-medium">{a.studentName}</span>
                  <span className="text-muted">— re-paired and module history preserved</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!repairTarget} onOpenChange={(v) => !v && setRepairTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-pair {repairTarget?.studentName}</DialogTitle>
            <DialogDescription>
              Transfers the student to a new mentor with open capacity. Completed module history and grades through
              week {repairTarget ? repairTarget.currentWeek - 1 : ""} are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newMentor} onValueChange={setNewMentor}>
              <SelectTrigger>
                <SelectValue placeholder="Select a mentor with open capacity" />
              </SelectTrigger>
              <SelectContent>
                {eligibleMentors.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} — {m.domains[0]} ({m.activeMentees}/{m.capacity})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" disabled={!newMentor} onClick={confirmRepair}>
              Confirm Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
