"use client";

import * as React from "react";
import { FileText, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ACCREDITATION_QUEUE } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { AccreditationCandidate } from "@/lib/types";

export default function AccreditationPage() {
  const [queue, setQueue] = React.useState<AccreditationCandidate[]>(ACCREDITATION_QUEUE);

  const act = (id: string, status: "approved" | "rejected") =>
    setQueue((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));

  const pending = queue.filter((c) => c.status === "pending");
  const resolved = queue.filter((c) => c.status !== "pending");

  return (
    <div>
      <PageHeader
        title="Alumni Accreditation Queue"
        description="Verify degree and employment credentials before activating mentor capacity."
      />

      <div className="space-y-3">
        {pending.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <Avatar name={c.name} className="h-11 w-11" />
              <div className="flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.name}</p>
                  <span className="text-xs text-muted">{c.email}</span>
                  <Badge tone="neutral">Class of {c.gradYear}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {c.claimedTitle} at {c.claimedCompany} · Submitted {formatDate(c.submittedOn)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1 text-xs text-muted">
                    <FileText className="h-3 w-3" /> {c.degreeDoc}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-sm border border-line px-2.5 py-1 text-xs text-muted">
                    <FileText className="h-3 w-3" /> {c.employmentDoc}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="danger" onClick={() => act(c.id, "rejected")}>
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button size="sm" onClick={() => act(c.id, "approved")}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Approve & Activate Capacity
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pending.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-center text-sm text-muted">
            <CheckCircle2 className="h-5 w-5" /> No pending accreditation reviews.
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-display text-lg font-medium">Resolved</h2>
          <div className="space-y-2">
            {resolved.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={c.name} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.claimedTitle} at {c.claimedCompany}</p>
                  </div>
                  <Badge tone={c.status === "approved" ? "success" : "danger"} className="capitalize">
                    {c.status}
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
