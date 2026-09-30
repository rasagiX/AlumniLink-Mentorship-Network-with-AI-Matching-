"use client";

import * as React from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Mentor = {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  domain: string | null;
  capacity: number;
};

export default function MentorDirectoryPage() {
  const [mentors, setMentors] = React.useState<Mentor[]>([]);
  const [domain, setDomain] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/mentors/directory")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load mentors.");
        setMentors(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load mentors."))
      .finally(() => setLoading(false));
  }, []);

  const domains = Array.from(new Set(mentors.map((m) => m.domain).filter(Boolean))) as string[];
  const visible = domain ? mentors.filter((m) => m.domain === domain) : mentors;

  return (
    <div>
      <PageHeader title="Mentor Directory" description="Approved mentors registered in the AlumniLink platform." />

      {error && <p className="mb-6 rounded-md border border-danger/30 bg-danger/[0.06] p-4 text-sm text-danger">{error}</p>}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs uppercase tracking-wide text-muted">Domains</span>
        <button onClick={() => setDomain(null)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !domain ? "border-ink bg-ink text-paper" : "border-line text-muted")}>
          All
        </button>
        {domains.map((item) => (
          <button key={item} onClick={() => setDomain(item === domain ? null : item)} className={cn("rounded-full border px-3 py-1 text-xs font-medium", item === domain ? "border-ink bg-ink text-paper" : "border-line text-muted")}>
            {item}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">{visible.length} mentors</span>
      </div>

      {loading ? <p className="text-sm text-muted">Loading approved mentors…</p> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((mentor) => (
            <Card key={mentor.id}>
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3"><Avatar name={mentor.name} /><div><p className="font-medium">{mentor.name}</p><p className="text-xs text-muted">{mentor.title ?? "Alumni mentor"}{mentor.company ? ` · ${mentor.company}` : ""}</p></div></div>
                {mentor.domain && <Badge tone="neutral" className="w-fit">{mentor.domain}</Badge>}
                <div className="flex items-center gap-2 border-t border-line pt-3 text-xs text-muted"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Verified mentor · Capacity: {mentor.capacity}</div>
              </CardContent>
            </Card>
          ))}
          {!error && visible.length === 0 && <div className="col-span-full flex flex-col items-center gap-2 rounded-md border border-dashed border-line py-16 text-sm text-muted"><ShieldAlert className="h-5 w-5" /> No registered mentors are available yet.</div>}
        </div>
      )}
    </div>
  );
}
