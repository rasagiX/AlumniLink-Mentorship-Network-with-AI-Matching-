"use client";

import * as React from "react";
import { Check, X, Inbox } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MENTOR_REQUESTS } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { MentorRequest } from "@/lib/types";

export default function MentorRequestsPage() {
  const [requests, setRequests] = React.useState<MentorRequest[]>(MENTOR_REQUESTS);

  const act = (id: string, status: "accepted" | "declined") => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <PageHeader title="Inbound Mentee Requests" description="Each request lists the student's stated career goal and AI match fit." />

      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
          <Inbox className="h-5 w-5" /> No pending requests. New matches will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <Avatar name={r.studentName} />
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.studentName}</p>
                    <Badge tone="accent">{r.matchScore}% Fit</Badge>
                    <Badge tone="neutral">{r.domain}</Badge>
                    <span className="text-xs text-muted">Requested {formatDate(r.requestedOn)}</span>
                  </div>
                  <p className="text-sm text-muted">{r.careerGoal}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" variant="danger" onClick={() => act(r.id, "declined")}>
                    <X className="h-3.5 w-3.5" /> Decline
                  </Button>
                  <Button size="sm" onClick={() => act(r.id, "accepted")}>
                    <Check className="h-3.5 w-3.5" /> Accept Slot
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-medium">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={r.studentName} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.studentName}</p>
                    <p className="text-xs text-muted">{r.domain}</p>
                  </div>
                  <Badge tone={r.status === "accepted" ? "success" : "danger"} className="capitalize">
                    {r.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
