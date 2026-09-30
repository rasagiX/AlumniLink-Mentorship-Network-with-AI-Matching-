"use client";

import * as React from "react";
import { Star, Video, ChevronDown, ChevronUp } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ADMIN_PAIRS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function AdminPairsPage() {
  const [expanded, setExpanded] = React.useState<string | null>(null);

  return (
    <div>
      <PageHeader
        title="Student–Mentor Pairings"
        description="Bidirectional evaluation metrics and WebRTC attendance logs across every active cycle."
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Mentor</th>
                <th className="px-4 py-3 font-medium">Mentor Load</th>
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Avg. Grade</th>
                <th className="px-4 py-3 font-medium">Mentor Rating</th>
                <th className="px-4 py-3 font-medium">Last Session</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {ADMIN_PAIRS.map((row) => {
                const isOpen = expanded === row.cycleId;
                return (
                  <React.Fragment key={row.cycleId}>
                    <tr
                      className="cursor-pointer border-b border-line hover:bg-ink/[0.02]"
                      onClick={() => setExpanded(isOpen ? null : row.cycleId)}
                    >
                      <td className="px-4 py-3 font-medium">{row.studentName}</td>
                      <td className="px-4 py-3">{row.mentorName}</td>
                      <td className="px-4 py-3">
                        <Badge tone={row.mentorCapacityLoad.startsWith("2/2") ? "warning" : "neutral"}>
                          {row.mentorCapacityLoad}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 number-tabular">{row.currentWeek} / 12</td>
                      <td className="px-4 py-3 number-tabular">
                        {row.avgAssignmentGrade !== null ? `${row.avgAssignmentGrade}/100` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {row.studentRatingOfMentor !== null ? (
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-current text-warning" /> {row.studentRatingOfMentor.toFixed(1)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted">{row.lastSessionOn ? formatDate(row.lastSessionOn) : "No sessions"}</td>
                      <td className="px-4 py-3">
                        {isOpen ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line bg-paper">
                        <td colSpan={8} className="px-4 py-4">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                            <Video className="h-3.5 w-3.5" /> WebRTC Attendance Log
                          </p>
                          {row.attendanceLog.length === 0 ? (
                            <p className="text-sm text-muted">No consultation sessions logged.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {row.attendanceLog.map((a) => (
                                <span
                                  key={a.date}
                                  className={cn(
                                    "rounded-sm border px-2.5 py-1 text-xs",
                                    a.durationMinutes < 30 ? "border-warning/30 bg-warning/[0.08] text-warning" : "border-line"
                                  )}
                                >
                                  {formatDate(a.date)} · {a.durationMinutes} min
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
